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
    '    "案の方向性": "この案の訴求の重心を一言で（例：安定×高収入／未経験の入りやすさ／自由な働き方）",',
    '    "キャッチコピー": "一覧で目を引く短い一文。抽象を避け、数字かベネフィットを必ず1つ入れる（例：月給25万保証＋売上30%歩合／未経験から3年目で年収500万）。20〜40字程度。",',
    '    "仕事のタイトル": "職種名。担当業務が一目で分かる端的な表現。記号や過度な装飾は避ける。",',
    '    "仕事内容": "次の構成で記述。(1)冒頭に【この求人のポイント】として数字・ベネフィット中心の箇条書き3〜5行（各行頭に ◎ や ✓ などの記号可）(2)ターゲットへの語りかけ一文（例：＼カットに疲れた美容師さんへ／）(3)会社・仕事の説明(4)【具体的な仕事内容】の箇条書き(5)議事録に素材があれば入社者の声や研修フロー・入社後の流れ。やらなくて良いこと（例：集客・残業なし）があれば明示する。事実が無い数字は創作しない。",',
    '    "応募資格": "必須要件。箇条書き可。",',
    '    "歓迎要件": "あれば尚可の要件。箇条書き可。",',
    '    "給与": "議事録に事実があれば反映、無ければ 要記入",',
    '    "勤務地": "同上",',
    '    "勤務時間": "同上",',
    '    "休日休暇": "同上",',
    '    "待遇・福利厚生": "同上",',
    '    "求める人物像": "【こんな方におすすめ】としてペルソナの動機・不安に対応した箇条書き中心。誰に来てほしいかを具体的に。",',
    '    "アピール文": "議事録に転職理由や前職の不満の素材があれば、それを代弁する共感の一文から入り（例：体が限界だった、人間関係に疲れた等）、自社がそれをどう解決するかを示す。素材が無ければ会社の強みを具体的な事実で訴求する。"',
    "  }",
    "]",
  ].join("\n");

  const sys =
    "あなたはAirワーク採用管理の求人原稿を作る、プロのコピーライター兼採用コンサルタントです。" +
    "与えられたペルソナと商談議事録をもとに、Airワーク掲載用の求人原稿を必ず3案（A/B/C）作成します。" +
    "3案は訴求の重心を明確に変えて差別化してください（例：安定・定着／裁量・成長／未経験歓迎・入りやすさ など、ペルソナの『刺さる軸』から選ぶ）。" +
    "ペルソナの『訴求の方向性』を尊重し、『刺さる軸』『キーメッセージ案』を活かし、『NG訴求』は必ず避けてください。" +
    "\n\n" +
    "【応募が集まる求人原稿の原則】以下を意識して書くこと。" +
    "(1)抽象論を避け、数字と具体で語る。『やりがいがある』ではなく『未経験から3年目で年収500万』のように、金額・日数・割合・期間など具体的な数字を優先する。ただし数字は議事録にある事実のみ使い、無ければ創作しない。" +
    "(2)読み手を名指しで呼びかける。『＼カットに疲れた美容師さんへ／』のように、ターゲットが『自分のことだ』と感じる一文を入れる。" +
    "(3)応募者の痛み・不満から入って共感を作る。議事録に転職理由や前職の不満の素材があれば、それを先に代弁してから自社の解決を示す（例：体が限界だった→だから残業ゼロ）。素材が無ければ無理に作らない。" +
    "(4)『やらなくて良いこと』を明示すると刺さる。集客なし・残業なし・ノルマなし等、負担からの解放が訴求になるなら書く。" +
    "(5)具体性とリアリティ。議事録に入社者の声・研修フロー・入社後の流れの素材があれば積極的に使い、不安を先回りして潰す。素材が無い場合は捏造しない。" +
    "(6)箇条書きと記号（◎ ✓ ＼／ など）でリズムと視認性を出す。ただし職種名（仕事のタイトル）だけは記号を避け端的にする。" +
    "\n\n" +
    "給与・勤務地・勤務時間・休日休暇・待遇などの事実は、議事録に記載があればそのまま反映し、記載が無い項目は創作せず『要記入』としてください。" +
    "とりわけ金額・人数・年収例・離職率・店舗数などの数字は、議事録にある事実のみ使い、無い数字を創作してはいけません。" +
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

  // 配列本体だけを抜き出す（前後に説明文が混ざっても拾えるように）
  const firstBracket = clean.indexOf("[");
  const lastBracket = clean.lastIndexOf("]");
  let body = clean;
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    body = clean.slice(firstBracket, lastBracket + 1);
  }

  // 文字列値の中に素の改行・タブ・復帰が入っているとJSON.parseが失敗するため、
  // 文字列リテラル内の制御文字だけをエスケープ済みの表現に直す。
  function repairControlChars(s) {
    let out = "";
    let inStr = false;
    let prev = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (ch === "\n") {
          out += "\\n";
          prev = ch;
          continue;
        }
        if (ch === "\r") {
          out += "\\r";
          prev = ch;
          continue;
        }
        if (ch === "\t") {
          out += "\\t";
          prev = ch;
          continue;
        }
        if (ch === '"' && prev !== "\\") {
          inStr = false;
          out += ch;
          prev = ch;
          continue;
        }
        out += ch;
        // バックスラッシュのエスケープ状態を正しく追うため、\\ は打ち消す
        prev = prev === "\\" && ch === "\\" ? "" : ch;
      } else {
        if (ch === '"') {
          inStr = true;
        }
        out += ch;
        prev = ch;
      }
    }
    return out;
  }

  let variants: any = null;
  const candidates = [clean, body, repairControlChars(body), repairControlChars(clean)];
  for (let i = 0; i < candidates.length; i++) {
    try {
      const parsed = JSON.parse(candidates[i]);
      if (Array.isArray(parsed)) {
        variants = parsed;
        break;
      }
    } catch (e) {
      // 次の候補へ
    }
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
