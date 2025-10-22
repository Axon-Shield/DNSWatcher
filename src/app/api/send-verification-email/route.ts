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

    // Generate a confirmation token
    const confirmationToken = crypto.randomUUID();
    const confirmationSentAt = new Date().toISOString();

    // Update user with confirmation token
    const { error: updateError } = await supabase
      .from("users")
      .update({
        confirmation_token: confirmationToken,
        confirmation_sent_at: confirmationSentAt,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating confirmation token:", updateError);
      return NextResponse.json(
        { message: "Failed to generate verification token" },
        { status: 500 }
      );
    }

    // Send verification email using Supabase Auth
    const { error: emailError } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/verify-email?token=${confirmationToken}`,
      }
    });

    if (emailError) {
      console.error("Error sending verification email:", emailError);
      return NextResponse.json(
        { message: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Verification email sent successfully",
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
