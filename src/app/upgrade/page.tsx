"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

export default function UpgradePage() {
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

        {/* Coming Soon Card */}
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-2">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Pro Plan</CardTitle>
                <CardDescription>Premium DNS monitoring features</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Coming Soon Message */}
            <div className="bg-white rounded-lg p-6 border border-amber-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment System Coming Soon</h3>
              <p className="text-gray-600 mb-4">
                We're currently setting up our payment processing system. Pro subscriptions will be available shortly.
              </p>
              <div className="bg-gray-100 rounded-md p-4">
                <p className="text-sm text-gray-700 font-medium">For now, please contact us at:</p>
                <p className="text-sm text-gray-900 mt-1">support@axonshield.com</p>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Pro Features Include:</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  "Unlimited DNS zones",
                  "Faster check frequencies (1s, 5s, 15s)",
                  "Advanced monitoring alerts",
                  "Priority email support",
                  "Detailed analytics & reports",
                  "API access (coming soon)"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

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

