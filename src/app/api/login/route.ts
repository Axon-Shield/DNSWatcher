import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  dnsZone: z.string().min(1, "Please enter a DNS zone"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, dnsZone } = loginSchema.parse(body);

    const supabase = createServiceClient();

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "No account found with this email address." 
        },
        { status: 404 }
      );
    }

    // Check if email is verified
    if (!user.email_confirmed) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Please verify your email address before accessing your account.",
          emailConfirmationRequired: true
        },
        { status: 400 }
      );
    }

    // Find the DNS zone for this user
    const { data: zone, error: zoneError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", user.id)
      .eq("zone_name", dnsZone)
      .eq("is_active", true)
      .single();

    if (zoneError || !zone) {
      return NextResponse.json(
        { 
          success: false, 
          message: `No active monitoring found for ${dnsZone}. Please check the zone name or register it first.` 
        },
        { status: 404 }
      );
    }

    // Get zone history (SOA changes)
    const { data: zoneHistory, error: historyError } = await supabase
      .from("zone_checks")
      .select("*")
      .eq("zone_id", zone.id)
      .eq("is_change", true)
      .order("checked_at", { ascending: false })
      .limit(50); // Last 50 changes

    if (historyError) {
      console.error("Error fetching zone history:", historyError);
    }

    // Get all zones for this user
    const { data: allZones, error: allZonesError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (allZonesError) {
      console.error("Error fetching all zones:", allZonesError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
        max_zones: user.max_zones,
      },
      currentZone: {
        id: zone.id,
        zone_name: zone.zone_name,
        created_at: zone.created_at,
        last_checked: zone.last_checked,
      },
      zoneHistory: zoneHistory || [],
      allZones: allZones || [],
    });

  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid login data." 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred during login." 
      },
      { status: 500 }
    );
  }
}
