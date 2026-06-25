import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function generateVariants(personaData, transcript, clientName, positionName, experience) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "ANTHROPIC_API_KEYが未設定です。" };

  const schema = [
    "[",
    "  {",
    '    "案ラベル": "A",',
    '    "案の方向性": "この案の訴求の重心を一言で",',
    '    "キャッチコピー": "一覧で目を引く短い文",',
    '    "仕事のタイトル": "職種名",',
    '    "仕事内容": "本文",',
    '    "応募資格": "必須要件",',
    '    "歓迎要件": "あれば尚可の要件",',
    '    "給与": "議事録に事実があれば反映、無ければ 要記入",',
    '    "勤務地": "同上",',
    '    "勤務時間": "同上",',
    '    "休日休暇": "同上",',
    '    "待遇・福利厚生": "同上",',
    '    "求める人物像": "ペルソナを踏まえた記述",',
    '    "アピール文": "会社の魅力・訴求（刺さる軸を反映した自由記述）"',
    "  }",
    "]",
  ].join("\n");

  const sys =
    "あなたはAirワーク採用管理の求人原稿を作る、プロのコピーライター兼採用コンサルタントです。" +
    "与えられたペルソナと商談議事録をもとに、Airワーク掲載用の求人原稿を必ず3案（A/B/C）作成します。" +
    "3案は訴求の重心を明確に変えて差別化してください（例：安定・定着／裁量・成長／未経験歓迎・入りやすさ など、ペルソナの『刺さる軸』から選ぶ）。" +
    "ペルソナの『訴求の方向性』を尊重し、『刺さる軸』『キーメッセージ案』を活かし、『NG訴求』は必ず避けてください。" +
    "給与・勤務地・勤務時間・休日休暇・待遇などの事実は、議事録に記載があればそのまま反映し、記載が無い項目は創作せず『要記入』としてください。" +
    "出力は3要素のJSON配列のみ。前置き・説明・コードフェンスは付けないこと。日本語で記述すること。";

  const userText =
    "【案件コンテキスト】\n" +
    "クライアント: " + (clientName || "（不明）") + "\n" +
    "ポジション: " + (positionName || "（不明）") + "\n" +
    "雇用条件: " + (experience || "不問") + "\n\n" +
    "【ペルソナ(JSON)】\n" + JSON.stringify(personaData) + "\n\n" +
    "【商談議事録】\n" + (transcript || "（議事録なし）") + "\n\n" +
    "【出力スキーマ】この構造の配列を、A/B/Cの3要素で:\n" + schema;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: sys,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    const msg = data && data.error && data.error.message ? data.error.message : "Anthropic APIエラー";
    return { error: msg };
  }

  const blocks = Array.isArray(data.content) ? data.content : [];
  const text = blocks
    .filter(function (b) {
      return b && b.type === "text";
    })
    .map(function (b) {
      return b.text;
    })
    .join("\n")
    .trim();

  const fence = String.fromCharCode(96, 96, 96);
  let clean = text.split(fence + "json").join("");
  clean = clean.split(fence).join("");
  clean = clean.trim();

  let variants = null;
  try {
    variants = JSON.parse(clean);
  } catch (e) {
    variants = null;
  }
  return { variants: variants, raw: text };
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    if (!db) return Response.json({ error: "SupabaseのURL/キーが未設定です。" }, { status: 500 });

    const body = await req.json();
    const action = body.action || "";

    if (action === "generate") {
      const personaId = body.persona_id;
      if (!personaId) return Response.json({ error: "persona_idが必要です。" }, { status: 400 });

      const pq = await db
        .from("personas")
        .select("data, source_transcript, conditions(experience, positions(name, clients(name)))")
        .eq("id", personaId)
        .limit(1);
      if (pq.error) return Response.json({ error: pq.error.message }, { status: 500 });
      if (!pq.data || pq.data.length === 0) {
        return Response.json({ error: "ペルソナが見つかりません。" }, { status: 404 });
      }

      const row = pq.data[0];
      const cond = row.conditions || {};
      const pos = cond.positions || {};
      const cli = pos.clients || {};

      const res = await generateVariants(
        row.data,
        row.source_transcript,
        cli.name,
        pos.name,
        cond.experience
      );
      if (res.error) return Response.json({ error: res.error }, { status: 502 });
      if (!Array.isArray(res.variants)) {
        return Response.json(
          { error: "生成結果の解析に失敗しました。もう一度お試しください。", raw: res.raw },
          { status: 200 }
        );
      }
      return Response.json({ variants: res.variants });
    }

    if (action === "save") {
      const personaId = body.persona_id;
      const variants = body.variants;
      if (!personaId || !Array.isArray(variants) || variants.length === 0) {
        return Response.json({ error: "persona_idと案が必要です。" }, { status: 400 });
      }
      const rows = variants.map(function (v) {
        return {
          persona_id: personaId,
          variant: v && v["案ラベル"] ? v["案ラベル"] : null,
          title: v && v["仕事のタイトル"] ? v["仕事のタイトル"] : null,
          data: v,
        };
      });
      const ins = await db.from("job_ads").insert(rows);
      if (ins.error) return Response.json({ error: ins.error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "不明なactionです。" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: "処理中にエラーが発生しました。" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const db = getDb();
    if (!db) return Response.json({ error: "SupabaseのURL/キーが未設定です。" }, { status: 500 });
    const u = new URL(req.url);
    const personaId = u.searchParams.get("persona_id");
    if (!personaId) return Response.json({ job_ads: [] });

    const q = await db
      .from("job_ads")
      .select("id, variant, title, data, created_at")
      .eq("persona_id", personaId)
      .order("created_at", { ascending: false });
    if (q.error) return Response.json({ error: q.error.message }, { status: 500 });

    return Response.json({ job_ads: q.data || [] });
  } catch (e) {
    return Response.json({ error: "一覧の取得に失敗しました。" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const db = getDb();
    if (!db) return Response.json({ error: "SupabaseのURL/キーが未設定です。" }, { status: 500 });
    const u = new URL(req.url);
    const id = u.searchParams.get("id");
    if (!id) return Response.json({ error: "idが必要です。" }, { status: 400 });

    const del = await db.from("job_ads").delete().eq("id", id);
    if (del.error) return Response.json({ error: del.error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "削除に失敗しました。" }, { status: 500 });
  }
}
