export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientName = body.clientName || "";
    const position = body.position || "";
    const experience = body.experience || "不問";
    const transcript = (body.transcript || "").trim();

    if (transcript.length < 20) {
      return Response.json({ error: "議事録が短すぎます。" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "サーバにAPIキー(ANTHROPIC_API_KEY)が設定されていません。" },
        { status: 500 }
      );
    }

    const schema = [
      "{",
      '  "ラベル": "一言の人物像（例：地元志向の元接客リーダー）",',
      '  "基本属性": "年齢層・性別傾向・居住/通勤・生活背景を1〜2文で",',
      '  "現状": "現職・経歴・働き方・スキルを1〜2文で",',
      '  "転職動機_顕在": "本人が言語化している動機",',
      '  "転職動機_潜在": "言葉にしていない本音の推測",',
      '  "重視する条件": ["優先順に3〜4個"],',
      '  "不安_障壁": ["応募をためらう理由3〜4個"],',
      '  "意思決定の軸": "最終的に何で決めるか1文",',
      '  "情報接触": "どこで・いつ求人を探すか1文",',
      '  "訴求の方向性": {',
      '    "刺さる軸": ["2〜3個"],',
      '    "キーメッセージ案": ["求人票でそのまま使える短文2〜3個"],',
      '    "NG訴求": ["逆効果になる訴求1〜2個"]',
      "  }",
      "}",
    ].join("\n");

    const sys =
      "あなたは中小・フロントラインサービス業（建設・美容・飲食・小売・介護等）専門の採用コンサルタントで、ペルソナ設計の専門家です。" +
      "渡された商談・ヒアリングの議事録だけを根拠にして、求人票生成に直接使えるペルソナを1体設計してください。" +
      "議事録に書かれていない事項は推測で埋めず、その項目の値を「（議事録に記載なし・要確認）」としてください。" +
      "ただし『転職動機_潜在』『訴求の方向性』は、議事録の発言から無理のない範囲で解釈してよい（断定しすぎない）。" +
      "出力は指定スキーマに厳密準拠した有効なJSONのみ。前置き・説明・コードフェンスは一切付けないこと。日本語で記述すること。";

    const userText =
      "【案件コンテキスト】\n" +
      "クライアント: " + (clientName || "（未入力）") + "\n" +
      "ポジション: " + (position || "（未入力）") + "\n" +
      "雇用条件: " + experience + "\n\n" +
      "【tl;dv議事録】\n" +
      transcript +
      "\n\n【出力スキーマ】このJSON構造に厳密に従うこと:\n" +
      schema;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: sys,
        messages: [{ role: "user", content: userText }],
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      const msg =
        data && data.error && data.error.message
          ? data.error.message
          : "Anthropic APIエラー";
      return Response.json({ error: msg }, { status: 502 });
    }

    const blocks = Array.isArray(data.content) ? data.content : [];
    const text = blocks
      .filter(function (b: any) {
        return b && b.type === "text";
      })
      .map(function (b: any) {
        return b.text;
      })
      .join("\n")
      .trim();

    const fence = String.fromCharCode(96, 96, 96);
    let clean = text.split(fence + "json").join("");
    clean = clean.split(fence).join("");
    clean = clean.trim();

    let persona = null;
    try {
      persona = JSON.parse(clean);
    } catch (e) {
      persona = null;
    }

    return Response.json({ persona: persona, raw: text });
  } catch (e) {
    return Response.json({ error: "サーバエラーが発生しました。" }, { status: 500 });
  }
}
