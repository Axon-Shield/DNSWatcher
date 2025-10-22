"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, Loader2, RefreshCw } from "lucide-react";

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
}

export default function EmailVerification({ email, onVerified, onBack }: EmailVerificationProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const checkVerificationStatus = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/check-verification-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok && result.verified) {
        setIsVerified(true);
        // Auto-redirect after a short delay
        setTimeout(() => {
          onVerified();
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const sendVerificationEmail = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        setEmailSent(true);
      } else {
        setError(result.message || "Failed to send verification email");
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      setError("Failed to send verification email");
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check verification status every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isVerified) {
        checkVerificationStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isVerified]);

  // Send initial verification email
  useEffect(() => {
    sendVerificationEmail();
  }, []);

  if (isVerified) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Email Verified!</CardTitle>
          <CardDescription>
            Your email has been verified successfully. Redirecting to your DNS zone...
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
        <CardTitle className="text-blue-600">Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a verification link to <strong>{email}</strong>
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

        {emailSent && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              Verification email sent! Please check your inbox and spam folder.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Click the verification link in your email to activate DNS monitoring.
            We'll automatically detect when you've verified your email.
          </p>

          <div className="flex space-x-2">
            <Button
              onClick={checkVerificationStatus}
              disabled={isChecking}
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Now
                </>
              )}
            </Button>

            <Button
              onClick={sendVerificationEmail}
              disabled={isChecking}
              variant="outline"
              className="flex-1"
            >
              Resend Email
            </Button>
          </div>

          {onBack && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={onBack}
              disabled={isChecking}
            >
              Back
            </Button>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Check your email for the verification link</li>
            <li>• Click the link to verify your email</li>
            <li>• DNS monitoring will automatically activate</li>
            <li>• You'll be redirected to your zone dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
