import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { 
          verified: false, 
          message: "Email address is required." 
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check user verification status
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email_confirmed, email")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { 
          verified: false, 
          message: "User not found." 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: user.email_confirmed,
      email: user.email,
      message: user.email_confirmed 
        ? "Email address is verified." 
        : "Email address is not yet verified.",
    });

  } catch (error) {
    console.error("Check verification status error:", error);

    return NextResponse.json(
      { 
        verified: false, 
        message: "An unexpected error occurred." 
      },
      { status: 500 }
    );
  }
}
