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
      .eq("password_set", false)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "User not found or password already set" },
        { status: 404 }
      );
    }

    if (user.password_set) {
      return NextResponse.json(
        { message: "Password already set for this user" },
        { status: 400 }
      );
    }

  // Ensure a Supabase Auth user exists and set password
  // Try to fetch auth user by email
  const { data: authUserLookup, error: authLookupError } = await supabase.auth.admin.getUserByEmail(email);
  if (authLookupError) {
    console.error("Auth lookup error:", authLookupError);
  }

  if (!authLookupError && authUserLookup?.user) {
    // Update existing auth user's password
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUserLookup.user.id, {
      password,
    });
    if (updateAuthError) {
      console.error("Auth password update error:", updateAuthError);
      return NextResponse.json({ message: "Failed to set password" }, { status: 500 });
    }
  } else {
    // Create a new auth user with confirmed email
    const { error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createAuthError) {
      console.error("Auth user create error:", createAuthError);
      return NextResponse.json({ message: "Failed to create account" }, { status: 500 });
    }
  }

  // Update user with password set flag
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

    // Note: In a real implementation, you would hash and store the password
    // For now, we're just marking that the password has been set
    // Supabase Auth handles the actual password storage

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
