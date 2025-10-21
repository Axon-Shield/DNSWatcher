import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

interface SOARecordData {
  serial: number;
  primary: string;
  admin: string;
  refresh: number;
  retry: number;
  expire: number;
  minimum: number;
}

const registrationSchema = z.object({
  email: z.string().email(),
  dnsZone: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, dnsZone } = registrationSchema.parse(body);

    const supabase = createServiceClient();

    // Create or get user
    const { data: existingUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Generate confirmation token
      const confirmationToken = crypto.randomUUID();
      
      const { data: newUser, error: newUserError } = await supabase
        .from("users")
        .insert({
          email,
          email_confirmed: false,
          confirmation_token: confirmationToken,
          confirmation_sent_at: new Date().toISOString(),
          notification_preferences: {
            email_enabled: true,
            frequency: "immediate",
          },
        })
        .select()
        .single();

      if (newUserError) {
        console.error("Error creating user:", newUserError);
        return NextResponse.json(
          { message: "Failed to create user" },
          { status: 500 }
        );
      }

      userId = newUser.id;
      
      // TODO: Send confirmation email here
      console.log(`Confirmation email should be sent to ${email} with token: ${confirmationToken}`);
    }

    // Check if zone already exists for this user
    const { data: existingZone, error: zoneError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", userId)
      .eq("zone_name", dnsZone)
      .single();

    if (existingZone) {
      return NextResponse.json(
        { message: "DNS zone is already being monitored for this email" },
        { status: 400 }
      );
    }

    // Create DNS zone
    const { data: newZone, error: newZoneError } = await supabase
      .from("dns_zones")
      .insert({
        user_id: userId,
        zone_name: dnsZone,
        is_active: true,
      })
      .select()
      .single();

    if (newZoneError) {
      console.error("Error creating DNS zone:", newZoneError);
      return NextResponse.json(
        { message: "Failed to create DNS zone" },
        { status: 500 }
      );
    }

    // Get initial SOA record for baseline using Google DNS API
    try {
      const dnsResponse = await fetch(`https://dns.google/resolve?name=${dnsZone}&type=SOA`);
      const dnsData = await dnsResponse.json();

      if (dnsData.Answer && dnsData.Answer.length > 0) {
        const answer = dnsData.Answer[0];
        const parts = answer.data.split(' ');

        const soaRecord = {
          primary: parts[0],
          admin: parts[1],
          serial: parseInt(parts[2]),
          refresh: parseInt(parts[3]),
          retry: parseInt(parts[4]),
          expire: parseInt(parts[5]),
          minimum: parseInt(parts[6])
        };

        await supabase
          .from("zone_checks")
          .insert({
            zone_id: newZone.id,
            soa_serial: soaRecord.serial,
            soa_record: JSON.stringify(soaRecord),
            checked_at: new Date().toISOString(),
            is_change: false,
          });
      }
    } catch (dnsError) {
      console.error("Error fetching initial SOA record:", dnsError);
      // Continue without initial SOA record - will be fetched on first check
    }

    return NextResponse.json({
      message: "DNS zone successfully added to monitoring. Please check your email to confirm your registration.",
      zoneId: newZone.id,
      emailConfirmationRequired: !existingUser,
    });

  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}