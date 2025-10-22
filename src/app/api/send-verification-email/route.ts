import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "dnswatcher@axonshield.com";

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

    // Send verification email using Resend
    const verificationLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/verify-email?token=${confirmationToken}&email=${encodeURIComponent(email)}`;
    
    const { data: resendData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify Your DNSWatcher Email Address",
      html: `
        <p>Hello,</p>
        <p>Thank you for registering with DNSWatcher. Please click the link below to verify your email address:</p>
        <p><a href="${verificationLink}">Verify Email Address</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not register for DNSWatcher, please ignore this email.</p>
        <p>Best regards,</p>
        <p>The DNSWatcher Team</p>
      `,
    });

    if (emailError) {
      console.error("Error sending verification email via Resend:", emailError);
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
