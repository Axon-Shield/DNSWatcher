import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const verificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = verificationSchema.parse(body);

    const supabase = createServiceClient();

    // Find user by confirmation token
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("confirmation_token", token)
      .eq("email_confirmed", false)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid or expired verification token." 
        },
        { status: 400 }
      );
    }

    // Check if token is not too old (24 hours)
    const tokenAge = Date.now() - new Date(user.confirmation_sent_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (tokenAge > maxAge) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Verification token has expired. Please request a new one." 
        },
        { status: 400 }
      );
    }

    // Update user to confirmed
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email_confirmed: true,
        confirmation_token: null, // Clear the token
        confirmation_sent_at: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user verification:", updateError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to verify email address." 
        },
        { status: 500 }
      );
    }

    // Now activate all pending DNS zones for this user
    const { error: zoneError } = await supabase
      .from("dns_zones")
      .update({ 
        is_active: true,
        activated_at: new Date().toISOString()
      })
      .eq("user_id", user.id)
      .eq("is_active", false);

    if (zoneError) {
      console.error("Error activating DNS zones:", zoneError);
      // Don't fail the verification if zone activation fails
    }

    return NextResponse.json({
      success: true,
      message: "Email address verified successfully! Your DNS zones are now being monitored.",
      email: user.email,
    });

  } catch (error) {
    console.error("Email verification error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid verification data." 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred during verification." 
      },
      { status: 500 }
    );
  }
}
