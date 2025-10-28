"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, RefreshCw, Mail } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
}

export default function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setError(null);

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
        setIsVerified(true);
        setSuccessMessage("Email verified successfully! Activating DNS monitoring...");
        
        // After verification, ensure user is logged in, then redirect to zone view
        setTimeout(async () => {
          try {
            // If server indicates a session is missing, perform auto-login bootstrap
            if (data.requiresLogin) {
              const loginRes = await fetch("/api/auto-login-after-verification", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
              });

              // Continue with redirect even if this call fails; UX fallback to homepage
              await loginRes.json().catch(() => ({}));
            }

            const redirectUrl = `/?autoLogin=true&email=${encodeURIComponent(email)}`;
            window.location.href = redirectUrl;
          } catch {
            onVerified();
          }
        }, 1500);
      } else {
        setError(data.message || "Verification failed. Please try again.");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    setIsResending(true);
    setError(null);

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
        setSuccessMessage("New verification code sent to your email!");
        setOtp(""); // Clear the OTP input
      } else {
        setError(data.message || "Failed to send verification code.");
      }
    } catch (error) {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Email Verified!</CardTitle>
          <CardDescription>
            {successMessage || "Your email has been verified successfully. Redirecting to your DNS zone..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Mail className="h-16 w-16 text-blue-600" />
        </div>
        <CardTitle className="text-blue-600">Enter Verification Code</CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to <strong>{email}</strong>. 
          Please enter the code below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

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

          {onBack && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
              disabled={isVerifying || isResending}
            >
              Back
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}