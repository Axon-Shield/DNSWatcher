"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, Mail, RefreshCw } from "lucide-react";
import PasswordSetup from "./password-setup";

const registrationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  dnsZone: z.string().min(1, "Please enter a DNS zone to monitor"),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  onSuccess?: () => void;
  onRedirectToLogin?: (email: string) => void;
}

export default function RegistrationForm({ onSuccess, onRedirectToLogin }: RegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<"form" | "email-sent" | "verified" | "password-setup">("form");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isReactivation, setIsReactivation] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Network error" }));
        
        // If user already exists with password, redirect to login
        if (errorData.redirectToLogin) {
          if (onRedirectToLogin) {
            onRedirectToLogin(errorData.email);
          }
          return;
        }
        
        throw new Error(errorData.message || "Registration failed");
      }

      const result = await response.json();
      console.log("Registration successful:", result);
      
      if (result.passwordSetupRequired) {
        setUserEmail(data.email);
        setVerificationStep("password-setup");
      } else {
        setIsSuccess(true);
        reset();
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkVerificationStatus = async () => {
    if (!userEmail) return;
    
    setIsCheckingVerification(true);
    try {
      const response = await fetch(`/api/check-verification-status?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (response.ok && data.verified) {
        setVerificationStep("password-setup");
      } else {
        setError("Email not yet verified. Please check your email and click the verification link.");
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
      setError("Failed to check verification status. Please try again.");
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handlePasswordSet = () => {
    setIsSuccess(true);
    reset();
    if (onSuccess) {
      onSuccess();
    }
  };

  // Show password setup step
  if (verificationStep === "password-setup") {
    return (
      <PasswordSetup
        email={userEmail}
        onPasswordSet={handlePasswordSet}
        onBack={() => setVerificationStep("email-sent")}
      />
    );
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Registration Complete!</CardTitle>
          <CardDescription>
            Your DNS zone is now being monitored. You'll receive email notifications when changes are detected.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (verificationStep === "email-sent") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-16 w-16 text-blue-600" />
          </div>
          <CardTitle className="text-blue-600">Check Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification link to <strong>{userEmail}</strong>. 
            Please click the link in your email to verify your address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Button 
              onClick={checkVerificationStatus} 
              disabled={isCheckingVerification}
              className="w-full"
            >
              {isCheckingVerification ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  I&apos;ve Verified My Email
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setVerificationStep("form");
                setError(null);
                setUserEmail("");
              }}
              className="w-full"
            >
              Back to Registration
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Start Monitoring Your DNS Zone</CardTitle>
        <CardDescription>
          Enter your email and DNS zone to begin monitoring for unauthorized changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dnsZone">DNS Zone</Label>
            <Input
              id="dnsZone"
              type="text"
              placeholder="example.com"
              {...register("dnsZone")}
            />
            {errors.dnsZone && (
              <p className="text-sm text-red-600">{errors.dnsZone.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Start Monitoring"
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Enter your email and DNS zone to start monitoring.</p>
          <p>New users will be asked to set up a secure password.</p>
        </div>
      </CardContent>
    </Card>
  );
}