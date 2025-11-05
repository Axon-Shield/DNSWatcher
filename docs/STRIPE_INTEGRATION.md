# Stripe Integration Setup Guide

## Overview

Stripe payment integration has been successfully added to DNSWatcher. Users can now subscribe to the Pro plan ($29/month) to unlock unlimited DNS zones and faster monitoring cadences.

## What Was Implemented

### 1. Database Schema Updates
- Added Stripe subscription tracking fields to the `users` table:
  - `stripe_customer_id` - Stripe customer identifier
  - `stripe_subscription_id` - Stripe subscription identifier
  - `subscription_status` - Current subscription status (free, active, canceled, past_due, unpaid, trialing)
  - `subscription_current_period_end` - When the current billing period ends
  - `subscription_current_period_start` - When the current billing period started

### 2. Stripe API Routes
- **`/api/stripe/create-checkout-session`** - Creates a Stripe checkout session for new subscriptions
- **`/api/stripe/create-portal-session`** - Creates a Stripe customer portal session for managing subscriptions
- **`/api/stripe/webhook`** - Handles Stripe webhook events (subscription updates, payments, cancellations)

### 3. Subscription Management
- Subscription status is automatically checked on dashboard load
- Expired subscriptions are automatically downgraded to free tier
- Pro features are only available when subscription is active and within billing period

### 4. UI Updates
- **Upgrade Page** (`/upgrade`) - Full Stripe checkout integration with payment flow
- **Landing Page** - Updated Pro plan section with pricing and payment buttons
- Subscription status indicators throughout the dashboard

## Setup Instructions

### 1. Stripe Account Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard:
   - **Test Mode**: Use test keys for development
   - **Live Mode**: Use live keys for production

### 2. Environment Variables

Add the following to your `.env.local` file (or Vercel environment variables):

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
   - For local development, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add it to `STRIPE_WEBHOOK_SECRET`

### 4. Stripe CLI (for local development)

Install Stripe CLI for local webhook testing:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Then login
stripe login
```

Run webhook forwarding:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 5. Pricing Configuration

Current pricing is set to **$29/month** in `/src/app/api/stripe/create-checkout-session/route.ts`:

```typescript
unit_amount: 2900, // $29.00 per month (in cents)
recurring: {
  interval: "month",
}
```

To change the price, update the `unit_amount` value (in cents).

## How It Works

### Subscription Flow

1. **User clicks "Upgrade to Pro"** → Redirects to Stripe Checkout
2. **User completes payment** → Stripe sends `checkout.session.completed` webhook
3. **Webhook updates user record** → Sets `subscription_tier` to "pro", `subscription_status` to "active"
4. **User gets Pro features** → Unlimited zones, faster cadences (1s, 15s, 30s)

### Subscription Expiration

- Subscriptions remain active until `subscription_current_period_end`
- When period ends, webhook sets `subscription_status` to "canceled"
- Dashboard API checks expiration on load and downgrades expired subscriptions
- Pro features are disabled once subscription expires

### Cancellation Flow

1. User clicks "Manage Subscription" → Redirects to Stripe Customer Portal
2. User cancels subscription → Stripe sends `customer.subscription.deleted` webhook
3. Webhook updates user → Subscription remains active until period end
4. After period end → User downgraded to free tier automatically

## Testing

### Test Cards (Stripe Test Mode)

Use these test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

### Testing Checklist

- [ ] Create a checkout session (should redirect to Stripe)
- [ ] Complete a test payment (webhook should update user)
- [ ] Verify Pro features are enabled
- [ ] Test subscription cancellation (via Customer Portal)
- [ ] Verify expiration logic (check if subscription expires correctly)

## Security Notes

- Webhook signature verification is implemented to prevent unauthorized requests
- All subscription checks validate both `subscription_status` and `subscription_current_period_end`
- User authentication is required for all Stripe API routes
- Stripe handles all PCI compliance requirements

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. Check server logs for webhook errors
4. Use Stripe Dashboard → Webhooks → Test webhook to resend events

### Subscription Not Updating

1. Check webhook logs in Stripe Dashboard
2. Verify database migration was applied successfully
3. Check server logs for errors
4. Ensure `subscription_status` field exists in database

### Payment Not Processing

1. Verify Stripe API keys are correct
2. Check if using test keys with test card numbers
3. Verify `NEXT_PUBLIC_SITE_URL` is set correctly for redirect URLs
4. Check browser console for JavaScript errors

## Next Steps

1. Set up Stripe account and get API keys
2. Configure webhook endpoint
3. Test payment flow end-to-end
4. Update pricing if needed
5. Deploy to production with live Stripe keys

## Support

For Stripe-related issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For DNSWatcher integration issues:
- Check server logs
- Verify database schema
- Test webhook events manually
