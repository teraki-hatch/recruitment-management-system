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

// クライアントの新規登録（名前のみ。同名があればそれを返す＝重複作成しない）
export async function POST(req) {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    return fail("リクエストの形式が不正です。", 400);
  }
  const name = (body.name || "").trim();
  if (!name) return fail("クライアント名は必須です。", 400);

  const c1 = await db.from("clients").select("id,name").eq("name", name).limit(1);
  if (c1.error) return fail(c1.error.message);
  if (c1.data && c1.data.length > 0) {
    return Response.json({ client: c1.data[0], existed: true });
  }
  const ci = await db.from("clients").insert({ name: name }).select("id,name").single();
  if (ci.error) return fail(ci.error.message);
  return Response.json({ client: ci.data, existed: false });
}
