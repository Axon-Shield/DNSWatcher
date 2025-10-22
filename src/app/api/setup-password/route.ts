import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const passwordSetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = passwordSetupSchema.parse(body);

    const supabase = createServiceClient();

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

    // Create Supabase Auth user with password using signUp (more secure)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (authError) {
      console.error("Error creating Supabase Auth user:", authError);
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

    // Update user with password set flag (but keep email_confirmed as false until verified)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_set: true,
        password_set_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user password status:", updateError);
      return NextResponse.json(
        { message: "Failed to set password" },
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
      console.error("Error activating zones:", activateZonesError);
      return NextResponse.json(
        { message: "Failed to activate DNS zones" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Password set successfully and DNS zones activated",
      userId: user.id,
    });

  } catch (error) {
    console.error("Password setup error:", error);
    
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
