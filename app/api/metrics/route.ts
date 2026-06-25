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

function toInt(v) {
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 0) return 0;
  return n;
}

// 指定した掲載求人の週次数値を一覧（新しい週が上）
export async function GET(req) {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  const url = new URL(req.url);
  const postingId = url.searchParams.get("posting_id");
  if (!postingId) return fail("posting_idが必要です。", 400);
  const r = await db
    .from("metrics")
    .select("id,media,week_start,impressions,clicks,applications")
    .eq("posting_id", postingId)
    .order("week_start", { ascending: false });
  if (r.error) return fail(r.error.message);
  return Response.json({ metrics: r.data || [] });
}

// 週次数値の保存（求人×媒体×週 が同じなら上書き＝upsert）
export async function POST(req) {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");

  let b = {};
  try {
    b = await req.json();
  } catch (e) {
    return fail("リクエストの形式が不正です。", 400);
  }

  if (!b.posting_id || !b.media || !b.week_start) {
    return fail("posting_id・media・week_start は必須です。", 400);
  }

  const row = {
    posting_id: b.posting_id,
    media: b.media,
    week_start: b.week_start,
    impressions: toInt(b.impressions),
    clicks: toInt(b.clicks),
    applications: toInt(b.applications),
  };

  const r = await db
    .from("metrics")
    .upsert(row, { onConflict: "posting_id,media,week_start" })
    .select("id")
    .single();
  if (r.error) return fail(r.error.message);
  return Response.json({ id: r.data.id });
}

// 週次数値の1行削除
export async function DELETE(req) {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("idが必要です。", 400);
  const r = await db.from("metrics").delete().eq("id", id);
  if (r.error) return fail(r.error.message);
  return Response.json({ ok: true });
}
