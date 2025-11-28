import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { createClient as createServerSupabase } from "@/lib/supabase-server";
import { z } from "zod";
import { logError } from "@/lib/logger";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = verifyOtpSchema.parse(body);

    const supabase = createServiceClient();
    const supabaseServer = await createServerSupabase();

    // Get the user and verify OTP
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("password_set", true)
      .eq("email_confirmed", false)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "User not found or already verified" },
        { status: 404 }
      );
    }

    // Check if OTP exists and is not expired
    if (!user.verification_otp || !user.otp_expires_at) {
      return NextResponse.json(
        { message: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      return NextResponse.json(
        { message: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP
    if (user.verification_otp !== otp) {
      return NextResponse.json(
        { message: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // Mark email as confirmed and clear OTP
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email_confirmed: true,
        verification_otp: null,
        otp_expires_at: null
      })
      .eq("id", user.id);

    if (updateError) {
      logError("verifyOtp.updateUser", updateError);
      return NextResponse.json(
        { message: "Failed to verify email" },
        { status: 500 }
      );
    }

    // Activate all inactive zones for this user
    const { error: activateZonesError } = await supabase
      .from("dns_zones")
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        deactivated_at: null
      })
      .eq("user_id", user.id)
      .eq("is_active", false);

    if (activateZonesError) {
      logError("verifyOtp.activateZones", activateZonesError);
      return NextResponse.json(
        { message: "Failed to activate DNS zones" },
        { status: 500 }
      );
    }

    // Ensure the server session exists (user might already be signed-in post password setup)
    // If not signed in, sign them in with a server session using a short-lived OTP of our own
    try {
      // Try to get an existing session
      const { data: sessionData } = await supabaseServer.auth.getSession();
      if (!sessionData.session) {
        // If there's no session, perform a token exchange via email+password fallback
        // We can't read the user's password, so return a flag for the client to call auto-login API
        return NextResponse.json({
          message: "Email verified successfully",
          userId: user.id,
          email: user.email,
          requiresLogin: true,
        });
      }
    } catch {
      // If session check fails, proceed with requiresLogin flow
      return NextResponse.json({
        message: "Email verified successfully",
        userId: user.id,
        email: user.email,
        requiresLogin: true,
      });
    }

    return NextResponse.json({
      message: "Email verified successfully",
      userId: user.id,
      email: user.email,
      requiresLogin: false,
    });

  } catch (error) {
    logError("verifyOtp.handler", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}