import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

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
      console.error("Error storing OTP:", otpError);
      return NextResponse.json(
        { message: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Use Supabase Auth to send OTP email
    const { error: emailError } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/verify-email`
      }
    });

    if (emailError) {
      console.error("Error sending verification email via Supabase:", emailError);
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
    console.error("Send verification email error:", error);
    
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
