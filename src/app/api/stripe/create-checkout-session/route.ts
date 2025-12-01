import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service";
import { logError, logWarn } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      logWarn("stripe.checkout.disabled", "Stripe integration not configured; checkout disabled");
      return NextResponse.json(
        { error: "Checkout is not available because Stripe is not configured.", stripeEnabled: false },
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
        { error: "Unauthorized. Please sign in to upgrade." },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Get user from database
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, email, stripe_customer_id")
      .eq("email", user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create or retrieve Stripe customer
    let customerId = dbUser.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: dbUser.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", dbUser.id);
    }

    // Create checkout session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "DNSWatcher Pro",
              description: "Unlimited DNS zones, faster monitoring cadences, and advanced features",
            },
            recurring: {
              interval: "month",
            },
            unit_amount: 2900, // $29.00 per month
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/upgrade?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/upgrade?canceled=true`,
      metadata: {
        user_id: dbUser.id,
      },
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error: any) {
    logError("stripe.checkoutSession", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
