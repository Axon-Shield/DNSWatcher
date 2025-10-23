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

    return await checkVerificationStatus(email);

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { 
          verified: false, 
          message: "Email address is required." 
        },
        { status: 400 }
      );
    }

    return await checkVerificationStatus(email);

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

async function checkVerificationStatus(email: string) {
  const supabase = createServiceClient();

  // Check user verification status in our users table
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("email_confirmed, email, password_set")
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

  // If our table shows verified, return that
  if (user.email_confirmed) {
    return NextResponse.json({
      verified: true,
      email: user.email,
      passwordSetupRequired: !user.password_set,
      message: "Email address is verified.",
    });
  }

  // If our table shows not verified, check Supabase Auth status
  // This handles the case where Supabase Auth verified but our table wasn't updated
  try {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (!authError && authUser?.user?.email_confirmed_at) {
      // Supabase Auth shows verified, update our table
      const { error: updateError } = await supabase
        .from("users")
        .update({ email_confirmed: true })
        .eq("email", email);

      if (!updateError) {
        // Activate zones if password is set
        if (user.password_set) {
          await supabase
            .from("dns_zones")
            .update({
              is_active: true,
              activated_at: new Date().toISOString(),
              deactivated_at: null
            })
            .eq("user_id", user.id)
            .eq("is_active", false);
        }

        return NextResponse.json({
          verified: true,
          email: user.email,
          passwordSetupRequired: !user.password_set,
          message: "Email address is verified.",
        });
      }
    }
  } catch (error) {
    console.error("Error checking Supabase Auth status:", error);
  }

  // Still not verified
  return NextResponse.json({
    verified: false,
    email: user.email,
    message: "Email address is not yet verified.",
  });
}
