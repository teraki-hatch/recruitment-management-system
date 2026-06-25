import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// 拡張がAirWork作成後に ID と URL を書き戻す
//   body: { posting_id, airwork_id, job_url?, status? }
export async function POST(req) {
  const db = getDb();
  if (!db) {
    return Response.json({ error: "SupabaseのURL/キーが未設定です。" }, { status: 500, headers: CORS });
  }

  let b = {};
  try {
    b = await req.json();
  } catch (e) {
    return Response.json({ error: "リクエストの形式が不正です。" }, { status: 400, headers: CORS });
  }

  if (!b.posting_id || !b.airwork_id) {
    return Response.json(
      { error: "posting_id と airwork_id は必須です。" },
      { status: 400, headers: CORS }
    );
  }

  const patch = {
    airwork_id: ("" + b.airwork_id).trim(),
    job_url: (b.job_url || "").trim(),
    status: b.status || "掲載中",
  };

  const r = await db.from("postings").update(patch).eq("id", b.posting_id).select("id").single();
  if (r.error) {
    return Response.json({ error: r.error.message }, { status: 500, headers: CORS });
  }
  return Response.json({ ok: true, id: r.data.id }, { headers: CORS });
}
