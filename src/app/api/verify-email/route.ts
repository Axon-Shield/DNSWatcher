import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const verifyEmailSchema = z.object({
  token: z.string().min(1),
  type: z.enum(['email']).optional(),
  email: z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, type, email } = verifyEmailSchema.parse(body);

    const supabase = createServiceClient();

    // If email is provided, this is a custom token verification (from Resend email)
    if (email) {
      // Get the user from our users table
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("email_confirmed", false)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { message: "User not found or already verified" },
          { status: 404 }
        );
      }

      // Mark email as confirmed (simple verification for custom token)
      const { error: updateError } = await supabase
        .from("users")
        .update({
          email_confirmed: true,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating user email status:", updateError);
        return NextResponse.json(
          { message: "Failed to verify email" },
          { status: 500 }
        );
      }

      // Activate all inactive zones for this user (only if password is set)
      if (user.password_set) {
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
          console.error("Error activating zones:", activateZonesError);
          return NextResponse.json(
            { message: "Failed to activate DNS zones" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        message: "Email verified successfully",
        passwordSetupRequired: !user.password_set,
        userId: user.id,
        email: user.email,
      });
    }

    // Otherwise, use Supabase Auth verification
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type || 'email',
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { message: "Invalid verification token" },
        { status: 400 }
      );
    }

    // Get the user from our users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", authData.user.email)
      .eq("email_confirmed", false)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "User not found or already verified" },
        { status: 404 }
      );
    }

    // Mark email as confirmed
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email_confirmed: true,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user email status:", updateError);
      return NextResponse.json(
        { message: "Failed to verify email" },
        { status: 500 }
      );
    }

    // Activate all inactive zones for this user (only if password is set)
    if (user.password_set) {
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
        console.error("Error activating zones:", activateZonesError);
        return NextResponse.json(
          { message: "Failed to activate DNS zones" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: "Email verified successfully",
      passwordSetupRequired: !user.password_set,
      userId: user.id,
      email: user.email,
    });

  } catch (error) {
    console.error("Email verification error:", error);
    
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