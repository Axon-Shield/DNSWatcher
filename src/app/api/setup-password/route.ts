import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { createClient as createServerSupabase } from "@/lib/supabase-server";
import { z } from "zod";
import { logError, logWarn } from "@/lib/logger";

const passwordSetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = passwordSetupSchema.parse(body);

    const supabase = createServiceClient();
    const supabaseServer = await createServerSupabase();

    // Get the user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "User not found", error: userError?.message },
        { status: 404 }
      );
    }

    if (user.password_set) {
      return NextResponse.json(
        { message: "Password already set for this user" },
        { status: 400 }
      );
    }

    // Create Supabase Auth user via Admin API without sending confirmation email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // prevent Supabase from sending a magic link
    });

    if (authError) {
      logError("setupPassword.createAuthUser", authError);
      return NextResponse.json(
        { message: "Failed to create account" },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Update user with password set flag (but keep app-level email_confirmed as false until OTP verified)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_set: true,
        password_set_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    // Create an authenticated session cookie so the user is logged in immediately
    try {
      const { error: signInError } = await supabaseServer.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        logWarn("setupPassword.signInAfterSetup", signInError);
      }
    } catch (e) {
      logWarn("setupPassword.signInUnexpected", e);
    }


    if (updateError) {
      logError("setupPassword.updateUser", updateError);
      return NextResponse.json(
        { message: "Failed to set password" },
        { status: 500 }
      );
    }

    // Auto-send OTP verification email after password setup
    try {
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP with 5-minute expiration
      const { error: otpError } = await supabase
        .from("users")
        .update({
          verification_otp: otp,
          otp_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .eq("id", user.id);

      if (otpError) {
        logError("setupPassword.storeOtp", otpError);
      } else {
        // Send OTP via Edge Function
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: email,
            subject: 'DNSWatcher Email Verification Code',
            text: `DNSWatcher Email Verification Code\n\nYour verification code is: ${otp}\n\nEnter this code in the verification page to complete your email verification.\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this verification, please ignore this email.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Email Verification Code</h2>
                <p>Your verification code is:</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0;">
                  ${otp}
                </div>
                <p>Enter this code in the verification page to complete your email verification.</p>
                <p>This code will expire in 5 minutes.</p>
                <p>If you didn't request this verification, please ignore this email.</p>
              </div>
            `,
          },
        });

        if (emailError) {
          logError('setupPassword.sendOtpEmail', emailError);
        }
      }
    } catch (e) {
      logError('setupPassword.autoSendOtp', e);
    }

    return NextResponse.json({
      message: "Password set successfully. Verification code has been sent to your email.",
      userId: user.id,
      emailVerificationRequired: true,
    });

  } catch (error) {
    logError("setupPassword.handler", error);
    
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
