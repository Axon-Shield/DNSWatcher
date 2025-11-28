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
        <div className="relative overflow-hidden rounded-3xl border border-blue-200/50 dark:border-blue-900/40 bg-white/70 dark:bg-gray-950/60 backdrop-blur-lg px-10 py-14 mb-16 shadow-[0_20px_90px_-30px_rgba(30,64,175,0.65)]">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 h-72 w-72 bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-500/10 rounded-full blur-[120px]" />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-full blur-3xl" />
          </div>
          <div className="relative grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center text-xs font-semibold tracking-wide uppercase text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-full px-3 py-1 mb-5">
                Incident Radar for Authoritative Zones
              </span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
                Catch unauthorized DNS edits before they hijack your users.
              </h2>
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8">
                DNSWatcher polls your authoritative SOA serials every 30 seconds, double-confirms changes across
                resolvers, and fires alerts into Slack, Teams, email, or webhooks so SecOps can roll back bad pushes
                before customers feel it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30" onClick={() => {
                  const el = document.getElementById("registration");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}>
                  Start Monitoring My Zones
                </Button>
                <Button size="lg" variant="outline" className="border-blue-200 bg-white/70 dark:bg-transparent" onClick={async () => {
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
                    alert(err instanceof Error ? err.message : "Failed to load demo. Please try again.");
                  } finally {
                    setIsBootstrapping(false);
                  }
                }}>
                  Explore Live Demo Tenant
                </Button>
              </div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                30-second cadence with jitter + second confirmation run. Includes read-only demo workspace
                seeded with real zones so stakeholders can kick the tires safely.{" "}
                <a className="underline" href="#registration">Register</a> to monitor your own domains.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                DNSWatcher vs “big iron”
              </p>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">DomainTools Monitors</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    WHOIS-scale dataset with registrant/IP/name-server alerts—powerful, but heavy for teams that just need serial-level guardrails.[^dt]
                  </p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Cisco ThousandEyes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Deep observability across routing & apps. Great for infra troubleshooting, less targeted for rapid SOA-change containment.[^te]
                  </p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase mb-1">DNSWatcher</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    Purpose-built SOA tripwire with multi-resolver confirmation, built-in Slack/Teams/email/webhook actions,
                    Supabase-backed history, and a safe demo tenant.
                  </p>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-4">
                  Sources:{" "}
                  <a className="underline" href="https://www.domaintools.com/products/monitors/" target="_blank" rel="noreferrer">
                    DomainTools Monitors
                  </a>{" "}
                  •{" "}
                  <a className="underline" href="https://www.thousandeyes.com/solutions/dns-monitoring" target="_blank" rel="noreferrer">
                    Cisco ThousandEyes DNS Monitoring
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid: Incident Radar Pillars */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/80 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-800/70 p-6 rounded-2xl shadow-lg shadow-blue-600/5">
            <Eye className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">SOA Tripwire Engine</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Polls authoritative SOA serials every 30s with jitter, re-runs confirmation against independent resolvers,
              and only fires when a change is verified—no more chasing DNS cache ghosts.
            </p>
            <ul className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
              <li>Double-check consensus before alerting</li>
              <li>Cadence tiers per zone (60s → 1s)</li>
              <li>Supabase-backed audit history</li>
            </ul>
          </div>
          <div className="bg-white/80 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-800/70 p-6 rounded-2xl shadow-lg shadow-rose-600/5">
            <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Multi-Channel Response</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Pipe verified incidents into Slack, Microsoft Teams, email, or custom webhooks with per-user preferences
              and test hooks so playbooks stay consistent.
            </p>
            <ul className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
              <li>Notification cooldown + suppression</li>
              <li>Inline Slack/Teams test sends</li>
              <li>Webhook payloads ready for SOAR</li>
            </ul>
          </div>
          <div className="bg-white/80 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-800/70 p-6 rounded-2xl shadow-lg shadow-indigo-600/5">
            <Network className="h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Change-Ready Hardening</h3>
            <p className="text-gray-700 dark:text-gray-300">
              Auto-enforces least-privilege flows—OTP email verification, Supabase session caps, and per-zone cadence
              limits—so attackers can’t sneak long-lived sessions or blast ultra-fast checks on free tiers.
            </p>
            <ul className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
              <li>OTP gating before zones activate</li>
              <li>30-minute app-session expirations</li>
              <li>Per-tier cadence guardrails (free max 60s)</li>
            </ul>
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