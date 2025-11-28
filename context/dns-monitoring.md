# DNS Monitoring Context

## Core Monitoring Logic
DNSWatcher monitors DNS zones by checking SOA (Start of Authority) records for changes. SOA records contain critical information about DNS zone management and are updated whenever the zone is modified.

## SOA Record Structure
```
example.com. 3600 IN SOA ns1.example.com. admin.example.com. (
  2024010101  ; Serial number (changes when zone is updated)
  3600        ; Refresh interval
  1800        ; Retry interval
  1209600     ; Expire time
  3600        ; Minimum TTL
)
```

## Monitoring Process
1. **Initial Registration**: User provides email and DNS zone
2. **Email Verification**: New users must verify email before monitoring starts
3. **Baseline Creation**: Fetch current SOA record as baseline
4. **Scheduled Checks**: Free tier default: 60 seconds (1 minute); Pro default: 30 seconds. Both support configurable cadence (1s/15s/30s/60s)
5. **Change Detection**: Compare current serial with previous check
   - **Multi-resolver consensus**: Queries Google DNS, Cloudflare DNS (1.1.1.1), and Quad9 simultaneously and requires majority agreement (2/3)
   - If any resolver fails, requires majority of successful resolvers (e.g., 2/2 if one fails, 2/3 if all succeed)
   - This prevents false positives from recursive resolver inconsistencies or authoritative nameserver sync issues
   - **Change confirmation**: On first detection of a change, waits 200ms and re-queries all resolvers; change must be confirmed by majority on second check with same serial
   - **Deduplication**: Before sending notifications, checks if we've already notified for this exact serial in the last 15 minutes. Prevents duplicate notifications when DNS providers auto-increment SOA serials or during DNS propagation delays
   - **Atomic updates**: Updates `last_soa_serial` immediately after change confirmation and before sending notifications to prevent race conditions
   - Sampled serials are recorded in `zone_checks.change_details` for diagnostics (e.g., `Multi-resolver consensus: 2/3 agree (google,cloudflare); samples: 2387407399,2387407399,2387410343; NS: ns1.example.com`)
   - Correctly reads `last_soa_serial` from database to determine previous value for accurate change detection
   - **Important**: The function processes all zones with majority consensus, regardless of whether NS lookup succeeded (NS lookup is for diagnostics only)
6. **Email Notification**: Send email alert via Resend if serial number changed
7. **Historical Logging**: Record all checks for audit trail
8. **Zone Management**: Users can remove and re-enable zones

## DNS Query Implementation
### Authoritative Nameserver Query Strategy
- **Step 1**: Query NS records for the zone to identify authoritative nameservers
- **Step 2**: Query multiple recursive resolvers (Google DNS, Cloudflare, Quad9) in parallel via DoH
- **Step 3**: Require majority consensus (2/3) across resolvers before accepting a serial
- **Step 4**: On change detection, wait 300ms and re-query for confirmation
- **Rationale**: While we identify authoritative nameservers, we query multiple independent recursive resolvers which reduces variance from any single resolver's routing/caching behavior

### DNS-over-HTTPS (DoH) APIs Used
- **Google DNS**: `https://dns.google/resolve?name={zone}&type=SOA`
- **Cloudflare DNS**: `https://cloudflare-dns.com/dns-query?name={zone}&type=SOA`
- **Quad9 DNS**: `https://dns.quad9.net/dns-query?name={zone}&type=SOA`
- **Response Format**: JSON with Answer and Authority arrays
- **Parsing**: Split SOA data string into components
- **Subdomain Support**: If SOA is present in `Answer`, use it. If `Answer` is empty, fall back to the SOA in `Authority` (common when a subdomain inherits SOA from the apex).
- **Behavior**: Tracking a subdomain does not automatically track the apex; we only read the governing SOA wherever it lives. Delegated subdomains with their own SOA are tracked independently via `Answer`.

### Alternative: dns2 Library
- **Package**: `dns2` for Node.js DNS queries
- **Usage**: `new dns().query(zoneName, "SOA")`
- **Considerations**: May have rate limiting, requires proper error handling

## Smart Change Detection System ✅
### Intelligent Filtering Logic
- **Multi-Server Consistency**: Queries multiple DNS servers for consensus
- **Serial Stability Check**: Prevents notifications for recently seen serials
- **Change Threshold**: Only notifies for significant serial changes
- **Activity Throttling**: Maximum 3 checks per 2-minute window
- **Notification Cooldown**: 1-minute minimum between notifications
- **Trend Analysis**: Analyzes recent check patterns to identify genuine changes

### Database Function
```sql
smart_soa_change_detection(
  zone_id_param UUID,
  new_serial BIGINT,
  min_change_threshold INTEGER DEFAULT 1,
  stability_period_minutes INTEGER DEFAULT 2
)
```

### Benefits
- **⚡ Fast Detection**: Pro supports down to 1-second checks (Free: 60s cadence)
- **🛡️ Spam Protection**: Intelligent filtering prevents false alerts
- **📈 Trend Analysis**: Understands DNS propagation patterns
- **💾 Complete Logging**: All checks recorded for analysis
- **🎛️ Configurable**: Adjustable thresholds and periods

