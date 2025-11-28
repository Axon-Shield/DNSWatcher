import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";
import { logError } from "@/lib/logger";

const sendVerificationSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendVerificationSchema.parse(body);

    const supabase = createServiceClient();

    // Get the user
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

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database with expiration (5 minutes)
    const { error: otpError } = await supabase
      .from("users")
      .update({
        verification_otp: otp,
        otp_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      })
      .eq("id", user.id);

    if (otpError) {
      logError("sendVerification.storeOtp", otpError);
      return NextResponse.json(
        { message: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Send OTP email via Supabase Edge Function
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
        `
      }
    });

    if (emailError) {
      logError("sendVerification.sendEmail", emailError);
      return NextResponse.json(
        { message: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification email sent successfully",
      email: email,
    });

  } catch (error) {
    logError("sendVerification.handler", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid email address", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
