import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const supabase = createServiceClient();

    // Authenticate user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid email or password." 
        },
        { status: 401 }
      );
    }

    // Get user data from our users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("email_confirmed", true)
      .eq("password_set", true)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "User account not found or not properly set up." 
        },
        { status: 404 }
      );
    }

    // Get all active zones for this user
    const { data: allZones, error: allZonesError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (allZonesError) {
      console.error("Error fetching all zones:", allZonesError);
    }

    if (!allZones || allZones.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "No DNS zones found for this account. Please register a zone first." 
        },
        { status: 404 }
      );
    }

    // Use the first zone as the current zone
    const currentZone = allZones[0];

    // Get zone history (SOA changes) for the current zone
    const { data: zoneHistory, error: historyError } = await supabase
      .from("zone_checks")
      .select("*")
      .eq("zone_id", currentZone.id)
      .eq("is_change", true)
      .order("checked_at", { ascending: false })
      .limit(50); // Last 50 changes

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
