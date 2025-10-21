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
2. **Baseline Creation**: Fetch current SOA record as baseline
3. **Scheduled Checks**: Every 5 minutes, check SOA serial number
4. **Change Detection**: Compare current serial with previous check
5. **Notification**: Send email alert if serial number changed
6. **Historical Logging**: Record all checks for audit trail

## DNS Query Implementation
### Google DNS API
- **Endpoint**: `https://dns.google/resolve?name={zone}&type=SOA`
- **Advantages**: Reliable, fast, no rate limiting issues
- **Response Format**: JSON with Answer array
- **Parsing**: Split SOA data string into components

### Alternative: dns2 Library
- **Package**: `dns2` for Node.js DNS queries
- **Usage**: `new dns().query(zoneName, "SOA")`
- **Considerations**: May have rate limiting, requires proper error handling

## Change Detection Logic
```typescript
// Compare serial numbers
const isChange = !lastCheck || lastCheck.soa_serial !== currentSerial;

// Record the check
await supabase.from('zone_checks').insert({
  zone_id: zone.id,
  soa_serial: currentSerial,
  soa_record: JSON.stringify(soaRecord),
  checked_at: new Date().toISOString(),
  is_change: isChange,
  change_details: isChange ? 'SOA serial number changed' : null
});
```

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
- **Frequency**: Every 5 minutes
- **Implementation**: pg_cron job in Supabase
- **Reliability**: Edge Functions for serverless execution
- **Scaling**: Automatic scaling with Supabase

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

## Testing
- **Unit Tests**: DNS query functions
- **Integration Tests**: End-to-end monitoring flow
- **Load Testing**: Multiple zones, high frequency
- **Error Testing**: Network failures, invalid responses
- **Security Testing**: Input validation, rate limiting