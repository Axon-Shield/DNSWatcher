"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from "lucide-react";

interface VerificationResult {
  success: boolean;
  message: string;
  email?: string;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "error">("pending");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const verifyOtp = async () => {
    if (!email || !otp || otp.length !== 6) {
      setResult({
        success: false,
        message: "Please enter a valid 6-digit verification code.",
      });
      setVerificationStatus("error");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email,
          otp: otp
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setVerificationStatus("success");
        setResult(data);
        
        // Redirect to zone page after successful verification
        setTimeout(() => {
          // Get the zone from the URL params or localStorage
          const zone = new URLSearchParams(window.location.search).get("zone") || 
                       localStorage.getItem("pending_zone") || "";
          
          if (zone) {
            window.location.href = "/?autoLogin=true&email=" + encodeURIComponent(email || "") + "&zone=" + encodeURIComponent(zone);
          } else {
            window.location.href = "/?autoLogin=true&email=" + encodeURIComponent(email || "");
          }
          
          // Clear any pending zone from localStorage
          localStorage.removeItem("pending_zone");
        }, 2000);
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
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      const response = await fetch("/api/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: "New verification code sent to your email.",
        });
        setVerificationStatus("pending");
        setOtp(""); // Clear the OTP input
      } else {
        setResult({
          success: false,
          message: data.message || "Failed to send verification code.",
        });
        setVerificationStatus("error");
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error. Please try again.",
      });
      setVerificationStatus("error");
    } finally {
      setIsResending(false);
    }
  };

  const renderContent = () => {
    switch (verificationStatus) {
      case "success":
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-green-600">Email Verified!</h2>
            <p className="text-gray-600 mb-4">
              Your email address has been successfully verified. Your DNS zones are now being monitored.
            </p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
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
              <Button onClick={() => setVerificationStatus("pending")}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                Back to Registration
              </Button>
            </div>
          </div>
        );

      case "pending":
      default:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Mail className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Enter Verification Code</h2>
              <p className="text-gray-600 mb-4">
                We've sent a 6-digit verification code to <strong>{email}</strong>. 
                Please enter the code below to verify your email address.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button 
                onClick={verifyOtp} 
                disabled={isVerifying || otp.length !== 6}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Didn't receive the code?</p>
                <Button 
                  variant="outline" 
                  onClick={resendOtp} 
                  disabled={isResending}
                  size="sm"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  if (!email) {
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
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-red-600">Missing Email</h2>
              <p className="text-gray-600 mb-4">
                No email address provided for verification.
              </p>
              <Button onClick={() => window.location.href = "/"}>
                Back to Registration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email Verification</CardTitle>
            <CardDescription>
              Loading verification...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}