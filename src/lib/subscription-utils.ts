/**
 * Checks if a user has an active Pro subscription
 * A subscription is considered active if:
 * - subscription_status is 'active' or 'trialing'
 * - subscription_current_period_end is in the future (or null, meaning lifetime)
 */
export function isSubscriptionActive(
  subscriptionStatus: string | null,
  subscriptionCurrentPeriodEnd: string | null
): boolean {
  if (!subscriptionStatus || subscriptionStatus === 'free') {
    return false;
  }

  // Active or trialing status means subscription is active
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    // If period end is null, assume active (edge case)
    if (!subscriptionCurrentPeriodEnd) {
      return true;
    }
    
    // Check if period end is in the future
    const periodEnd = new Date(subscriptionCurrentPeriodEnd);
    const now = new Date();
    return periodEnd > now;
  }

  // Canceled subscriptions are only active if still within period
  if (subscriptionStatus === 'canceled') {
    if (!subscriptionCurrentPeriodEnd) {
      return false;
    }
    const periodEnd = new Date(subscriptionCurrentPeriodEnd);
    const now = new Date();
    return periodEnd > now;
  }

  // past_due, unpaid, etc. are not active
  return false;
}
