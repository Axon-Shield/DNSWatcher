import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const supabase = createServiceClient();

    // Check if user exists in our database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, password_set")
      .eq("email", email)
      .eq("password_set", true)
      .single();

    // Always return success to prevent email enumeration
    // But only send email if user exists and has password set
    if (userError || !user) {
      return NextResponse.json({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Use Supabase Auth to send password reset email
    const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
    });

    if (emailError) {
      console.error("Error sending password reset email via Supabase:", emailError);
      return NextResponse.json(
        { message: "Failed to send password reset email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    
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
