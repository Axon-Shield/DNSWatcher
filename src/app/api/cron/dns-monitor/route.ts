import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting DNS monitoring via API route...');

    // Get all active DNS zones
    const supabase = createServiceClient();
    const { data: zones, error } = await supabase
      .from('dns_zones')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching active zones:', error);
      return NextResponse.json({ message: 'Failed to fetch zones' }, { status: 500 });
    }

    if (!zones || zones.length === 0) {
      console.log('No active zones to monitor');
      return NextResponse.json({ message: 'No active zones to monitor' }, { status: 200 });
    }

    console.log(`Checking ${zones.length} active DNS zones...`);

    // Check each zone
    for (const zone of zones) {
      await checkZone(zone, supabase);
      // Small delay between checks to avoid overwhelming DNS servers
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('DNS monitoring check completed');

    return NextResponse.json({
      message: 'DNS monitoring task completed successfully',
      zonesChecked: zones.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('DNS monitoring API error:', error);
    return NextResponse.json({
      message: 'DNS monitoring task failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function checkZone(zone: any, supabase: any) {
  try {
    console.log(`Checking zone: ${zone.zone_name}`);
    
    // Query DNS for SOA record
    const soaRecord = await querySOARecord(zone.zone_name);
    
    if (!soaRecord) {
      console.error(`No SOA record found for zone: ${zone.zone_name}`);
      await recordZoneError(zone, 'No SOA record found', supabase);
      return;
    }
    
    // Get the last check for this zone
    const { data: lastCheck } = await supabase
      .from('zone_checks')
      .select('*')
      .eq('zone_id', zone.id)
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();
    
    const isChange = lastCheck ? lastCheck.soa_serial !== soaRecord.data.serial : false;
    const changeDetails = isChange && lastCheck ? 
      `Serial changed from ${lastCheck.soa_serial} to ${soaRecord.data.serial}` : 
      null;
    
    // Record this check with enhanced data
    const { error: checkError } = await supabase
      .from('zone_checks')
      .insert({
        zone_id: zone.id,
        soa_serial: soaRecord.data.serial,
        soa_record: JSON.stringify(soaRecord.data),
        checked_at: new Date().toISOString(),
        is_change: isChange,
        previous_soa_data: lastCheck ? JSON.stringify(lastCheck.soa_record) : null,
        change_details: changeDetails
      });
    
    if (checkError) {
      console.error('Error recording zone check:', checkError);
      return;
    }
    
    // Update zone's last_checked timestamp
    await supabase
      .from('dns_zones')
      .update({
        last_checked: new Date().toISOString()
      })
      .eq('id', zone.id);
    
    // If there's a change, send notification
    if (isChange && lastCheck) {
      await sendSOAChangeNotification(zone, lastCheck, soaRecord, supabase);
    }
    
    console.log(`Zone ${zone.zone_name} checked successfully. SOA serial: ${soaRecord.data.serial}`);
  } catch (error) {
    console.error(`Error checking zone ${zone.zone_name}:`, error);
    await recordZoneError(zone, error instanceof Error ? error.message : 'Unknown error', supabase);
  }
}

async function querySOARecord(zoneName: string) {
  try {
    // Use Google DNS over HTTPS for reliable DNS queries
    const response = await fetch(`https://dns.google/resolve?name=${zoneName}&type=SOA`);
    const data = await response.json();
    
    if (data.Answer && data.Answer.length > 0) {
      const answer = data.Answer[0];
      const parts = answer.data.split(' ');
      
      return {
        name: answer.name,
        type: 'SOA',
        class: 'IN',
        ttl: answer.TTL,
        data: {
          primary: parts[0],
          admin: parts[1],
          serial: parseInt(parts[2]),
          refresh: parseInt(parts[3]),
          retry: parseInt(parts[4]),
          expire: parseInt(parts[5]),
          minimum: parseInt(parts[6])
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error(`DNS query error for ${zoneName}:`, error);
    return null;
  }
}

async function sendSOAChangeNotification(zone: any, lastCheck: any, newSOA: any, supabase: any) {
  try {
    // Get user email and preferences
    const { data: user } = await supabase
      .from('users')
      .select('email, notification_preferences')
      .eq('id', zone.user_id)
      .single();
    
    if (!user) {
      console.error(`User not found for zone ${zone.zone_name}`);
      return;
    }
    
    // Check if user has email notifications enabled
    const preferences = user.notification_preferences || {};
    if (preferences.email_enabled === false) {
      console.log(`Email notifications disabled for user ${user.email}`);
      return;
    }
    
    const subject = `🚨 DNS Security Alert - ${zone.zone_name}`;
    const message = `DNS Security Alert: SOA record changed for ${zone.zone_name}\n\n` +
      `Previous serial: ${lastCheck.soa_serial}\n` +
      `New serial: ${newSOA.data.serial}\n` +
      `Primary nameserver: ${newSOA.data.primary}\n` +
      `Admin email: ${newSOA.data.admin}\n` +
      `TTL: ${newSOA.ttl} seconds\n\n` +
      `This could indicate unauthorized changes to your DNS zone. Please verify this change was intentional.\n\n` +
      `Time: ${new Date().toLocaleString()}\n` +
      `Zone: ${zone.zone_name}`;
    
    const htmlMessage = `
      <h2>🚨 DNS Security Alert</h2>
      <p><strong>Zone:</strong> ${zone.zone_name}</p>
      <p><strong>SOA Record Changed</strong></p>
      <table border="1" style="border-collapse: collapse; margin: 20px 0;">
        <tr><td><strong>Previous Serial:</strong></td><td>${lastCheck.soa_serial}</td></tr>
        <tr><td><strong>New Serial:</strong></td><td>${newSOA.data.serial}</td></tr>
        <tr><td><strong>Primary Nameserver:</strong></td><td>${newSOA.data.primary}</td></tr>
        <tr><td><strong>Admin Email:</strong></td><td>${newSOA.data.admin}</td></tr>
        <tr><td><strong>TTL:</strong></td><td>${newSOA.ttl} seconds</td></tr>
      </table>
      <p><strong>⚠️ This could indicate unauthorized changes to your DNS zone. Please verify this change was intentional.</strong></p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <hr>
      <p><em>This alert was sent by DNSWatcher - DNS Security Monitoring</em></p>
    `;
    
    // Record notification
    await supabase
      .from('notifications')
      .insert({
        zone_id: zone.id,
        user_id: zone.user_id,
        message: message,
        notification_type: 'soa_change',
        sent_at: new Date().toISOString()
      });
    
    // Send email notification via Edge Function
    await sendEmail(user.email, subject, message, htmlMessage);
    
    console.log(`SOA change notification sent for zone: ${zone.zone_name}`);
  } catch (error) {
    console.error(`Error sending SOA change notification for ${zone.zone_name}:`, error);
  }
}

async function recordZoneError(zone: any, errorMessage: string, supabase: any) {
  try {
    await supabase
      .from('notifications')
      .insert({
        zone_id: zone.id,
        user_id: zone.user_id,
        message: `Error monitoring zone ${zone.zone_name}: ${errorMessage}`,
        notification_type: 'zone_error',
        sent_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error recording zone error:', error);
  }
}

async function sendEmail(to: string, subject: string, text: string, html: string) {
  try {
    // Use Supabase Edge Function to send email
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        html
      })
    });
    
    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
    } else {
      console.log(`Email sent successfully to ${to}`);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}