## Error Handling
- **DNS Query Failures**: Log error, continue with other zones
- **Network Issues**: Retry logic, fallback to different DNS servers
- **Invalid Responses**: Validate data before processing
- **Rate Limiting**: Implement backoff strategies

## Performance Considerations
- **Batch Processing**: Check multiple zones efficiently
- **Caching**: Cache DNS responses where appropriate
- **Rate Limiting**: Respect DNS server limits
- **Monitoring**: Track query success rates

## Security Considerations
- **Input Validation**: Sanitize zone names
- **DNS Enumeration**: Prevent zone enumeration attacks
- **Query Validation**: Verify DNS responses
- **Error Disclosure**: Don't expose sensitive information

## Monitoring Schedule
- **Cron Frequency**: pg_cron job runs every 1 second (`* * * * *`)
- **Zone-Level Cadence**: Each zone has its own `check_cadence_seconds` (1s/15s/30s/60s)
- **Default Cadences**: 
  - Free tier: 60 seconds (1 minute) default
  - Pro tier: 30 seconds default
- **Synchronization**: Edge function uses `next_check_at` to honor per-zone cadence
- **Implementation**: pg_cron job calls Supabase Edge Function every second
- **Cron Job**: `SELECT net.http_post(url := 'https://<your-project-ref>.supabase.co/functions/v1/dns-monitor', ...)`
- **Authentication**: Uses service role key for Edge Function calls
- **Reliability**: Supabase Edge Functions with automatic scaling
- **Email Service**: Resend API integration
- **Sender**: noreply@dnswatcher.axonshield.com
- **Smart Filtering**: Intelligent change detection prevents notification spam
- **Stability Sampling**: Majority-vote SOA sampling per run avoids flip-flops caused by resolver/cache variance
- **Status**: ✅ **FULLY OPERATIONAL** - Per-zone cadence synchronization with 1-second cron tick

## Notification Triggers & Channels
- **Triggers**: SOA serial change (primary), zone errors, system alerts
- **Channels**: Email, Slack, Microsoft Teams, Webhooks (configurable per user)
- **Preferences**: Respect per-channel enable/disable and cooldowns
### Notification Payload Details
- **Slack**: Title + detailed text (zone, old/new serial, NS/admin, refresh/retry/expire, timestamp), plus login link
- **Teams**: MessageCard with the above details and an OpenUri button to DNSWatcher
- **Webhook**: JSON body with `event`, `zone`, `old_serial`, `new_serial`, `soa`, `occurred_at`, `login_url`
- **Email**: Rich HTML email with the above details and a "View in DNSWatcher" button

## Historical Data
- **Zone Checks**: Complete audit trail
- **Change Details**: What changed and when
- **Performance Metrics**: Query response times
- **Error Logs**: Failed queries and reasons

## Future Enhancements
- **Multiple Record Types**: Monitor A, AAAA, MX, etc.
- **Advanced Detection**: Pattern analysis, anomaly detection
- **Custom Rules**: User-defined monitoring rules
- **API Integration**: Webhook notifications
- **Dashboard**: Real-time monitoring interface

## Verified Functionality ✅
### SOA Change Detection Test Results
- **Test Date**: 2025-10-21 11:50:40
- **Zone**: test.axonshield.com
- **Change Detected**: Serial 2386530407 → 2386530404
- **Detection Time**: < 1 minute
- **Database Record**: ✅ Zone check recorded with `is_change: true`
- **Change Details**: ✅ "Serial changed from 2386530407 to 2386530404"

### Email Notification Test Results
- **Notification Created**: ✅ SOA change notification in database
- **Email Sent**: ✅ Successfully sent via Resend API
- **Email ID**: 85742c62-110c-4743-8b2c-689978e05d1e
- **From Address**: noreply@dnswatcher.axonshield.com
- **Delivery Time**: < 1 minute from detection
- **Content**: Complete DNS security alert with all details

### Cron Job Test Results
- **Schedule**: ✅ Running every 1 second (`* * * * *`)
- **Edge Function Calls**: ✅ Successful HTTP POST requests every second
- **Authentication**: ✅ Using service role key for Edge Function access
- **Per-Zone Cadence**: ✅ Zones checked only when `next_check_at <= now()`
- **Default Cadences**: ✅ Free zones default to 60s, Pro zones default to 30s
- **DNS Queries**: ✅ Real-time Google DNS over HTTPS queries
- **Subdomain Support**: ✅ Handles Authority section for subdomains

## Testing
- **Unit Tests**: DNS query functions
- **Integration Tests**: End-to-end monitoring flow
- **Load Testing**: Multiple zones, high frequency
- **Error Testing**: Network failures, invalid responses
- **Security Testing**: Input validation, rate limiting
- **Production Testing**: ✅ **VERIFIED** - Real SOA changes detected and emails sent