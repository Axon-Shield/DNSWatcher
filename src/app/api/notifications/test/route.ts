import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  channel: z.enum(["slack", "teams", "webhook"]),
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel, url } = schema.parse(body);

    let payload: any = {};
    let headers: Record<string, string> = { "Content-Type": "application/json" };

    if (channel === "slack") {
      payload = {
        text: "✅ DNSWatcher: Notification channel configured successfully!\nYou'll now receive alerts here when your DNS zones change.",
      };
    } else if (channel === "teams") {
      payload = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        summary: "DNSWatcher setup",
        themeColor: "2F80ED",
        title: "DNSWatcher: Notification channel configured",
        text: "✅ You'll now receive alerts here when your DNS zones change.",
      };
    } else {
      payload = {
        event: "dnswatcher_test",
        product: "DNSWatcher",
        message: "Notification channel configured successfully.",
        timestamp: new Date().toISOString(),
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
        { success: false, message: `Failed to send test notification (${res.status})`, details: text?.slice(0, 300) },
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


