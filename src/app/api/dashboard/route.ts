import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service";
import { isSubscriptionActive } from "@/lib/subscription-utils";

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const requestedZoneId = searchParams.get('zoneId');

    const { data: sessionData, error: sessionError } = await supabaseServer.auth.getUser();
    if (sessionError || !sessionData.user?.email) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const email = sessionData.user.email;

    // Get user data from our users table including subscription fields
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, subscription_tier, subscription_status, subscription_current_period_end, max_zones, notification_preferences")
      .eq("email", email)
      .eq("email_confirmed", true)
      .eq("password_set", true);

    if (userError || !users || users.length === 0) {
      return NextResponse.json(
        { message: "User account not found or not properly set up." },
        { status: 404 }
      );
    }

    const user = users[0];

    // Check if subscription is actually active
    const isActive = isSubscriptionActive(
      user.subscription_status,
      user.subscription_current_period_end
    );

    // If subscription expired, update tier to free
    let effectiveTier = user.subscription_tier;
    let effectiveMaxZones = user.max_zones;

    if (user.subscription_tier === 'pro' && !isActive) {
      effectiveTier = 'free';
      effectiveMaxZones = 2;
      
      // Update database if needed (async, don't wait)
      supabase
        .from("users")
        .update({
          subscription_tier: 'free',
          subscription_status: 'free',
          max_zones: 2
        })
        .eq("id", user.id)
        .then(() => {
          console.log(`Updated expired subscription for user ${user.id}`);
        });
    } else if (isActive) {
      effectiveTier = 'pro';
      effectiveMaxZones = null; // Unlimited
    }

    const { data: allZones, error: allZonesError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (allZonesError) {
      console.error("Error fetching all zones:", allZonesError);
    }

    // Allow dashboard to render without zones (empty state)
    if (!allZones || allZones.length === 0) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: effectiveTier,
          max_zones: effectiveMaxZones,
          notification_preferences: user.notification_preferences || null,
        },
        currentZone: null,
        zoneHistory: [],
        allZones: [],
      });
    }

    const currentZone = (requestedZoneId && allZones.find(z => z.id === requestedZoneId)) || allZones[0];

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
        subscription_tier: effectiveTier,
        max_zones: effectiveMaxZones,
        notification_preferences: user.notification_preferences || null,
      },
      currentZone: {
        id: currentZone.id,
        zone_name: currentZone.zone_name,
        created_at: currentZone.created_at,
        last_checked: currentZone.last_checked,
        check_cadence_seconds: currentZone.check_cadence_seconds || 60,
      },
      zoneHistory: zoneHistory || [],
      allZones: allZones || [],
    });
  } catch (e) {
    console.error("Dashboard API error:", e);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}


