import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const autoLoginSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = autoLoginSchema.parse(body);

    const supabase = createServiceClient();

    // Get the user who just verified their email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("email_confirmed", true)
      .eq("password_set", true)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "User not found or not properly verified" },
        { status: 404 }
      );
    }

    // Get all active zones for this user
    const { data: zones, error: zonesError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (zonesError) {
      console.error("Error fetching zones:", zonesError);
      return NextResponse.json(
        { message: "Failed to fetch user zones" },
        { status: 500 }
      );
    }

    if (!zones || zones.length === 0) {
      return NextResponse.json(
        { message: "No active zones found for user" },
        { status: 404 }
      );
    }

    // Use the first zone as current zone
    const currentZone = zones[0];

    // Get zone history for the current zone (SOA changes only)
    const { data: zoneHistory, error: historyError } = await supabase
      .from("zone_checks")
      .select("*")
      .eq("zone_id", currentZone.id)
      .eq("is_change", true)
      .order("checked_at", { ascending: false })
      .limit(50);

    if (historyError) {
      console.error("Error fetching zone history:", historyError);
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
        id: currentZone.id,
        zone_name: currentZone.zone_name,
        created_at: currentZone.created_at,
        last_checked: currentZone.last_checked,
        check_cadence_seconds: currentZone.check_cadence_seconds || 60,
      },
      allZones: zones.map(zone => ({
        id: zone.id,
        zone_name: zone.zone_name,
        created_at: zone.created_at,
        last_checked: zone.last_checked,
      })),
      zoneHistory: zoneHistory || [],
    });

  } catch (error) {
    console.error("Auto-login after verification error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid email address", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
