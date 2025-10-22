"use client";

import { useState, useMemo } from "react";
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
  TrendingUp
} from "lucide-react";
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
}

interface User {
  id: string;
  email: string;
  subscription_tier: string;
  max_zones: number;
}

interface DashboardData {
  user: User;
  currentZone: Zone;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDateShort = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, HH:mm');
  };

  // Filter data based on time range
  const filteredHistory = useMemo(() => {
    if (timeFilter === 'all') return data.zoneHistory;
    
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
    
    return data.zoneHistory.filter(change => 
      isWithinInterval(new Date(change.checked_at), { start: startDate, end: now })
    );
  }, [data.zoneHistory, timeFilter]);

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

  const removeZone = async (zoneId: string) => {
    setRemovingZone(zoneId);
    try {
      const response = await fetch("/api/remove-zone", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.user.email,
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

      if (onZoneRemoved) {
        onZoneRemoved(zoneId);
      }
    } catch (error) {
      console.error("Error removing zone:", error);
      alert(error instanceof Error ? error.message : "Failed to remove zone");
    } finally {
      setRemovingZone(null);
    }
  };

  const isPro = data.user.subscription_tier === 'pro';

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
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back to Home
            </Button>
          )}
        </div>
      </div>

      {/* Subscription Info */}
      {!isPro && (
        <Alert>
          <Crown className="h-4 w-4" />
          <AlertDescription>
            You're on the free plan (1 DNS zone). 
            <Button variant="link" className="p-0 h-auto ml-1">
              Upgrade to Pro for unlimited monitoring
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Zone Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Currently Monitoring: {data.currentZone.zone_name}</span>
          </CardTitle>
          <CardDescription>
            Zone created: {formatDate(data.currentZone.created_at)}
            {data.currentZone.last_checked && (
              <span> • Last checked: {formatDate(data.currentZone.last_checked)}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Active Monitoring</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => removeZone(data.currentZone.id)}
              disabled={removingZone === data.currentZone.id}
            >
              {removingZone === data.currentZone.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Zone
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Zones */}
      {data.allZones.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>All Your Zones</CardTitle>
            <CardDescription>
              Manage all your monitored DNS zones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.allZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{zone.zone_name}</div>
                    <div className="text-sm text-gray-500">
                      Created: {formatDate(zone.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Zone History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>SOA Change History</span>
          </CardTitle>
          <CardDescription>
            Recent changes detected in your DNS zone ({filteredHistory.length} records)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No changes detected in the selected time range</p>
              <p className="text-sm">We'll notify you when SOA records change</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((change) => (
                <div key={change.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`h-5 w-5 mt-0.5 ${change.is_change ? 'text-orange-500' : 'text-gray-400'}`}>
                        {change.is_change ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {change.is_change ? 'SOA Record Changed' : 'SOA Record Checked'}
                        </div>
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
