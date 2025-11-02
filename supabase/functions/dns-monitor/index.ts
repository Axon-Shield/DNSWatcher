import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = Deno.env.get("APP_URL") || "https://dnswatcher.axonshield.com";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase environment variables");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  }
});

function parseSoaData(data: string) {
  const parts = String(data).split(" ");
  if (parts.length < 7) return null;
  return {
    primary: parts[0],
    admin: parts[1],
    serial: parseInt(parts[2], 10),
    refresh: parseInt(parts[3], 10),
    retry: parseInt(parts[4], 10),
    expire: parseInt(parts[5], 10),
    minimum: parseInt(parts[6], 10)
  };
}

async function queryNSRecords(zone: string) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${zone}&type=NS`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.Answer || data.Answer.length === 0) return null;
    return data.Answer.map((r: any) => r.data.replace(/\.$/, "")).filter((ns: string) => ns && !ns.includes(" "));
  } catch {
    return null;
  }
}

async function querySOAFromDoH(zone: string, resolver: string = 'google') {
  try {
    const url = resolver === 'google' 
      ? `https://dns.google/resolve?name=${zone}&type=SOA`
      : resolver === 'cloudflare'
      ? `https://cloudflare-dns.com/dns-query?name=${zone}&type=SOA`
      : `https://dns.quad9.net/dns-query?name=${zone}&type=SOA`;
    const headers = resolver === 'google' ? {} : { 'Accept': 'application/dns-json' };
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Answer && data.Answer.length > 0) {
      const p = parseSoaData(data.Answer[0].data);
      if (p) return { soa: p, source: resolver };
    }
    if (data.Authority && data.Authority.length > 0) {
      const a = data.Authority.find((x: any) => x.type === 6) || data.Authority[0];
      const p = parseSoaData(a.data);
      if (p) return { soa: p, source: resolver };
    }
    return null;
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getAuthoritativeSOA(zone: string) {
  const nsRecords = await queryNSRecords(zone);
  const resolvers = ['google', 'cloudflare', 'quad9'];
  const queries = await Promise.all(resolvers.map((r) => querySOAFromDoH(zone, r)));
  const valid = queries.filter((r) => r !== null);
  if (valid.length === 0) return null;
  const serials = valid.map((r) => r.soa.serial);
  const counts = new Map<number, number>();
  for (const s of serials) counts.set(s, (counts.get(s) || 0) + 1);
  let bestSerial = serials[0], bestCount = 0;
  for (const [s, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      bestSerial = s;
    }
  }
  const majority = Math.ceil(valid.length / 2);
  if (bestCount < majority) {
    console.warn(`dns-monitor: Insufficient consensus for ${zone}, samples: ${serials.join(',')}`);
    return null;
  }
  const chosen = valid.find((r) => r.soa.serial === bestSerial) || valid[0];
  const sources = valid.filter((r) => r.soa.serial === bestSerial).map((r) => r.source);
  return {
    soa: chosen.soa,
    serial: bestSerial,
    votes: bestCount,
    total: valid.length,
    nameservers: nsRecords || [],
    sources,
    samples: serials
  };
}

async function notifyAll(userId: string, zoneName: string, oldSerial: number | null, newSerial: number, soa: any) {
  try {
    const { data: user } = await supabase.from("users").select("notification_preferences, email").eq("id", userId).single();
    const prefs = user?.notification_preferences || {};
    const ts = new Date().toISOString();
    const loginUrl = `${APP_URL}/?login=true`;
    const title = `🚨 DNS Change Detected: ${zoneName}`;
    const lines = [
      `Zone: ${zoneName}`,
      oldSerial ? `Previous Serial: ${oldSerial}` : "Previous Serial: Not available",
      `New Serial: ${newSerial}`,
      `Primary Nameserver: ${soa.primary}`,
      `Admin Email: ${soa.admin}`,
      `Refresh: ${soa.refresh}s | Retry: ${soa.retry}s | Expire: ${soa.expire}s`,
      `Detected At: ${new Date(ts).toLocaleString('en-US', { timeZoneName: 'short' })}`,
      `\n🔗 View full details: ${loginUrl}`
    ];
    const text = `${title}\n\n${lines.join('\n')}`;
    if (prefs.slack?.enabled && prefs.slack.webhookUrl) {
      await fetch(prefs.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
    }
    if (prefs.teams?.enabled && prefs.teams.webhookUrl) {
      await fetch(prefs.teams.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "@type": "MessageCard",
          "@context": "https://schema.org/extensions",
          summary: title,
          themeColor: "FF0000",
          title,
          text,
          potentialAction: [{
            "@type": "OpenUri",
            name: "View in DNSWatcher",
            targets: [{ os: "default", uri: loginUrl }]
          }]
        })
      });
    }
    if (prefs.webhook?.enabled && prefs.webhook.endpoint) {
      await fetch(prefs.webhook.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'dnswatcher_change',
          zone: zoneName,
          old_serial: oldSerial,
          new_serial: newSerial,
          soa,
          occurred_at: ts,
          login_url: loginUrl
        })
      });
    }
  } catch {}
}

