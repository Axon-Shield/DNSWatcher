// Database type definitions for Supabase

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  notification_preferences: {
    email_enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

export interface DNSZone {
  id: string;
  user_id: string;
  zone_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_checked: string | null;
  last_soa_serial: number | null;
}

export interface ZoneCheck {
  id: string;
  zone_id: string;
  soa_serial: number;
  soa_record: string;
  checked_at: string;
  is_change: boolean;
  change_details: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  zone_id: string;
  notification_type: 'soa_change' | 'zone_error' | 'system_alert';
  title: string;
  message: string;
  sent_at: string;
  email_sent: boolean;
  email_delivery_status: 'pending' | 'sent' | 'failed' | null;
}