import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function fail(msg, code) {
  return Response.json({ error: msg }, { status: code || 500 });
}

// クライアントマスタの一覧（id・name を名前順で返す）
export async function GET() {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  const r = await db.from("clients").select("id,name").order("name", { ascending: true });
  if (r.error) return fail(r.error.message);
  return Response.json({ clients: r.data || [] });
}