Deno.serve(async (_req) => {
  const now = new Date();
  const nowIso = now.toISOString();
  const results: any[] = [];

  try {
    const { data: zones } = await supabase
      .from("dns_zones")
      .select("id,user_id,zone_name,last_checked,last_soa_serial,check_cadence_seconds,next_check_at")
      .eq("is_active", true)
      .or(`next_check_at.is.null,next_check_at.lte.${nowIso}`);

    if (!zones || zones.length === 0) {
      return new Response(JSON.stringify({
        message: 'DNS monitoring completed',
        results: [],
        note: 'No zones due for checking at this time'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    for (const zone of zones) {
      try {
        const cadenceSeconds = Math.min(Math.max(zone.check_cadence_seconds || 60, 1), 60);
        const jitterMs = Math.floor(Math.random() * 250);
        const nextCheckAt = new Date(now.getTime() + cadenceSeconds * 1000 + jitterMs).toISOString();
        
        await supabase.from('dns_zones').update({
          last_checked: nowIso,
          next_check_at: nextCheckAt
        }).eq('id', zone.id);

        const authSOA = await getAuthoritativeSOA(zone.zone_name);
        if (!authSOA) {
          results.push({ zone: zone.zone_name, error: 'Failed to get consensus from resolvers' });
          continue;
        }

        const { soa, serial, votes, total, nameservers, sources, samples } = authSOA;

        // Check if we've already notified for this serial in the last 15 minutes
        const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        const { data: recentChanges } = await supabase
          .from('zone_checks')
          .select('soa_serial')
          .eq('zone_id', zone.id)
          .eq('is_change', true)
          .gte('checked_at', fifteenMinutesAgo)
          .order('checked_at', { ascending: false })
          .limit(5);

        const alreadyNotifiedForThisSerial = recentChanges?.some((check: any) => check.soa_serial === serial);

        let prevSerial: number | null = null;
        if (zone.last_soa_serial !== null && zone.last_soa_serial !== undefined) {
          prevSerial = typeof zone.last_soa_serial === 'string' 
            ? parseInt(zone.last_soa_serial, 10) 
            : Number(zone.last_soa_serial);
          if (Number.isNaN(prevSerial)) prevSerial = null;
        }

        const isChange = prevSerial === null ? true : prevSerial !== serial;

        if (isChange && !alreadyNotifiedForThisSerial) {
          // Wait and confirm the change
          await wait(200);
          const confirm = await getAuthoritativeSOA(zone.zone_name);
          if (!confirm || confirm.serial !== serial) {
            console.warn(`dns-monitor: Change not confirmed for ${zone.zone_name}: first=${serial}, second=${confirm?.serial || 'null'}`);
            results.push({
              zone: zone.zone_name,
              note: 'Change not confirmed on second check',
              first: { serial, votes },
              second: confirm
            });
            // Still update last_soa_serial even if confirmation failed to prevent infinite loops
            await supabase.from('dns_zones').update({ last_soa_serial: serial }).eq('id', zone.id);
            continue;
          }

          const details = `Multi-resolver consensus: ${votes}/${total} agree (${sources.join(',')}); samples: ${samples.join(',')}${nameservers.length > 0 ? `; NS: ${nameservers.slice(0, 3).join(',')}` : ''}`;
          
          // Record the change
          await supabase.from('zone_checks').insert({
            zone_id: zone.id,
            soa_serial: serial,
            soa_record: JSON.stringify(soa),
            checked_at: nowIso,
            is_change: true,
            change_details: details
          });

          // Update last_soa_serial BEFORE sending notifications to prevent race conditions
          await supabase.from('dns_zones').update({ last_soa_serial: serial }).eq('id', zone.id);

          // Send notifications
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                zone_id: zone.id,
                change_type: 'soa_change',
                soa_record: soa,
                old_serial: prevSerial,
                new_serial: serial,
                zone_name: zone.zone_name
              }
            });
          } catch {}

          await notifyAll(zone.user_id, zone.zone_name, prevSerial, serial, soa);
        } else if (isChange && alreadyNotifiedForThisSerial) {
          // Change detected but we already notified for this serial - just log it, don't notify again
          const details = `Multi-resolver consensus: ${votes}/${total} agree (${sources.join(',')}); samples: ${samples.join(',')}${nameservers.length > 0 ? `; NS: ${nameservers.slice(0, 3).join(',')}` : ''}; duplicate notification suppressed`;
          await supabase.from('zone_checks').insert({
            zone_id: zone.id,
            soa_serial: serial,
            soa_record: JSON.stringify(soa),
            checked_at: nowIso,
            is_change: true,
            change_details: details
          });
          await supabase.from('dns_zones').update({ last_soa_serial: serial }).eq('id', zone.id);
          results.push({
            zone: zone.zone_name,
            serial,
            isChange: true,
            note: 'Change detected but already notified for this serial (deduplication)',
            votes,
            total,
            nameservers: nameservers?.slice(0, 3) || [],
            sources
          });
        } else {
          // No change detected - just update the serial
          await supabase.from('dns_zones').update({ last_soa_serial: serial }).eq('id', zone.id);
        }

        results.push({
          zone: zone.zone_name,
          serial,
          isChange,
          votes,
          total,
          nameservers: nameservers?.slice(0, 3) || [],
          sources
        });
      } catch (err: any) {
        results.push({ zone: zone.zone_name, error: err?.message || String(err) });
      }
    }

    return new Response(JSON.stringify({
      message: 'DNS monitoring completed',
      results,
      zonesChecked: zones.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      message: 'DNS monitoring failed',
      error: error?.message || String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

