import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";
import { logError } from "@/lib/logger";

const removeZoneSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  zoneId: z.string().uuid("Invalid zone ID"),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, zoneId } = removeZoneSchema.parse(body);

    const supabase = createServiceClient();

    // Demo account is read-only — resolve email and block if demo
    const { data: demoCheck } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();
    if (demoCheck?.email === "demo@axonshield.com") {
      return NextResponse.json({ success: false, message: "Demo account cannot remove zones." }, { status: 403 });
    }

    // Verify the zone belongs to this user
    const { data: zone, error: zoneError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("id", zoneId)
      .eq("user_id", userId)
      .single();

    if (zoneError || !zone) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Zone not found or you don't have permission to remove it." 
        },
        { status: 404 }
      );
    }

    // Remove the zone (soft delete by setting is_active to false)
    const { error: deleteError } = await supabase
      .from("dns_zones")
      .update({ 
        is_active: false,
        deactivated_at: new Date().toISOString()
      })
      .eq("id", zoneId);

    if (deleteError) {
      logError("removeZone.delete", deleteError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to remove DNS zone." 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `DNS zone ${zone.zone_name} has been removed from monitoring.`,
      zoneName: zone.zone_name,
    });

  } catch (error) {
    logError("removeZone.handler", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid request data." 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred." 
      },
      { status: 500 }
    );
  }
}
