import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
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

// 拡張がAirWorkで作るべき「未作成」の掲載求人を返す。
// 複製後の5項目上書き(ステップC)のため、aw_* 5項目も awFields としてまとめて返す。
export async function GET() {
  const db = getDb();
  if (!db) {
    return Response.json({ error: "SupabaseのURL/キーが未設定です。" }, { status: 500, headers: CORS });
  }
  const r = await db
    .from("postings")
    .select(
      "id,title,source_airwork_id,aw_job_title,aw_subtitle,aw_job_description,aw_personal,aw_working_environment,positions(name,clients(name))"
    )
    .eq("status", "未作成")
    .order("created_at", { ascending: true });
  if (r.error) {
    return Response.json({ error: r.error.message }, { status: 500, headers: CORS });
  }
  const queue = (r.data || []).map(function (p) {
    const pos = p.positions || {};
    const cl = pos.clients || {};
    return {
      id: p.id,
      title: p.title || "",
      clientName: cl.name || "",
      positionName: pos.name || "",
      sourceAirworkId: p.source_airwork_id || "",
      awFields: {
        aw_job_title: p.aw_job_title || "",
        aw_subtitle: p.aw_subtitle || "",
        aw_job_description: p.aw_job_description || "",
        aw_personal: p.aw_personal || "",
        aw_working_environment: p.aw_working_environment || "",
      },
    };
  });
  return Response.json({ queue: queue }, { headers: CORS });
}
