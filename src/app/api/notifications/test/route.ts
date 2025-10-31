import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service";

const schema = z.object({
  channel: z.enum(["slack", "teams", "webhook"]),
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, url } = schema.parse(body);

    const supabaseServer = await createSupabaseServerClient();
    const supabase = createServiceClient();
    const { data: session } = await supabaseServer.auth.getUser();
    const email = session.user?.email;

    let zonesList: string[] = [];
    if (email) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();
      if (user?.id) {
        const { data: zones } = await supabase
          .from("dns_zones")
          .select("zone_name")
          .eq("user_id", user.id)
          .eq("is_active", true);
        zonesList = (zones || []).map((z: any) => z.zone_name);
      }
    }

    let payload: any = {};
    let headers: Record<string, string> = { "Content-Type": "application/json" };

    if (channel === "slack") {
      const text =
        "✅ DNSWatcher: Notification channel configured successfully!\n" +
        "You'll now receive alerts here when your DNS zones change." +
        (zonesList.length ? `\nMonitoring: ${zonesList.join(", ")}` : "");
      payload = { text };
    } else if (channel === "teams") {
      const text =
        "✅ You'll now receive alerts here when your DNS zones change." +
        (zonesList.length ? `\nMonitoring: ${zonesList.join(", ")}` : "");
      payload = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        summary: "DNSWatcher setup",
        themeColor: "2F80ED",
        title: "DNSWatcher: Notification channel configured",
        text,
      };
    } else {
      payload = {
        event: "dnswatcher_test",
        product: "DNSWatcher",
        message: "Notification channel configured successfully.",
        timestamp: new Date().toISOString(),
        zones: zonesList,
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          message: `Failed to send test notification (${res.status})`,
          details: text?.slice(0, 300),
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

