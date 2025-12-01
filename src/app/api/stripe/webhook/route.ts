import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase-service";
import { logError, logWarn } from "@/lib/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing for webhook route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logError("stripe.webhook.verifySignature", err);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription" && session.subscription) {
          const subscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as Stripe.Subscription;

          // Update user subscription
          await supabase
            .from("users")
            .update({
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status === "active" ? "active" : "trialing",
              subscription_tier: "pro",
              subscription_current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
              subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
              max_zones: null, // Unlimited for pro
            })
            .eq("stripe_customer_id", subscription.customer as string);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Determine subscription status
        let status: "free" | "trialing" | "active" | "canceled" | string = "free";
        let tier: "free" | "pro" | string = "free";
        let maxZones: number | null = 2;

        if (subscription.status === "active" || subscription.status === "trialing") {
          status = subscription.status === "trialing" ? "trialing" : "active";
          tier = "pro";
          maxZones = null; // Unlimited
        } else if (subscription.status === "canceled") {
          // Check if subscription is still within current period
          const now = Math.floor(Date.now() / 1000);
          if (subscription.current_period_end > now) {
            status = "active"; // Still active until period ends
            tier = "pro";
            maxZones = null;
          } else {
            status = "canceled";
            tier = "free";
            maxZones = 2;
          }
        } else {
          status = subscription.status;
          tier = "free";
          maxZones = 2;
        }

        await supabase
          .from("users")
          .update({
            subscription_status: status,
            subscription_tier: tier,
            subscription_current_period_start: subscription.current_period_start 
              ? new Date(subscription.current_period_start * 1000).toISOString() 
              : null,
            subscription_current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString() 
              : null,
            max_zones: maxZones,
          })
          .eq("stripe_customer_id", subscription.customer as string);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const subscription = (await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )) as Stripe.Subscription;

          await supabase
            .from("users")
            .update({
              subscription_status: "active",
              subscription_tier: "pro",
              subscription_current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
              subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
              max_zones: null,
            })
            .eq("stripe_customer_id", invoice.customer as string);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
          const subscription = (await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )) as Stripe.Subscription;

          // Check if subscription is still within grace period
          const now = Math.floor(Date.now() / 1000);
          const isWithinPeriod = subscription.current_period_end > now;

          await supabase
            .from("users")
            .update({
              subscription_status: isWithinPeriod ? "past_due" : "unpaid",
              subscription_current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
              subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
            })
            .eq("stripe_customer_id", invoice.customer as string);
        }
        break;
      }

    default:
        logWarn("stripe.webhook.unhandledEvent", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logError("stripe.webhook.handler", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
