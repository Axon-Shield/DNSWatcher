"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";

interface VerificationResult {
  success: boolean;
  message: string;
  email?: string;
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error" | "pending">("loading");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          token: verificationToken,
          email: email 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setVerificationStatus("success");
        setResult(data);
        
        // If password is set, automatically log the user in
        if (!data.passwordSetupRequired) {
          // Auto-login the user and redirect to dashboard
          setTimeout(() => {
            window.location.href = "/?autoLogin=true&email=" + encodeURIComponent(email || "");
          }, 2000);
        }
      } else {
        setVerificationStatus("error");
        setResult(data);
      }
    } catch (error) {
      setVerificationStatus("error");
      setResult({
        success: false,
        message: "Network error. Please try again.",
      });
    }
  };

  const checkVerificationStatus = async () => {
    if (!email) return;
    
    setIsChecking(true);
    try {
      const response = await fetch(`/api/check-verification-status?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (response.ok && data.verified) {
        setVerificationStatus("success");
        setResult(data);
      } else {
        setVerificationStatus("pending");
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else if (email) {
      // If no token but email provided, check current status
      checkVerificationStatus();
    } else {
      setVerificationStatus("error");
      setResult({
        success: false,
        message: "Missing verification token or email address.",
      });
    }
  }, [token, email]);

  const renderContent = () => {
    switch (verificationStatus) {
      case "loading":
        return (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        );

      case "success":
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-green-600">Email Verified!</h2>
            <p className="text-gray-600 mb-4">
              Your email address has been successfully verified. Your DNS zones are now being monitored.
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Go to Dashboard
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="text-center">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-600">Verification Failed</h2>
            <p className="text-gray-600 mb-4">
              {result?.message || "There was an error verifying your email address."}
            </p>
            <div className="space-y-2">
              <Button onClick={() => window.location.href = "/"}>
                Try Again
              </Button>
              {email && (
                <Button variant="outline" onClick={checkVerificationStatus} disabled={isChecking}>
                  {isChecking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Check Status"
                  )}
                </Button>
              )}
            </div>
          </div>
        );

      case "pending":
        return (
          <div className="text-center">
            <Mail className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-4">
              We've sent a verification link to <strong>{email}</strong>. 
              Please click the link in your email to verify your address.
            </p>
            <div className="space-y-2">
              <Button onClick={checkVerificationStatus} disabled={isChecking}>
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "I've Verified My Email"
                )}
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                Back to Registration
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            Verify your email address to start monitoring your DNS zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
