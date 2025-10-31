import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET() {
  const supabaseServer = await createSupabaseServerClient();
  const supabase = createServiceClient();
  const { data: session } = await supabaseServer.auth.getUser();
  const email = session.user?.email;
  if (!email) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  const { data: user, error } = await supabase.from("users").select("id, notification_preferences").eq("email", email).single();
  if (error || !user) return NextResponse.json({ message: "User not found" }, { status: 404 });
  return NextResponse.json({ preferences: user.notification_preferences || {} });
}

export async function PATCH(request: NextRequest) {
  const supabaseServer = await createSupabaseServerClient();
  const supabase = createServiceClient();
  const { data: session } = await supabaseServer.auth.getUser();
  const email = session.user?.email;
  if (!email) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { preferences } = body || {};
  if (!preferences || typeof preferences !== "object") {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }
  const { error } = await supabase.from("users").update({ notification_preferences: preferences }).eq("email", email);
  if (error) return NextResponse.json({ message: "Failed to update preferences" }, { status: 500 });
  return NextResponse.json({ success: true });
}


