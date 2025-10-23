import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, newPassword } = resetPasswordSchema.parse(body);

    const supabase = createServiceClient();

    // Check if user exists and has password set
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, password_set")
      .eq("email", email)
      .eq("password_set", true)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { message: "Invalid reset token or user not found" },
        { status: 400 }
      );
    }

    // Update password in Supabase Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError || !authUsers?.users) {
      return NextResponse.json(
        { message: "Failed to access user authentication" },
        { status: 500 }
      );
    }

    const authUser = authUsers.users.find(u => u.email === email);
    if (!authUser) {
      return NextResponse.json(
        { message: "User not found in authentication system" },
        { status: 400 }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { message: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Password updated successfully",
    });

  } catch (error) {
    console.error("Reset password error:", error);
    
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
