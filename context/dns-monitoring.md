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
4. **Scheduled Checks**: Every 1 minute for Free tier; Pro supports higher frequency (30s/15s/1s)
5. **Change Detection**: Compare current serial with previous check
6. **Email Notification**: Send email alert via Resend if serial number changed
7. **Historical Logging**: Record all checks for audit trail
8. **Zone Management**: Users can remove and re-enable zones

## DNS Query Implementation
### Google DNS API
- **Endpoint**: `https://dns.google/resolve?name={zone}&type=SOA`
- **Advantages**: Reliable, fast, no rate limiting issues
- **Response Format**: JSON with Answer and Authority arrays
- **Parsing**: Split SOA data string into components
- **Subdomain Support**: Checks both Answer (direct SOA) and Authority (inherited SOA) sections
- **Implementation**: Handles subdomains that inherit SOA from parent domain

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
- **Frequency**: Free tier default: every 60 seconds; Pro: configurable (60s/30s/15s/1s)
- **Implementation**: pg_cron job calling Supabase Edge Function
- **Cron Job**: `SELECT net.http_post(url := 'https://ipdbzqiypnvkgpgnsyva.supabase.co/functions/v1/dns-monitor', ...)`
- **Authentication**: Uses anon key for Edge Function calls
- **Reliability**: Supabase Edge Functions with automatic scaling
- **Email Service**: Resend API integration
- **Sender**: noreply@dnswatcher.axonshield.com
- **Smart Filtering**: Intelligent change detection prevents notification spam
- **Status**: ✅ **FULLY OPERATIONAL** - Smart high-frequency monitoring with spam prevention

## Notification Triggers
- **SOA Serial Change**: Primary trigger for notifications
- **Zone Errors**: DNS query failures
- **System Alerts**: Monitoring system issues
- **User Preferences**: Respect notification settings

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
- **Schedule**: ✅ Running every minute (`*/1 * * * *`)
- **Edge Function Calls**: ✅ Successful HTTP POST requests
- **Authentication**: ✅ Using anon key for Edge Function access
- **DNS Queries**: ✅ Real-time Google DNS over HTTPS queries
- **Subdomain Support**: ✅ Handles Authority section for subdomains

## Testing
- **Unit Tests**: DNS query functions
- **Integration Tests**: End-to-end monitoring flow
- **Load Testing**: Multiple zones, high frequency
- **Error Testing**: Network failures, invalid responses
- **Security Testing**: Input validation, rate limiting
- **Production Testing**: ✅ **VERIFIED** - Real SOA changes detected and emails sent