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

    // Check if user exists and has a password set
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("email_confirmed", true)
      .eq("password_set", true)
      .single();

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Use Supabase Auth to send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
    });

    if (resetError) {
      console.error("Password reset error:", resetError);
      return NextResponse.json(
        { message: "Failed to send password reset email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Password reset email sent successfully",
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
