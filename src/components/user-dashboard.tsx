"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trash2, 
  Calendar, 
  Clock, 
  Shield, 
  Crown, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Filter,
  TrendingUp,
  Settings,
  Lock,
  ArrowRight,
  Plus,
  RefreshCw
} from "lucide-react";
import { Bell, Mail, Slack, Webhook, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { format, subDays, subWeeks, subMonths, isWithinInterval } from 'date-fns';

interface ZoneHistory {
  id: string;
  checked_at: string;
  soa_serial: number;
  soa_record: string;
  is_change: boolean;
  change_details?: string;
}

interface Zone {
  id: string;
  zone_name: string;
  created_at: string;
  last_checked: string;
  check_cadence_seconds?: number;
}

interface User {
  id: string;
  email: string;
  subscription_tier: string;
  max_zones: number;
  notification_preferences?: any;
}

interface DashboardData {
  user: User;
  currentZone: Zone | null;
  zoneHistory: ZoneHistory[];
  allZones: Zone[];
}

interface UserDashboardProps {
  data: DashboardData;
  onZoneRemoved?: (zoneId: string) => void;
  onBack?: () => void;
}

type TimeFilter = '24h' | '7d' | '30d' | 'all';

export default function UserDashboard({ data, onZoneRemoved, onBack }: UserDashboardProps) {
  const [removingZone, setRemovingZone] = useState<string | null>(null);
  const [removedZoneName, setRemovedZoneName] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');
  const [updatingCadence, setUpdatingCadence] = useState(false);
  // Local state derived from props to support filtering and adding zones
  const [currentZone, setCurrentZone] = useState<Zone | null>(data.currentZone || null);
  const [zoneHistory, setZoneHistory] = useState<ZoneHistory[]>(data.zoneHistory);
  const [allZones, setAllZones] = useState<Zone[]>(data.allZones);
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set(data.currentZone ? [data.currentZone.id] : []));
  const [zoneHistories, setZoneHistories] = useState<Record<string, ZoneHistory[]>>(data.currentZone ? { [data.currentZone.id]: data.zoneHistory } : {});
  const [currentCadence, setCurrentCadence] = useState<number>(data.currentZone?.check_cadence_seconds || 60);
  const [newZone, setNewZone] = useState("");
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [isSelectingZone, setIsSelectingZone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditChannel, setShowEditChannel] = useState<null | 'email' | 'slack' | 'teams' | 'webhook'>(null);
  const [slackStep, setSlackStep] = useState<number>(1);
  const [teamsStep, setTeamsStep] = useState<number>(1);
  const autoUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialPrefs = data.user.notification_preferences || {};
  const [channelEnabled, setChannelEnabled] = useState({
    email: initialPrefs.email_enabled ?? true,
    slack: initialPrefs.slack?.enabled ?? false,
    teams: initialPrefs.teams?.enabled ?? false,
    webhook: initialPrefs.webhook?.enabled ?? false,
  });
  const [channelConfig, setChannelConfig] = useState({
    email: { address: initialPrefs.email_address || data.user.email },
    slack: { webhookUrl: initialPrefs.slack?.webhookUrl || '' },
    teams: { webhookUrl: initialPrefs.teams?.webhookUrl || '' },
    webhook: { endpoint: initialPrefs.webhook?.endpoint || '' , secret: initialPrefs.webhook?.secret || ''},
  });

  const [isSavingChannel, setIsSavingChannel] = useState(false);
  const [channelSaveSuccess, setChannelSaveSuccess] = useState<string | null>(null);

  const persistPreferences = async (next?: any) => {
    const prefs = next || {
      email_enabled: channelEnabled.email,
      email_address: channelConfig.email.address,
      slack: { enabled: channelEnabled.slack, webhookUrl: channelConfig.slack.webhookUrl },
      teams: { enabled: channelEnabled.teams, webhookUrl: channelConfig.teams.webhookUrl },
      webhook: { enabled: channelEnabled.webhook, endpoint: channelConfig.webhook.endpoint, secret: channelConfig.webhook.secret },
      frequency: 'immediate',
    };
    try {
      await fetch('/api/notifications/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: prefs }) });
    } catch {}
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDateShort = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, HH:mm');
  };

  // Fetch zone history for a specific zone
  const fetchZoneHistory = async (zoneId: string): Promise<ZoneHistory[]> => {
    try {
      const res = await fetch(`/api/dashboard?zoneId=${encodeURIComponent(zoneId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.zoneHistory || [];
      }
    } catch (e) {
      console.error(`Error fetching history for zone ${zoneId}:`, e);
    }
    return [];
  };

  // Refresh all selected zones
  const refreshSelectedZones = useCallback(async () => {
    if (selectedZones.size === 0 || isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Refresh zone list first
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const dashboardData = await res.json();
        setAllZones(dashboardData.allZones || []);
        
        // Update histories for selected zones in parallel
        const newHistories: Record<string, ZoneHistory[]> = { ...zoneHistories };
        await Promise.all(Array.from(selectedZones).map(async (zoneId) => {
          const history = await fetchZoneHistory(zoneId);
          newHistories[zoneId] = history;
        }));
        setZoneHistories(newHistories);
        
        // If current zone is selected, update its history
        if (currentZone && selectedZones.has(currentZone.id)) {
          setZoneHistory(newHistories[currentZone.id] || []);
        }
      }
    } catch (e) {
      console.error('Error refreshing zones:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedZones, isRefreshing, currentZone, zoneHistories]);

  // Auto-update every 5 seconds
  useEffect(() => {
    if (selectedZones.size === 0) return;
    
    refreshSelectedZones(); // Initial refresh
    
    autoUpdateIntervalRef.current = setInterval(() => {
      refreshSelectedZones();
    }, 5000); // 5 seconds
    
    return () => {
      if (autoUpdateIntervalRef.current) {
        clearInterval(autoUpdateIntervalRef.current);
      }
    };
  }, [selectedZones, refreshSelectedZones]); // Re-run when selected zones change

  // Filter data based on time range
  const filteredHistory = useMemo(() => {
    if (timeFilter === 'all') return zoneHistory;
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeFilter) {
      case '24h':
        startDate = subDays(now, 1);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    return zoneHistory.filter(change => 
      isWithinInterval(new Date(change.checked_at), { start: startDate, end: now })
    );
  }, [zoneHistory, timeFilter]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const changes = filteredHistory.filter(change => change.is_change);
    
    return changes.map(change => ({
      date: format(new Date(change.checked_at), 'MMM dd'),
      datetime: change.checked_at,
      serial: change.soa_serial,
      fullDate: formatDate(change.checked_at),
      changeDetails: change.change_details
    }));
  }, [filteredHistory]);
  
  // Toggle zone selection
  const toggleZoneSelection = async (zoneId: string) => {
    const newSelected = new Set(selectedZones);
    if (newSelected.has(zoneId)) {
      newSelected.delete(zoneId);
      // Remove history if unselected
      const newHistories = { ...zoneHistories };
      delete newHistories[zoneId];
      setZoneHistories(newHistories);
    } else {
      newSelected.add(zoneId);
      // Fetch history for newly selected zone
      const history = await fetchZoneHistory(zoneId);
      setZoneHistories({ ...zoneHistories, [zoneId]: history });
    }
    setSelectedZones(newSelected);
  };

  const removeZone = async (zoneId: string) => {
    const zone = allZones.find(z => z.id === zoneId);
    const name = zone?.zone_name || 'this zone';
    if (!window.confirm(`Are you sure you want to remove ${name} from monitoring?`)) {
      return;
    }
    setRemovingZone(zoneId);
    try {
      const response = await fetch("/api/remove-zone", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: data.user.id,
          zoneId: zoneId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to remove zone");
      }

      // Show success message
      setRemovedZoneName(result.zoneName);
      setTimeout(() => setRemovedZoneName(null), 3000);

      // Update local state to reflect removal immediately
      const remaining = allZones.filter(z => z.id !== zoneId);
      setAllZones(remaining);
      if (currentZone && currentZone.id === zoneId) {
        if (remaining.length > 0) {
          await selectZone(remaining[0].id);
        } else {
          setCurrentZone(null);
          setZoneHistory([]);
        }
      }

      if (onZoneRemoved) onZoneRemoved(zoneId);
    } catch (error) {
      console.error("Error removing zone:", error);
      alert(error instanceof Error ? error.message : "Failed to remove zone");
    } finally {
      setRemovingZone(null);
    }
  };

  const isPro = data.user.subscription_tier === 'pro';

  // All options; Pro unlocks 30s, 15s, 1s. Free only 60s.
  const allCadences = [60, 30, 15, 1];
  const selectableCadences = isPro ? allCadences : [60];

  const formatCadence = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${seconds / 60}m`;
  };

  const updateCadence = async (newCadence: number) => {
    if (!currentZone) return;
    if (newCadence === currentCadence) return;
    
    setUpdatingCadence(true);
    try {
      const response = await fetch("/api/update-zone-cadence", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.user.email,
          zoneId: currentZone.id,
          checkCadenceSeconds: newCadence,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update cadence");
      }

      setCurrentCadence(newCadence);
    } catch (error) {
      console.error("Error updating cadence:", error);
      alert(error instanceof Error ? error.message : "Failed to update cadence");
    } finally {
      setUpdatingCadence(false);
    }
  };

  const signOut = async () => {
    const supabase = createBrowserSupabaseClient();
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  };

  const selectZone = async (zoneId: string) => {
    setIsSelectingZone(true);
    try {
      const res = await fetch(`/api/dashboard?zoneId=${encodeURIComponent(zoneId)}`);
      if (res.ok) {
        const next = await res.json();
        setCurrentZone(next.currentZone || null);
        setZoneHistory(next.zoneHistory || []);
        setAllZones(next.allZones || []);
        setCurrentCadence(next.currentZone?.check_cadence_seconds || 60);
        // Auto-select zone when viewing
        if (next.currentZone) {
          setSelectedZones(new Set([zoneId]));
          setZoneHistories({ [zoneId]: next.zoneHistory || [] });
        }
      } else {
        // If dashboard returns non-OK (shouldn't after API change), fallback to empty state
        setCurrentZone(null);
        setZoneHistory([]);
        setAllZones([]);
      }
    } catch {}
    finally {
      setIsSelectingZone(false);
    }
  };

  const addZone = async () => {
    if (!newZone.trim()) return;
    setIsAddingZone(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.user.email, dnsZone: newZone.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to add zone");
      }
      setNewZone("");
      setShowAddModal(false);
      // Refresh dashboard to include new zone
      await selectZone(result.zoneId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add zone");
    } finally {
      setIsAddingZone(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Success Message */}
      {removedZoneName && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Successfully removed {removedZoneName} from monitoring.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DNS Monitoring Dashboard</h1>
          <p className="text-gray-600">Welcome back, {data.user.email}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isPro ? "default" : "secondary"} className="flex items-center space-x-1">
            {isPro ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
            <span>{isPro ? 'Pro' : 'Free'}</span>
          </Badge>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>

      {/* Subscription Info */}
      {!isPro && (
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            You're on the free plan (2 DNS zones). 
            <Link href="/upgrade">
              <Button variant="link" className="p-0 h-auto ml-1">
                Upgrade to Pro for unlimited monitoring
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Consolidated Zones Card (list + current + add) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Zones</CardTitle>
              <CardDescription>Manage, view, and add monitored DNS zones</CardDescription>
            </div>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allZones.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No zones yet. Add your first DNS zone to begin monitoring.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <div className="grid grid-cols-12 bg-gray-50 text-xs font-semibold text-gray-600 px-4 py-2">
                <div className="col-span-1">Select</div>
                <div className="col-span-3">Zone</div>
                <div className="col-span-2">Created</div>
                <div className="col-span-3">Last checked</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              <div className="divide-y">
                {allZones.map((zone) => {
                  const isCurrent = currentZone ? (zone.id === currentZone.id) : false;
                  const isSelected = selectedZones.has(zone.id);
                  return (
                    <div key={zone.id} className={`grid grid-cols-12 items-center px-4 py-3 ${isCurrent ? 'bg-blue-50/50' : ''} ${isSelected ? 'bg-green-50/30' : ''}`}>
                      <div className="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleZoneSelection(zone.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="font-medium flex items-center gap-2">
                          {zone.zone_name}
                          {isCurrent && <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">current</span>}
                        </div>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600">{formatDate(zone.created_at)}</div>
                      <div className="col-span-3 text-sm text-gray-600">{zone.last_checked ? formatDate(zone.last_checked) : '—'}</div>
                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => selectZone(zone.id)} disabled={isSelectingZone && isCurrent}>
                          {isSelectingZone && isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'View'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeZone(zone.id)}
                          disabled={removingZone === zone.id}
                        >
                          {removingZone === zone.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Zones Data Cards */}
          {selectedZones.size > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Selected Zones Data</h3>
                <Button variant="outline" size="sm" onClick={refreshSelectedZones} disabled={isRefreshing}>
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(selectedZones).map(zoneId => {
                  const zone = allZones.find(z => z.id === zoneId);
                  if (!zone) return null;
                  const history = zoneHistories[zoneId] || [];
                  const changes = history.filter(h => h.is_change);
                  return (
                    <Card key={zoneId}>
                      <CardHeader>
                        <CardTitle className="text-base">{zone.zone_name}</CardTitle>
                        <CardDescription>
                          {changes.length} change{changes.length !== 1 ? 's' : ''} detected
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Checked:</span>
                            <span className="font-medium">{zone.last_checked ? formatDate(zone.last_checked) : 'Never'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">{formatDate(zone.created_at)}</span>
                          </div>
                          {changes.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs font-semibold text-gray-600 mb-2">Recent Changes:</div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {changes.slice(0, 3).map((change, idx) => (
                                  <div key={change.id || idx} className="text-xs">
                                    <span className="font-mono text-orange-600">{change.soa_serial}</span>
                                    <span className="text-gray-500 ml-2">{formatDateShort(change.checked_at)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current zone controls (frequency) */}
          {allZones.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Check Frequency (applies to all zones)</span>
                </div>
                {updatingCadence && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {allCadences.map((cadence) => {
                    const isSelectable = selectableCadences.includes(cadence);
                    const isActive = currentCadence === cadence;
                    const isProOnly = !isSelectable;
                    return (
                      <div key={cadence} className="relative group">
                        <button
                          onClick={() => {
                            if (isSelectable && !updatingCadence) {
                              updateCadence(cadence);
                            }
                          }}
                          disabled={updatingCadence || (!isSelectable)}
                          className={
                            `relative h-10 w-16 rounded-md border transition-all flex items-center justify-center text-sm font-medium ` +
                            (isSelectable
                              ? (isActive 
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700' 
                                  : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900 hover:border-gray-400')
                              : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-75 hover:bg-gray-100')
                          }
                          aria-label={`Set cadence to ${formatCadence(cadence)}${isProOnly ? ' (Pro only)' : ''}`}
                        >
                          {isProOnly && (
                            <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-0.5 shadow-sm z-10">
                              <Crown className="h-3 w-3 text-white" />
                            </div>
                          )}
                          <span>{formatCadence(cadence)}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {!isPro && (
                  <Link href="/upgrade">
                    <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm">
                      <Crown className="h-3.5 w-3.5 mr-1.5" />
                      Upgrade Now
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Zone Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isAddingZone && setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Add DNS Zone</CardTitle>
                <CardDescription>Enter a domain to start monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <input
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="example.com"
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    disabled={isAddingZone}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isAddingZone}>Cancel</Button>
                    <Button onClick={addZone} className="bg-green-600 hover:bg-green-700" disabled={isAddingZone}>
                      {isAddingZone ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Zone'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* All Zones card removed (merged into consolidated card above) */}

      {/* Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Choose how you want to be alerted</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-gray-500">{channelConfig.email.address}</div>
                </div>
              </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="border border-gray-200" onClick={() => setShowEditChannel('email')} aria-label="Edit Email">
                <Pencil className="h-4 w-4" />
              </Button>
                <button onClick={() => {
                  const nextEnabled = { ...channelEnabled, email: !channelEnabled.email };
                  setChannelEnabled(nextEnabled);
                  persistPreferences({
                    email_enabled: nextEnabled.email,
                    email_address: channelConfig.email.address,
                    slack: { enabled: nextEnabled.slack, webhookUrl: channelConfig.slack.webhookUrl },
                    teams: { enabled: nextEnabled.teams, webhookUrl: channelConfig.teams.webhookUrl },
                    webhook: { enabled: nextEnabled.webhook, endpoint: channelConfig.webhook.endpoint, secret: channelConfig.webhook.secret },
                    frequency: 'immediate',
                  });
                }} aria-label={channelEnabled.email ? 'Disable' : 'Enable'} className={`border border-gray-200 h-6 w-10 rounded-full relative transition-colors ${channelEnabled.email ? 'bg-green-500' : 'bg-red-500'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform pointer-events-none ${channelEnabled.email ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Slack */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <Slack className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium">Slack</div>
                  <div className="text-sm text-gray-500 truncate max-w-[240px]">{channelConfig.slack.webhookUrl || 'Not configured'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="border border-gray-200" onClick={() => { setShowEditChannel('slack'); setSlackStep(1); }} aria-label="Edit Slack">
                  <Pencil className="h-4 w-4" />
                </Button>
                <button onClick={() => {
                  const nextEnabled = { ...channelEnabled, slack: !channelEnabled.slack };
                  setChannelEnabled(nextEnabled);
                  persistPreferences({
                    email_enabled: nextEnabled.email,
                    email_address: channelConfig.email.address,
                    slack: { enabled: nextEnabled.slack, webhookUrl: channelConfig.slack.webhookUrl },
                    teams: { enabled: nextEnabled.teams, webhookUrl: channelConfig.teams.webhookUrl },
                    webhook: { enabled: nextEnabled.webhook, endpoint: channelConfig.webhook.endpoint, secret: channelConfig.webhook.secret },
                    frequency: 'immediate',
                  });
                }} aria-label={channelEnabled.slack ? 'Disable' : 'Enable'} className={`border border-gray-200 h-6 w-10 rounded-full relative transition-colors ${channelEnabled.slack ? 'bg-green-500' : 'bg-red-500'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform pointer-events-none ${channelEnabled.slack ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Microsoft Teams */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <Slack className="h-5 w-5 text-indigo-600" />
                <div>
                  <div className="font-medium">Microsoft Teams</div>
                  <div className="text-sm text-gray-500 truncate max-w-[240px]">{channelConfig.teams.webhookUrl || 'Not configured'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="border border-gray-200" onClick={() => { setShowEditChannel('teams'); setTeamsStep(1); }} aria-label="Edit Teams">
                  <Pencil className="h-4 w-4" />
                </Button>
                <button onClick={() => {
                  const nextEnabled = { ...channelEnabled, teams: !channelEnabled.teams };
                  setChannelEnabled(nextEnabled);
                  persistPreferences({
                    email_enabled: nextEnabled.email,
                    email_address: channelConfig.email.address,
                    slack: { enabled: nextEnabled.slack, webhookUrl: channelConfig.slack.webhookUrl },
                    teams: { enabled: nextEnabled.teams, webhookUrl: channelConfig.teams.webhookUrl },
                    webhook: { enabled: nextEnabled.webhook, endpoint: channelConfig.webhook.endpoint, secret: channelConfig.webhook.secret },
                    frequency: 'immediate',
                  });
                }} aria-label={channelEnabled.teams ? 'Disable' : 'Enable'} className={`border border-gray-200 h-6 w-10 rounded-full relative transition-colors ${channelEnabled.teams ? 'bg-green-500' : 'bg-red-500'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform pointer-events-none ${channelEnabled.teams ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Webhook */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <Webhook className="h-5 w-5 text-emerald-600" />
                <div>
                  <div className="font-medium">Webhook</div>
                  <div className="text-sm text-gray-500 truncate max-w-[240px]">{channelConfig.webhook.endpoint || 'Not configured'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="border border-gray-200" onClick={() => setShowEditChannel('webhook')} aria-label="Edit Webhook">
                  <Pencil className="h-4 w-4" />
                </Button>
                <button onClick={() => {
                  const nextEnabled = { ...channelEnabled, webhook: !channelEnabled.webhook };
                  setChannelEnabled(nextEnabled);
                  persistPreferences({
                    email_enabled: nextEnabled.email,
                    email_address: channelConfig.email.address,
                    slack: { enabled: nextEnabled.slack, webhookUrl: channelConfig.slack.webhookUrl },
                    teams: { enabled: nextEnabled.teams, webhookUrl: channelConfig.teams.webhookUrl },
                    webhook: { enabled: nextEnabled.webhook, endpoint: channelConfig.webhook.endpoint, secret: channelConfig.webhook.secret },
                    frequency: 'immediate',
                  });
                }} aria-label={channelEnabled.webhook ? 'Disable' : 'Enable'} className={`border border-gray-200 h-6 w-10 rounded-full relative transition-colors ${channelEnabled.webhook ? 'bg-green-500' : 'bg-red-500'}`}>
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform pointer-events-none ${channelEnabled.webhook ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DNS Changes Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>DNS Changes Over Time</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <div className="flex space-x-1">
                {(['24h', '7d', '30d', 'all'] as TimeFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    variant={timeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimeFilter(filter)}
                    className="text-xs"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <CardDescription>
            SOA serial changes detected in your DNS zone
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No changes detected in the selected time range</p>
              <p className="text-sm">We'll notify you when SOA records change</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium text-sm">{data.fullDate}</p>
                            <p className="text-sm text-gray-600">Serial: {data.serial}</p>
                            {data.changeDetails && (
                              <p className="text-xs text-gray-500 mt-1">{data.changeDetails}</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="serial" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Channel Modal */}
      {showEditChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditChannel(null)} />
          <div className="relative z-10 w-full max-w-md mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>{showEditChannel === 'webhook' ? 'Webhook' : showEditChannel === 'teams' ? 'Microsoft Teams' : showEditChannel === 'slack' ? 'Slack' : 'Email'}</CardTitle>
                <CardDescription>{showEditChannel === 'slack' ? 'Follow the steps to enable Slack notifications' : 'Configure delivery settings'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {channelSaveSuccess && (
                    <div className="p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">
                      {channelSaveSuccess}
                    </div>
                  )}
                  {showEditChannel === 'email' && (
                    <input className="w-full border rounded-md px-3 py-2" placeholder="you@example.com" value={channelConfig.email.address} onChange={(e) => setChannelConfig(v => ({...v, email: { address: e.target.value }}))} />
                  )}
                  {showEditChannel === 'slack' && (
                    <div className="space-y-4">
                      {slackStep === 1 && (
                        <div>
                          <div className="font-medium mb-1">Step 1: Create Slack App</div>
                          <p className="text-sm text-gray-600">Go to <strong>api.slack.com/apps</strong>. Click <strong>Create New App</strong> → <strong>From Scratch</strong>, name it (e.g., <em>DNSWatcher</em>) and pick your workspace.</p>
                        </div>
                      )}
                      {slackStep === 2 && (
                        <div>
                          <div className="font-medium mb-1">Step 2: Enable Incoming Webhooks</div>
                          <p className="text-sm text-gray-600">In your app settings, open <strong>Incoming Webhooks</strong> and toggle <em>Activate Incoming Webhooks</em> to <strong>On</strong>.</p>
                        </div>
                      )}
                      {slackStep === 3 && (
                        <div>
                          <div className="font-medium mb-1">Step 3: Add Webhook to a Channel</div>
                          <p className="text-sm text-gray-600">Click <strong>Add New Webhook to Workspace</strong>, choose the target channel for alerts, then click <strong>Allow</strong> to install.</p>
                        </div>
                      )}
                      {slackStep === 4 && (
                        <div>
                          <div className="font-medium mb-2">Step 4: Paste Webhook URL</div>
                          <p className="text-sm text-gray-600 mb-2">On the Incoming Webhooks page, scroll to the bottom to find your new webhook. Copy the <strong>Webhook URL</strong> and paste it below.</p>
                          <input className="w-full border rounded-md px-3 py-2" placeholder="https://hooks.slack.com/services/..." value={channelConfig.slack.webhookUrl} onChange={(e) => setChannelConfig(v => ({...v, slack: { webhookUrl: e.target.value }}))} />
                        </div>
                      )}
                    </div>
                  )}
                  {showEditChannel === 'teams' && (
                    <div className="space-y-4">
                      {teamsStep === 1 && (
                        <div>
                          <div className="font-medium mb-1">Step 1: Open Teams Channel</div>
                          <p className="text-sm text-gray-600">In Microsoft Teams, go to the channel where you want notifications and open <strong>Connectors</strong>.</p>
                        </div>
                      )}
                      {teamsStep === 2 && (
                        <div>
                          <div className="font-medium mb-1">Step 2: Add Incoming Webhook</div>
                          <p className="text-sm text-gray-600">Find <strong>Incoming Webhook</strong>, click <strong>Configure</strong>, and give it a name (e.g., "DNSWatcher").</p>
                        </div>
                      )}
                      {teamsStep === 3 && (
                        <div>
                          <div className="font-medium mb-1">Step 3: Create and Copy URL</div>
                          <p className="text-sm text-gray-600">Click <strong>Create</strong>, then copy the generated webhook URL.</p>
                        </div>
                      )}
                      {teamsStep === 4 && (
                        <div>
                          <div className="font-medium mb-2">Step 4: Paste Webhook URL</div>
                          <input className="w-full border rounded-md px-3 py-2" placeholder="Microsoft Teams Webhook URL" value={channelConfig.teams.webhookUrl} onChange={(e) => setChannelConfig(v => ({...v, teams: { webhookUrl: e.target.value }}))} />
                        </div>
                      )}
                    </div>
                  )}
                  {showEditChannel === 'webhook' && (
                    <>
                      <input className="w-full border rounded-md px-3 py-2" placeholder="HTTPS endpoint" value={channelConfig.webhook.endpoint} onChange={(e) => setChannelConfig(v => ({...v, webhook: { ...v.webhook, endpoint: e.target.value }}))} />
                      <input className="w-full border rounded-md px-3 py-2" placeholder="Shared secret (optional)" value={channelConfig.webhook.secret} onChange={(e) => setChannelConfig(v => ({...v, webhook: { ...v.webhook, secret: e.target.value }}))} />
                    </>
                  )}
                  <div className="flex justify-between gap-2">
                    <div>
                      {showEditChannel === 'slack' && (
                        <span className="text-xs text-gray-500">Step {slackStep} of 4</span>
                      )}
                      {showEditChannel === 'teams' && (
                        <span className="text-xs text-gray-500">Step {teamsStep} of 4</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!channelSaveSuccess && (
                        <Button variant="outline" disabled={isSavingChannel} onClick={() => {
                          if (showEditChannel === 'slack' && slackStep > 1) { setSlackStep(s => s - 1); return; }
                          if (showEditChannel === 'teams' && teamsStep > 1) { setTeamsStep(s => s - 1); return; }
                          setShowEditChannel(null);
                        }}>{(showEditChannel === 'slack' && slackStep > 1) || (showEditChannel === 'teams' && teamsStep > 1) ? 'Back' : 'Cancel'}</Button>
                      )}
                      {channelSaveSuccess ? (
                        <Button onClick={() => { setShowEditChannel(null); setChannelSaveSuccess(null); setIsSavingChannel(false); }}>
                          Close
                        </Button>
                      ) : (
                      showEditChannel === 'slack' ? (
                        slackStep < 4 ? (
                          <Button onClick={() => setSlackStep(s => Math.min(4, s + 1))} disabled={isSavingChannel}>Next</Button>
                        ) : (
                          <Button onClick={async () => {
                            setIsSavingChannel(true);
                            try {
                              if (channelConfig.slack.webhookUrl) {
                                setChannelEnabled(v => ({ ...v, slack: true }));
                                await persistPreferences();
                                const resp = await fetch('/api/notifications/test', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ channel: 'slack', url: channelConfig.slack.webhookUrl })
                                });
                                const payload = await resp.json().catch(() => ({}));
                                if (!resp.ok) {
                                  setChannelSaveSuccess(`Slack test failed: ${payload?.message || 'Unknown error'}`);
                                } else {
                                  setChannelSaveSuccess('Slack webhook saved. Test notification sent successfully.');
                                }
                              }
                            } finally {
                              setIsSavingChannel(false);
                              setSlackStep(1);
                            }
                          }} disabled={isSavingChannel}>
                            {isSavingChannel ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                          </Button>
                        )
                      ) : showEditChannel === 'teams' ? (
                        teamsStep < 4 ? (
                          <Button onClick={() => setTeamsStep(s => Math.min(4, s + 1))} disabled={isSavingChannel}>Next</Button>
                        ) : (
                          <Button onClick={async () => {
                            setIsSavingChannel(true);
                            try {
                              if (channelConfig.teams.webhookUrl) {
                                setChannelEnabled(v => ({ ...v, teams: true }));
                                await persistPreferences();
                                const resp = await fetch('/api/notifications/test', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ channel: 'teams', url: channelConfig.teams.webhookUrl })
                                });
                                const payload = await resp.json().catch(() => ({}));
                                if (!resp.ok) {
                                  setChannelSaveSuccess(`Teams test failed: ${payload?.message || 'Unknown error'}`);
                                } else {
                                  setChannelSaveSuccess('Microsoft Teams webhook saved. Test notification sent successfully.');
                                }
                              }
                            } finally {
                              setIsSavingChannel(false);
                              setTeamsStep(1);
                            }
                          }} disabled={isSavingChannel}>
                            {isSavingChannel ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                          </Button>
                        )
                      ) : (
                        <Button onClick={async () => {
                          setIsSavingChannel(true);
                          try {
                            if (showEditChannel === 'webhook' && channelConfig.webhook.endpoint) {
                              setChannelEnabled(v => ({ ...v, webhook: true }));
                              await persistPreferences();
                              const resp = await fetch('/api/notifications/test', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ channel: 'webhook', url: channelConfig.webhook.endpoint })
                              });
                              const payload = await resp.json().catch(() => ({}));
                              if (!resp.ok) {
                                setChannelSaveSuccess(`Webhook test failed: ${payload?.message || 'Unknown error'}`);
                              } else {
                                setChannelSaveSuccess('Webhook endpoint saved. Test notification sent successfully.');
                              }
                            }
                          } finally {
                            setIsSavingChannel(false);
                          }
                        }} disabled={isSavingChannel}>
                          {isSavingChannel ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {/* Zone History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>SOA Change History</span>
          </CardTitle>
          <CardDescription>
            Recent changes detected in your DNS zone ({filteredHistory.filter(c => c.is_change).length} records)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.filter(c => c.is_change).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No changes detected in the selected time range</p>
              <p className="text-sm">We'll notify you when SOA records change</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.filter(c => c.is_change).map((change) => (
                <div key={change.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`h-5 w-5 mt-0.5 text-orange-500`}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">SOA Record Changed</div>
                        <div className="text-sm text-gray-600">
                          Serial: <span className="font-mono">{change.soa_serial}</span>
                        </div>
                        {change.change_details && (
                          <div className="text-sm text-gray-600 mt-1">
                            {change.change_details}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 flex-shrink-0 ml-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDateShort(change.checked_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm font-mono overflow-x-auto">
                    <div className="whitespace-pre-wrap break-all">{change.soa_record}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
