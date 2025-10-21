import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Calling DNS monitoring Edge Function...");

    // Call the Supabase Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dns-monitor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      return NextResponse.json(
        { message: "Edge Function failed", error: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('DNS monitoring completed:', result);

    return NextResponse.json({
      message: "DNS monitoring completed successfully",
      result,
    });

  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Allow GET requests for testing
export async function GET() {
  try {
    console.log("Testing DNS monitoring Edge Function...");

    // Call the Supabase Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/dns-monitor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      return NextResponse.json(
        { message: "Edge Function failed", error: errorText },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('DNS monitoring test completed:', result);

    return NextResponse.json({
      message: "DNS monitoring test completed successfully",
      result,
    });

  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}