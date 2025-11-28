import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { isSubscriptionActive } from "@/lib/subscription-utils";
import { z } from "zod";
import { logError } from "@/lib/logger";

const updateCadenceSchema = z.object({
  email: z.string().email(),
  zoneId: z.string().uuid().optional(),
  checkCadenceSeconds: z.number().int().min(1).max(60), // 1-60 seconds
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, zoneId, checkCadenceSeconds } = updateCadenceSchema.parse(body);

    const supabase = createServiceClient();

    // Get user to check subscription tier
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, subscription_tier, subscription_status, subscription_current_period_end")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Demo account is read-only
    if (email === "demo@axonshield.com") {
      return NextResponse.json({ success: false, message: "Demo account is read-only." }, { status: 403 });
    }

    // Verify ownership and get target zones (single or all) — we update all zones to reflect account-level cadence
    let q = supabase.from("dns_zones").select("id").eq("user_id", user.id);
    if (zoneId) q = q.eq("id", zoneId);
    const { data: targetZones, error: zoneError } = await q;
    if (zoneError || !targetZones || targetZones.length === 0) {
      return NextResponse.json({ success: false, message: "Zone(s) not found or access denied" }, { status: 404 });
    }

    // Check if subscription is actually active
    const isActive = isSubscriptionActive(
      user.subscription_status,
      user.subscription_current_period_end
    );

    // Validate cadence based on tier
    const isPro = user.subscription_tier === "pro" && isActive;
    const allowedCadences = isPro 
      ? [1, 15, 30, 60] 
      : [60];

    if (!allowedCadences.includes(checkCadenceSeconds)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `This cadence is only available for ${isPro ? "Pro" : "Free"} tier. Allowed values: ${allowedCadences.join(", ")} seconds.` 
        },
        { status: 403 }
      );
    }

    // Update account-level cadence
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({ monitor_cadence_seconds: checkCadenceSeconds })
      .eq("id", user.id);
    if (userUpdateError) {
      logError("updateCadence.userUpdate", userUpdateError);
      return NextResponse.json({ success: false, message: "Failed to update account cadence" }, { status: 500 });
    }

    // Update zone cadence and recalculate next_check_at using account cadence
    // If zone was already checked, schedule next check at NOW() + new cadence
    // If zone hasn't been checked yet, keep existing next_check_at but update cadence
    const now = new Date();
    const nextCheckAt = new Date(now.getTime() + checkCadenceSeconds * 1000).toISOString();
    
    const ids = targetZones.map((z: any) => z.id);
    const { error: updateError } = await supabase
      .from("dns_zones")
      .update({ check_cadence_seconds: checkCadenceSeconds, next_check_at: nextCheckAt })
      .in("id", ids);

    if (updateError) {
      logError("updateCadence.zoneUpdate", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to update zone cadence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Cadence updated", checkCadenceSeconds, zoneCount: ids.length });

  } catch (error) {
    logError("updateCadence.handler", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid input data", errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}