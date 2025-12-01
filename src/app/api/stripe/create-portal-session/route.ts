import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service";
import { logError, logWarn } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      logWarn("stripe.portalSession.disabled", "Stripe integration not configured; portal session disabled");
      return NextResponse.json(
        { error: "Billing portal is not available because Stripe is not configured.", stripeEnabled: false },
        { status: 503 }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2025-10-29.clover",
    });

    // Verify user is authenticated
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Get user from database
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("email", user.email)
      .single();

    if (userError || !dbUser || !dbUser.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Create portal session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripe_customer_id,
      return_url: `${siteUrl}/upgrade`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    logError("stripe.portalSession", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}
