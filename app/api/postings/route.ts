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

// 掲載求人の一覧（求人 → ポジション → クライアント を join して返す）
// aw_* の5項目（AirWork上書き用）も併せて返す。
export async function GET() {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  const r = await db
    .from("postings")
    .select(
      "id,title,airwork_id,indeed_id,job_url,status,source_airwork_id,created_at,aw_job_title,aw_subtitle,aw_job_description,aw_personal,aw_working_environment,positions(id,name,clients(id,name))"
    )
    .order("created_at", { ascending: false });
  if (r.error) return fail(r.error.message);
  return Response.json({ postings: r.data || [] });
}

// 掲載求人の登録（クライアント・ポジションは名前で get-or-create）
export async function POST(req) {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    return fail("リクエストの形式が不正です。", 400);
  }
  const clientName = (body.clientName || "").trim();
  const positionName = (body.positionName || "").trim();
  if (!clientName || !positionName) {
    return fail("クライアント名とポジション名は必須です。", 400);
  }
  let clientId = "";
  const c1 = await db.from("clients").select("id").eq("name", clientName).limit(1);
  if (c1.error) return fail(c1.error.message);
  if (c1.data && c1.data.length > 0) {
    clientId = c1.data[0].id;
  } else {
    const ci = await db.from("clients").insert({ name: clientName }).select("id").single();
    if (ci.error) return fail(ci.error.message);
    clientId = ci.data.id;
  }
  let positionId = "";
  const p1 = await db
    .from("positions")
    .select("id")
    .eq("client_id", clientId)
    .eq("name", positionName)
    .limit(1);
  if (p1.error) return fail(p1.error.message);
  if (p1.data && p1.data.length > 0) {
    positionId = p1.data[0].id;
  } else {
    const pi = await db
      .from("positions")
      .insert({ client_id: clientId, name: positionName })
      .select("id")
      .single();
    if (pi.error) return fail(pi.error.message);
    positionId = pi.data.id;
  }
  const ins = await db
    .from("postings")
    .insert({
      position_id: positionId,
      title: (body.title || "").trim(),
      airwork_id: (body.airworkId || "").trim(),
      indeed_id: (body.indeedId || "").trim(),
      status: body.status || "未作成",
      source_airwork_id: (body.sourceAirworkId || "").trim(),
    })
    .select("id")
    .single();
  if (ins.error) return fail(ins.error.message);
  return Response.json({ id: ins.data.id });
}

// 掲載求人の AirWork上書き5項目を更新する。
// body: { id, aw_job_title?, aw_subtitle?, aw_job_description?, aw_personal?, aw_working_environment? }
// 渡されたキーだけ更新する（undefinedのキーは触らない）。
export async function PATCH(req) {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    return fail("リクエストの形式が不正です。", 400);
  }
  const id = (body.id || "").trim();
  if (!id) return fail("idが必要です。", 400);

  const allowed = [
    "aw_job_title",
    "aw_subtitle",
    "aw_job_description",
    "aw_personal",
    "aw_working_environment",
  ];
  const patch = {};
  for (let i = 0; i < allowed.length; i++) {
    const k = allowed[i];
    if (typeof body[k] === "string") {
      patch[k] = body[k];
    }
  }
  if (Object.keys(patch).length === 0) {
    return fail("更新対象の項目がありません。", 400);
  }

  const r = await db
    .from("postings")
    .update(patch)
    .eq("id", id)
    .select(
      "id,aw_job_title,aw_subtitle,aw_job_description,aw_personal,aw_working_environment"
    )
    .single();
  if (r.error) return fail(r.error.message);
  return Response.json({ ok: true, posting: r.data });
}

// 掲載求人の削除（数値も cascade で消える）
export async function DELETE(req) {
  const db = getDb();
  if (!db) return fail("SupabaseのURL/キーが未設定です。");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("idが必要です。", 400);
  const r = await db.from("postings").delete().eq("id", id);
  if (r.error) return fail(r.error.message);
  return Response.json({ ok: true });
}
