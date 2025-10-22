import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = verifyEmailSchema.parse(body);

    const supabase = createServiceClient();

    // Get the user with token expiration check (24 hours)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .eq("confirmation_token", token)
      .eq("email_confirmed", false)
      .gte("confirmation_sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 hours ago
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "Invalid verification token or email already verified" },
        { status: 400 }
      );
    }

    // Mark email as confirmed
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email_confirmed: true,
        confirmation_token: null,
        confirmation_sent_at: null,
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