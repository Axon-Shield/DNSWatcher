"use client";

import { useState } from "react";
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
  Loader2
} from "lucide-react";

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

export default function UserDashboard({ data, onZoneRemoved, onBack }: UserDashboardProps) {
  const [removingZone, setRemovingZone] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

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
    <div className="max-w-4xl mx-auto space-y-6">
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

      {/* Zone History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>SOA Change History</span>
          </CardTitle>
          <CardDescription>
            Recent changes detected in your DNS zone
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.zoneHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No changes detected yet</p>
              <p className="text-sm">We'll notify you when SOA records change</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.zoneHistory.map((change) => (
                <div key={change.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <div className="font-medium">SOA Record Changed</div>
                        <div className="text-sm text-gray-600">
                          Serial: {change.soa_serial}
                        </div>
                        {change.change_details && (
                          <div className="text-sm text-gray-600 mt-1">
                            {change.change_details}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(change.checked_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm font-mono">
                    {change.soa_record}
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
