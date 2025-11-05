"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Crown, ArrowLeft, Check, Loader2, CheckCircle, XCircle, Settings } from "lucide-react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function UpgradePageContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and get subscription status
    const checkSubscriptionStatus = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          setIsPro(data.user?.subscription_tier === "pro");
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkSubscriptionStatus();

    // Handle success/cancel from Stripe redirect
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const sessionId = searchParams.get("session_id");

    if (success && sessionId) {
      // Refresh subscription status after successful payment
      setTimeout(() => {
        checkSubscriptionStatus();
        router.replace("/upgrade");
      }, 2000);
    } else if (canceled) {
      setError("Payment was canceled. You can try again anytime.");
    }
  }, [searchParams, router]);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId, url } = await response.json();

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      setError(err.message || "Failed to start checkout. Please try again.");
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create portal session");
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe Customer Portal
        window.location.href = url;
      } else {
        throw new Error("No portal URL received");
      }
    } catch (err: any) {
      setError(err.message || "Failed to open customer portal. Please try again.");
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading subscription status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Upgrade to Pro</h1>
          <p className="text-gray-600 mt-2">Unlock advanced monitoring features</p>
        </div>

        {/* Success Message */}
        {searchParams.get("success") && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Payment successful! Your Pro subscription is now active.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Pro Status Card */}
        {isPro && (
          <Card className="mb-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-full p-2">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Pro Active</CardTitle>
                    <CardDescription>You're currently subscribed to Pro</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={handleManageSubscription} className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upgrade Card */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full p-2">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Pro Plan</CardTitle>
                <CardDescription>Premium DNS monitoring features</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pricing */}
            <div className="bg-white rounded-lg p-6 border border-blue-200">
              <div className="text-center mb-4">
                <div className="text-4xl font-extrabold text-gray-900 mb-2">$29</div>
                <div className="text-gray-600">per month</div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                Cancel anytime. Your subscription will remain active until the end of the billing period.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Pro Features Include:</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  "Unlimited DNS zones",
                  "Faster check frequencies (1s, 15s, 30s)",
                  "Advanced monitoring alerts",
                  "Priority email support",
                  "Detailed analytics & reports",
                  "Real-time change detection"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade Button */}
            {!isPro && (
              <div className="pt-4">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                  size="lg"
                  onClick={handleUpgrade}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  You'll be redirected to Stripe to complete your payment securely
                </p>
              </div>
            )}

            {/* Return Button */}
            <div className="pt-4">
              <Link href="/">
                <Button className="w-full" variant="outline">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <UpgradePageContent />
    </Suspense>
  );
}

