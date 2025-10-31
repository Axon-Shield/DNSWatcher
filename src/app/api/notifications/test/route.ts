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
      headers: {
        ...headers,
        "User-Agent": "DNSWatcher/1.0 (+notifications-test)"
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          message: `Failed to send test notification (${res.status})`,
          details: text?.slice(0, 2000),
          hint:
            channel === "slack"
              ? "Verify the Slack Incoming Webhook URL is active and belongs to the intended workspace/channel. Ensure the app is not archived and that the webhook is not rotated."
              : channel === "teams"
              ? "Verify the Teams Incoming Webhook connector is enabled for the channel and the URL is valid."
              : undefined,
        },
        { status: 400 }
      );
    }

    const responseText = await res.text().catch(() => "");
    return NextResponse.json({ success: true, provider_response: responseText?.slice(0, 500) || "ok" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

