import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const updateCadenceSchema = z.object({
  email: z.string().email(),
  zoneId: z.string().uuid(),
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
      .select("id, email, subscription_tier")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get zone to verify ownership
    const { data: zone, error: zoneError } = await supabase
      .from("dns_zones")
      .select("id, user_id, zone_name")
      .eq("id", zoneId)
      .eq("user_id", user.id)
      .single();

    if (zoneError || !zone) {
      return NextResponse.json(
        { success: false, message: "Zone not found or access denied" },
        { status: 404 }
      );
    }

    // Validate cadence based on tier
    const isPro = user.subscription_tier === "pro";
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

    // Update zone cadence and recalculate next_check_at
    // If zone was already checked, schedule next check at NOW() + new cadence
    // If zone hasn't been checked yet, keep existing next_check_at but update cadence
    const now = new Date();
    const nextCheckAt = new Date(now.getTime() + checkCadenceSeconds * 1000).toISOString();
    
    const { error: updateError } = await supabase
      .from("dns_zones")
      .update({ 
        check_cadence_seconds: checkCadenceSeconds,
        next_check_at: nextCheckAt // Recalculate immediately when cadence changes
      })
      .eq("id", zoneId);

    if (updateError) {
      console.error("Error updating zone cadence:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to update zone cadence" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Zone cadence updated successfully",
      checkCadenceSeconds,
    });

  } catch (error) {
    console.error("Update cadence error:", error);

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

