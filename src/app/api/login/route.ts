import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";
import { logError } from "@/lib/logger";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Please enter your password"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Special-case: demo login using username `demo` and password `demo`
    if (body?.email === "demo" && body?.password === "demo") {
      const DEMO_EMAIL = "demo@axonshield.com";
      const DEMO_PASSWORD = "demo";

      const supabase = createServiceClient();
      const supabaseServer = await createSupabaseServerClient();

      // Ensure demo auth user exists and is confirmed
      try {
        // Attempt to sign in first (fast path)
        await supabaseServer.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
      } catch {
        // If sign-in fails, try to create via admin API
        try {
          // @ts-ignore auth.admin available with service role
          await supabase.auth.admin.createUser({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
            email_confirm: true,
          });
        } catch (e: any) {
          logError("login.demo.authAdminCreateUser", e);
        }
      }

      // Ensure public user exists with demo constraints (avoid onConflict 400s by checking first)
      let demoUserRow = (await supabase
        .from("users")
        .select("id, email")
        .eq("email", DEMO_EMAIL)
        .single()).data as { id: string; email: string } | null;

      if (!demoUserRow) {
        const insertRes = await supabase
          .from("users")
          .insert({
            email: DEMO_EMAIL,
            email_confirmed: true,
            password_set: true,
            subscription_tier: "pro",
            max_zones: 4,
            monitor_cadence_seconds: 30,
            notification_preferences: { email_enabled: false, frequency: "immediate" },
          })
          .select("id, email")
          .single();

        if (insertRes.error) {
          logError("login.demo.insertUser", insertRes.error);
          return NextResponse.json({ success: false, message: "Failed to initialize demo user" }, { status: 500 });
        }
        demoUserRow = insertRes.data as any;
      } else {
        // Update core demo fields to keep constraints intact
        await supabase
          .from("users")
          .update({
            email_confirmed: true,
            password_set: true,
            subscription_tier: "pro",
            max_zones: 4,
            monitor_cadence_seconds: 30,
            notification_preferences: { email_enabled: false, frequency: "immediate" },
          })
          .eq("id", demoUserRow.id);
      }

      const zoneNames = ["axonshield.com", "google.com", "bbc.com", "facebook.com"];

      // Safety: ensure demoUserRow exists after insert/update
      if (!demoUserRow) {
        logError("login.demo.missingUserRow", new Error("demoUserRow is null after insert/update"));
        return NextResponse.json({ success: false, message: "Failed to initialize demo user", code: 'DEMO_USER_ROW_NULL' }, { status: 500 });
      }

      // Fetch existing zones
      const { data: existingZones } = await supabase
        .from("dns_zones")
        .select("zone_name, id")
        .eq("user_id", demoUserRow.id)
        .eq("is_active", true);

      const existing = new Set((existingZones || []).map((z: any) => z.zone_name));
      const now = new Date();
      const nextCheckAt = new Date(now.getTime() + 30 * 1000).toISOString();

      // Insert any missing zones with 30s cadence
      const zonesToInsert = zoneNames
        .filter((name) => !existing.has(name))
        .map((name) => ({
          user_id: demoUserRow.id,
          zone_name: name,
          is_active: true,
          check_cadence_seconds: 30,
          next_check_at: nextCheckAt,
        }));

      if (zonesToInsert.length) {
        const insertZonesRes = await supabase.from("dns_zones").insert(zonesToInsert);
        if (insertZonesRes.error) {
          logError("login.demo.insertZones", insertZonesRes.error);
        }
      }

      // Sign in the demo user to set cookies
      const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (authError || !authData?.user) {
        logError("login.demo.signInWithPassword", authError);
        return NextResponse.json({ success: false, message: "Demo sign-in failed", code: 'DEMO_SIGNIN_FAILED' }, { status: 500 });
      }

      // Load dashboard data similar to normal flow
      const { data: allZones } = await supabase
        .from("dns_zones")
        .select("*")
        .eq("user_id", demoUserRow.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const currentZone = allZones && allZones.length > 0 ? allZones[0] : null;

      // Issue an app-level session expiry cookie for 30 minutes to cap session duration
      const response = NextResponse.json({
        success: true,
        user: {
          id: demoUserRow.id,
          email: DEMO_EMAIL,
          subscription_tier: "pro",
          max_zones: 4,
          notification_preferences: { email_enabled: false, frequency: "immediate" },
        },
        currentZone: currentZone
          ? {
              id: currentZone.id,
              zone_name: currentZone.zone_name,
              created_at: currentZone.created_at,
              last_checked: currentZone.last_checked,
              check_cadence_seconds: 30,
            }
          : null,
        zoneHistory: [],
        allZones: allZones || [],
      });

      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      response.cookies.set("app_session_expires_at", String(expires.getTime()), {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        expires,
        path: "/",
      });

      return response;
    }

    // Normal login flow
    const { email, password } = loginSchema.parse(body);

    const supabase = createServiceClient();
    const supabaseServer = await createSupabaseServerClient();

    // Authenticate user with Supabase Auth and set httpOnly cookies via server client
    const { data: authData, error: authError } = await supabaseServer.auth.signInWithPassword({
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
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, subscription_tier, max_zones, notification_preferences")
      .eq("email", email)
      .eq("email_confirmed", true)
      .eq("password_set", true);

    if (userError || !users || users.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "User account not found or not properly set up." 
        },
        { status: 404 }
      );
    }

    // Use the first user (should only be one)
    const user = users[0];

    // Get all active zones for this user
    const { data: allZones, error: allZonesError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (allZonesError) {
      logError("login.fetchZones", allZonesError);
    }

    // Allow login even when user has no zones yet
    if (!allZones || allZones.length === 0) {
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier,
          max_zones: user.max_zones,
          notification_preferences: user.notification_preferences || null,
        },
        currentZone: null,
        zoneHistory: [],
        allZones: [],
      });

      const expires = new Date(Date.now() + 30 * 60 * 1000);
      response.cookies.set("app_session_expires_at", String(expires.getTime()), {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        expires,
        path: "/",
      });

      return response;
    }

    // Use the first zone as the current zone
    const currentZone = allZones[0];

    // Get zone history (SOA changes only) for the current zone
    const { data: zoneHistory, error: historyError } = await supabase
      .from("zone_checks")
      .select("*")
      .eq("zone_id", currentZone.id)
      .eq("is_change", true)
      .order("checked_at", { ascending: false })
      .limit(50); // Last 50 checks

    if (historyError) {
      logError("login.fetchZoneHistory", historyError);
    }

    // Issue an app-level session expiry cookie for 30 minutes to cap session duration
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
          max_zones: user.max_zones,
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

    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    response.cookies.set("app_session_expires_at", String(expires.getTime()), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      expires,
      path: "/",
    });

    return response;

  } catch (error) {
    logError("login.handler", error);

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