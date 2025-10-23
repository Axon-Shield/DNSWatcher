"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Eye, AlertTriangle, Mail, LogIn } from "lucide-react";
import RegistrationForm from "@/components/forms/registration-form";
import LoginForm from "@/components/forms/login-form";
import ForgotPassword from "@/components/forms/forgot-password";
import UserDashboard from "@/components/user-dashboard";
import ErrorBoundary from "@/components/error-boundary";

function HomeContent() {
  const [currentView, setCurrentView] = useState<"home" | "login" | "forgot-password" | "dashboard">("home");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const searchParams = useSearchParams();

  // Auto-login after email verification
  useEffect(() => {
    const autoLogin = searchParams.get("autoLogin");
    const email = searchParams.get("email");
    
    if (autoLogin === "true" && email) {
      // Automatically log in the user after email verification
      const autoLoginUser = async () => {
        try {
          const response = await fetch("/api/auto-login-after-verification", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            handleLoginSuccess(data);
          } else {
            // If auto-login fails, redirect to login page with email pre-filled
            setCurrentView("login");
          }
        } catch (error) {
          console.error("Auto-login failed:", error);
          setCurrentView("login");
        }
      };

      autoLoginUser();
    }
  }, [searchParams]);

  const handleLoginSuccess = (data: any) => {
    setDashboardData(data);
    setCurrentView("dashboard");
  };

  const handleZoneRemoved = (zoneId: string) => {
    if (dashboardData) {
      const updatedZones = dashboardData.allZones.filter((zone: any) => zone.id !== zoneId);
      
      // If no zones left, redirect to home
      if (updatedZones.length === 0) {
        setCurrentView("home");
        setDashboardData(null);
        return;
      }
      
      // If the current zone was removed, switch to the first remaining zone
      if (dashboardData.currentZone.id === zoneId) {
        const newCurrentZone = updatedZones[0];
        setDashboardData({
          ...dashboardData,
          currentZone: newCurrentZone,
          allZones: updatedZones,
          zoneHistory: [] // Clear history since we're switching zones
        });
      } else {
        // Just remove the zone from the list
        setDashboardData({
          ...dashboardData,
          allZones: updatedZones
        });
      }
    }
  };

  // Show dashboard if user is logged in
  if (currentView === "dashboard" && dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserDashboard 
          data={dashboardData} 
          onZoneRemoved={handleZoneRemoved}
          onBack={() => setCurrentView("home")}
        />
      </div>
    );
  }

  // Show login form
  if (currentView === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DNSWatcher</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setCurrentView("home")}
            >
              Back to Home
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <ErrorBoundary>
              <LoginForm 
                onSuccess={handleLoginSuccess} 
                onForgotPassword={() => setCurrentView("forgot-password")}
              />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    );
  }

  // Show forgot password form
  if (currentView === "forgot-password") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DNSWatcher</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setCurrentView("login")}
            >
              Back to Sign In
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <ErrorBoundary>
              <ForgotPassword onBack={() => setCurrentView("login")} />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    );
  }

  // Show home page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DNSWatcher</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setCurrentView("login")}
              className="flex items-center space-x-2"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Protect Your DNS Infrastructure
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Monitor your DNS zones for unauthorized changes and get instant notifications
            when your domain&apos;s SOA records are modified. Stay ahead of DNS hijacking attacks.
          </p>
          <div className="flex justify-center space-x-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Start Monitoring
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Eye className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Continuous monitoring of your DNS zones with checks every minute
                to detect unauthorized changes immediately.
              </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <AlertTriangle className="h-12 w-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Instant Alerts</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get notified instantly via email when SOA records change, helping you
              respond quickly to potential DNS hijacking attempts.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <Mail className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Email Notifications</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Receive detailed email alerts with change history and recommendations
              for securing your DNS infrastructure.
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <div className="max-w-2xl mx-auto">
          <ErrorBoundary>
            <RegistrationForm 
              onSuccess={() => setCurrentView("login")}
              onRedirectToLogin={(email) => {
                setCurrentView("login");
                // You could also pre-fill the email in the login form
              }}
            />
          </ErrorBoundary>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 DNSWatcher. Protecting your domains, one DNS record at a time.</p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">DNSWatcher</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}