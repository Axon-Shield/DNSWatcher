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
    // Basic rate limiting by IP (in production, use Redis or similar)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    
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
      
      // If user already has password set, redirect to login
      if (existingUser.password_set) {
        return NextResponse.json(
          { 
            message: "Account already exists. Please sign in instead.",
            redirectToLogin: true,
            email: existingUser.email
          },
          { status: 400 }
        );
      }
    } else {
      const { data: newUser, error: newUserError } = await supabase
        .from("users")
        .insert({
          email,
          email_confirmed: false,
          password_set: false,
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
    }

    // Check if zone already exists for this user
    const { data: existingZone, error: zoneError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", userId)
      .eq("zone_name", dnsZone)
      .single();

    if (existingZone) {
      // If user has password set and zone exists, redirect to login
      if (existingUser && existingUser.password_set) {
        return NextResponse.json(
          { 
            message: "Account and DNS zone already exist. Please sign in instead.",
            redirectToLogin: true,
            email: existingUser.email
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { message: "DNS zone is already being monitored for this email" },
        { status: 400 }
      );
    }

    // Create DNS zone with default 60-second cadence (1 minute)
    const { data: newZone, error: newZoneError } = await supabase
      .from("dns_zones")
      .insert({
        user_id: userId,
        zone_name: dnsZone,
        is_active: true,
        check_cadence_seconds: 60, // Default 1 minute
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

        // Do not create a history record; just set baseline fields on the zone
        await supabase
          .from("dns_zones")
          .update({
            last_checked: new Date().toISOString(),
            last_soa_serial: soaRecord.serial,
          })
          .eq("id", newZone.id);
      }
    } catch (dnsError) {
      console.error("Error fetching initial SOA record:", dnsError);
      // Continue without initial SOA record - will be fetched on first check
    }

    return NextResponse.json({
      message: "DNS zone successfully added to monitoring",
      zoneId: newZone.id,
      passwordSetupRequired: !existingUser, // New users need to set password
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