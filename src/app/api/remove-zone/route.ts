import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const removeZoneSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  zoneId: z.string().uuid("Invalid zone ID"),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, zoneId } = removeZoneSchema.parse(body);

    const supabase = createServiceClient();

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "User not found." 
        },
        { status: 404 }
      );
    }

    // Verify the zone belongs to this user
    const { data: zone, error: zoneError } = await supabase
      .from("dns_zones")
      .select("*")
      .eq("id", zoneId)
      .eq("user_id", user.id)
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
      console.error("Error removing zone:", deleteError);
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
    console.error("Remove zone error:", error);

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
