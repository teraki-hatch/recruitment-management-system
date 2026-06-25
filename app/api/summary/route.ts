import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return Response.json({ error: "SupabaseのURL/キーが未設定です。" }, { status: 500 });
    }

    async function countOf(table) {
      const r = await db.from(table).select("*", { count: "exact", head: true });
      if (r.error) return 0;
      return r.count || 0;
    }

    const clients = await countOf("clients");
    const positions = await countOf("positions");
    const personas = await countOf("personas");
    const jobAds = await countOf("job_ads");

    return Response.json({
      clients: clients,
      positions: positions,
      personas: personas,
      job_ads: jobAds,
    });
  } catch (e) {
    return Response.json({ error: "集計の取得に失敗しました。" }, { status: 500 });
  }
}
