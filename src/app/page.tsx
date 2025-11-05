"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Eye, AlertTriangle, Network, Skull, Lock, LogIn } from "lucide-react";
import RegistrationForm from "@/components/forms/registration-form";
import LoginForm from "@/components/forms/login-form";
import ForgotPassword from "@/components/forms/forgot-password";
import UserDashboard from "@/components/user-dashboard";
import ErrorBoundary from "@/components/error-boundary";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase-client";

function HomeContent() {
  const [currentView, setCurrentView] = useState<"home" | "login" | "forgot-password" | "dashboard">("home");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const searchParams = useSearchParams();

  // Auto-login after email verification
  useEffect(() => {
    const autoLogin = searchParams.get("autoLogin");
    const email = searchParams.get("email");
    
    if (autoLogin === "true" && email) {
      // Automatically log in the user after email verification
      const autoLoginUser = async () => {
        try {
          setIsBootstrapping(true);
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
        } finally {
          setIsBootstrapping(false);
        }
      };

      autoLoginUser();
    }
  }, [searchParams]);

  // Detect existing session and enforce 30-minute cap
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const checkSession = async () => {
      try {
        const expiryCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("app_session_expires_at="))
          ?.split("=")[1];

        const { data } = await supabase.auth.getUser();
        
        // If no Supabase session, clear state
        if (!data.user?.email) {
          setUserEmail(null);
          if (currentView === "dashboard") {
            setCurrentView("home");
            setDashboardData(null);
          }
          return;
        }

        // Check session expiry cookie - if expired, sign out
        if (expiryCookie) {
          const expiryTime = Number(expiryCookie);
          if (expiryTime < Date.now()) {
            await supabase.auth.signOut();
            setUserEmail(null);
            if (currentView === "dashboard") {
              setCurrentView("home");
              setDashboardData(null);
            }
            return;
          }
        } else {
          // If no expiry cookie but we have a session, set one or sign out
          // This handles cases where session exists but cookie was cleared
          await supabase.auth.signOut();
          setUserEmail(null);
          if (currentView === "dashboard") {
            setCurrentView("home");
            setDashboardData(null);
          }
          return;
        }

        // Session is valid
        setUserEmail(data.user.email);
        // If authenticated and still on home, load dashboard automatically
        if (currentView === "home") {
          try {
            setIsBootstrapping(true);
            const res = await fetch("/api/dashboard", { method: "GET" });
            if (res.ok) {
              const dash = await res.json();
              handleLoginSuccess(dash);
            }
          } catch {}
          finally { setIsBootstrapping(false); }
        }
      } catch {
        setUserEmail(null);
        if (currentView === "dashboard") {
          setCurrentView("home");
          setDashboardData(null);
        }
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60 * 1000);
    return () => clearInterval(interval);
  }, [currentView]);

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

  // Show loading spinner during auto-login or bootstrapping
  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">DNSWatcher</h1>
            <p className="text-gray-600">Loading your dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

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
      {isBootstrapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-700 dark:text-gray-200">Loading your dashboard…</p>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">DNSWatcher</h1>
          </div>
          <div className="flex items-center space-x-3">
            {userEmail ? (
              <>
                <span className="text-sm text-gray-700 dark:text-gray-200">Signed in as {userEmail}</span>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/dashboard", { method: "GET" });
                      if (res.ok) {
                        const data = await res.json();
                        handleLoginSuccess(data);
                      } else {
                        setCurrentView("login");
                      }
                    } catch {
                      setCurrentView("login");
                    }
                  }}
                >
                  Go to DNS Zones
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView("login")}
                  className="flex items-center space-x-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setIsBootstrapping(true);
                      const res = await fetch("/api/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: "demo", password: "demo" })
                      });
                      if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ message: "Demo login failed" }));
                        throw new Error(errorData.message || "Demo login failed");
                      }
                      const data = await res.json();
                      if (data.success) {
                        handleLoginSuccess(data);
                      } else {
                        throw new Error(data.message || "Demo login failed");
                      }
                    } catch (err) {
                      console.error("Demo login error:", err);
                      alert(err instanceof Error ? err.message : "Failed to load demo. Please try again.");
                    } finally {
                      setIsBootstrapping(false);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Try Demo
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-900/30 bg-white/60 dark:bg-gray-900/50 backdrop-blur-sm p-10 mb-16 shadow-[0_10px_40px_-15px_rgba(30,64,175,0.35)]">
          <div className="absolute -top-24 -right-24 h-64 w-64 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-full blur-2xl" />
          <div className="relative text-center">
            <h2 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
              Know the moment your DNS is compromised
            </h2>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-8">
              DNS is a prime target for attackers. DNSWatcher monitors your authoritative zones every 30 seconds,
              detects unauthorized changes, and alerts your team before users are hijacked or services go dark.
            </p>
            <div className="flex justify-center gap-3">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={() => {
                const el = document.getElementById("registration");
                el?.scrollIntoView({ behavior: "smooth" });
              }}>
                Add a DNS Zone
              </Button>
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={async () => {
                try {
                  setIsBootstrapping(true);
                  const res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "demo", password: "demo" })
                  });
                  if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: "Demo login failed" }));
                    throw new Error(errorData.message || "Demo login failed");
                  }
                  const data = await res.json();
                  if (data.success) {
                    handleLoginSuccess(data);
                  } else {
                    throw new Error(data.message || "Demo login failed");
                  }
                } catch (err) {
                  console.error("Demo login error:", err);
                  alert(err instanceof Error ? err.message : "Failed to load demo. Please try again.");
                } finally {
                  setIsBootstrapping(false);
                }
              }}>
                Try Demo
              </Button>
            </div>
            {/* Cadence tagline removed per request */}
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Try Demo loads a read-only Pro workspace with 4 preset zones and 30s refresh. No email required. <a href="#registration" className="underline">Register</a> to monitor your own domains.</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/50 p-6 rounded-xl shadow-sm">
            <Eye className="h-12 w-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Detect unauthorized zone changes</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Track SOA serials and critical records for unexpected modifications that indicate tampering.
            </p>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/50 p-6 rounded-xl shadow-sm">
            <Skull className="h-12 w-12 text-rose-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Actionable alerts</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Multi-channel notifications (Email, Slack, Teams, Webhooks) with cooldown and stability checks.
            </p>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/50 p-6 rounded-xl shadow-sm">
            <Network className="h-12 w-12 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Built for security teams</h3>
            <p className="text-gray-600 dark:text-gray-300">
              High-frequency checks, stability windows, and noise reduction tuned for real incident response.
            </p>
          </div>
        </div>

        {/* Security education section */}
        <section className="mb-16 grid lg:grid-cols-2 gap-8">
          <div className="bg-white/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
            <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">Why DNS security matters</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              DNS translates names to services. If attackers alter your zone, they can silently redirect users,
              intercept credentials, disrupt email delivery, or takedown critical apps. Monitoring zone integrity
              is an essential control alongside configuration hardening and DNSSEC.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
              <li>DNS spoofing/poisoning: fraudulent answers that misroute users</li>
              <li>Hijacking: unauthorized nameserver or record changes</li>
              <li>Tampering: unexpected SOA serial jumps or record edits</li>
            </ul>
          </div>
          <div className="bg-white/70 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/50 rounded-xl p-6 shadow-sm">
            <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">How DNSWatcher helps</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We continuously compare observed zone state against the last known-good baseline and alert only when
              changes are meaningful and stable. Cooldowns and stability windows reduce noise; frequent checks catch
              compromise quickly.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Every 30 seconds by default — tunable per zone</li>
              <li>Serial stability checks to avoid flapping events</li>
              <li>Notification cooldowns to prevent alert fatigue</li>
            </ul>
          </div>
        </section>

        {/* Free vs Pro comparison */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Choose your coverage</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/60 bg-white/80 dark:bg-gray-800/60 p-6 shadow-sm">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-semibold">Free</span>
                <span className="text-sm text-gray-500">Best for evaluation</span>
              </div>
              <div className="text-3xl font-extrabold mb-4">$0</div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 mb-4 list-disc pl-5">
                <li>Monitoring cadence: 60 seconds</li>
                <li>Smart filtering and cooldowns</li>
                <li>Email alerts on verified changes</li>
                <li>Up to 2 zones</li>
              </ul>
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => {
                const el = document.getElementById("registration");
                el?.scrollIntoView({ behavior: "smooth" });
              }}>Start Free</Button>
            </div>
            <div className="rounded-xl border-2 border-blue-500/60 bg-white dark:bg-gray-800 p-6 shadow-[0_10px_40px_-15px_rgba(30,64,175,0.35)]">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-semibold">Pro</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">Available now</span>
              </div>
              <div className="text-3xl font-extrabold mb-4">$29<span className="text-lg text-gray-500">/mo</span></div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 mb-4 list-disc pl-5">
                <li>Monitoring cadence: 60s / 30s / 15s / 1s</li>
                <li>Unlimited DNS zones</li>
                <li>Priority alerting and advanced analytics</li>
                <li>Real-time change detection</li>
              </ul>
              {userEmail ? (
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={async () => {
                    window.location.href = "/upgrade";
                  }}
                >
                  Upgrade to Pro
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => {
                    const el = document.getElementById("registration");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Sign Up to Upgrade
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Illustrative images removed per product focus */}

        {/* Registration Form */}
        <div id="registration" className="max-w-2xl mx-auto">
          <ErrorBoundary>
            <RegistrationForm 
              onSuccess={() => setCurrentView("login")}
              onRedirectToLogin={(email) => {
                // Only show login after verification; this path should be rare now
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