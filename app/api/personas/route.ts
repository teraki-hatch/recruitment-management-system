import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 保存
export async function POST(req: Request) {
  try {
    const db = getDb();
    if (!db) {
      return Response.json(
        { error: "SupabaseのURL/キーが未設定です。" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const clientName = (body.clientName || "").trim();
    const positionName = (body.position || "").trim();
    const experience = (body.experience || "不問").trim();
    const persona = body.persona;
    const transcript = body.transcript || "";

    if (!clientName || !positionName || !persona) {
      return Response.json(
        { error: "クライアント名・ポジション・ペルソナが必要です。" },
        { status: 400 }
      );
    }

    // 1. クライアント（同名は再利用）
    let clientId = null;
    const c1 = await db.from("clients").select("id").eq("name", clientName).limit(1);
    if (c1.error) return Response.json({ error: c1.error.message }, { status: 500 });
    if (c1.data && c1.data.length > 0) {
      clientId = c1.data[0].id;
    } else {
      const c2 = await db.from("clients").insert({ name: clientName }).select("id").limit(1);
      if (c2.error) return Response.json({ error: c2.error.message }, { status: 500 });
      clientId = c2.data[0].id;
    }

    // 2. ポジション（client内で同名は再利用）
    let positionId = null;
    const p1 = await db
      .from("positions")
      .select("id")
      .eq("client_id", clientId)
      .eq("name", positionName)
      .limit(1);
    if (p1.error) return Response.json({ error: p1.error.message }, { status: 500 });
    if (p1.data && p1.data.length > 0) {
      positionId = p1.data[0].id;
    } else {
      const p2 = await db
        .from("positions")
        .insert({ client_id: clientId, name: positionName })
        .select("id")
        .limit(1);
      if (p2.error) return Response.json({ error: p2.error.message }, { status: 500 });
      positionId = p2.data[0].id;
    }

    // 3. 雇用条件（position内で同experienceは再利用）
    let conditionId = null;
    const k1 = await db
      .from("conditions")
      .select("id")
      .eq("position_id", positionId)
      .eq("experience", experience)
      .limit(1);
    if (k1.error) return Response.json({ error: k1.error.message }, { status: 500 });
    if (k1.data && k1.data.length > 0) {
      conditionId = k1.data[0].id;
    } else {
      const k2 = await db
        .from("conditions")
        .insert({ position_id: positionId, experience: experience })
        .select("id")
        .limit(1);
      if (k2.error) return Response.json({ error: k2.error.message }, { status: 500 });
      conditionId = k2.data[0].id;
    }

    // 4. 同条件の既存ペルソナを現行から外し、新規を現行として積む
    await db.from("personas").update({ is_current: false }).eq("condition_id", conditionId);

    const label = persona && persona["ラベル"] ? persona["ラベル"] : null;
    const ins = await db
      .from("personas")
      .insert({
        condition_id: conditionId,
        label: label,
        data: persona,
        source_transcript: transcript,
        is_current: true,
      })
      .select("id")
      .limit(1);
    if (ins.error) return Response.json({ error: ins.error.message }, { status: 500 });

    return Response.json({ ok: true, id: ins.data[0].id });
  } catch (e) {
    return Response.json({ error: "保存中にエラーが発生しました。" }, { status: 500 });
  }
}

// 一覧（クライアント→ポジション→雇用条件→ペルソナのツリー）
export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return Response.json(
        { error: "SupabaseのURL/キーが未設定です。" },
        { status: 500 }
      );
    }

    const q = await db
      .from("clients")
      .select(
        "id, name, created_at, positions(id, name, conditions(id, experience, personas(id, label, data, is_current, created_at)))"
      )
      .order("created_at", { ascending: false });
    if (q.error) return Response.json({ error: q.error.message }, { status: 500 });

    return Response.json({ clients: q.data || [] });
  } catch (e) {
    return Response.json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}

// 削除（ペルソナ1体）
export async function DELETE(req: Request) {
  try {
    const db = getDb();
    if (!db) {
      return Response.json(
        { error: "SupabaseのURL/キーが未設定です。" },
        { status: 500 }
      );
    }
    const u = new URL(req.url);
    const id = u.searchParams.get("id");
    if (!id) return Response.json({ error: "idが必要です。" }, { status: 400 });

    const del = await db.from("personas").delete().eq("id", id);
    if (del.error) return Response.json({ error: del.error.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "削除に失敗しました。" }, { status: 500 });
  }
}
