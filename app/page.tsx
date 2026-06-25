"use client";

import { useState } from "react";

const COLORS = {
  ink: "#121212",
  greyblue: "#9BA8AB",
  sand: "#D8CABF",
  paper: "#FFFFFF",
  bg: "#F7F5F2",
  line: "#E7E2DB",
  inkSoft: "#3A3A3A",
};

const FONT =
  '"Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", system-ui, sans-serif';

const EXPERIENCE = ["経験者", "未経験", "不問"];

export default function Page() {
  const [clientName, setClientName] = useState("");
  const [position, setPosition] = useState("");
  const [experience, setExperience] = useState("不問");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [showJson, setShowJson] = useState(false);

  const canGenerate = transcript.trim().length > 20 && !loading;

  async function generate() {
    setLoading(true);
    setError("");
    setPersona(null);
    setRaw("");
    try {
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName,
          position: position,
          experience: experience,
          transcript: transcript.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        if (data.raw) {
          setRaw(data.raw);
          setShowJson(true);
        }
        return;
      }
      setRaw(data.raw || "");
      if (data.persona) {
        setPersona(data.persona);
      } else {
        setError("JSONの解析に失敗しました。下の「生出力」を確認してください。");
        setShowJson(true);
      }
    } catch (e) {
      setError("生成に失敗しました。通信状況を確認してもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  function asList(arr: any, indent?: string) {
    const pad = indent || "  ";
    if (!Array.isArray(arr) || arr.length === 0) return pad + "-";
    return arr.map((x: any) => pad + "・" + x).join("\n");
  }
  function flat(arr: any) {
    if (!Array.isArray(arr) || arr.length === 0) return "-";
    return arr.join(" / ");
  }

  function personaToText(p: any) {
    if (!p) return "";
    const lines = [];
    lines.push("■ クライアント: " + (clientName || "-"));
    lines.push("■ ポジション: " + (position || "-") + " / 雇用条件: " + experience);
    lines.push("");
    lines.push("【ペルソナ】" + (p["ラベル"] || ""));
    lines.push("");
    lines.push("● 基本属性\n" + (p["基本属性"] || ""));
    lines.push("● 現状\n" + (p["現状"] || ""));
    lines.push("● 転職動機（顕在）\n" + (p["転職動機_顕在"] || ""));
    lines.push("● 転職動機（潜在）\n" + (p["転職動機_潜在"] || ""));
    lines.push("● 重視する条件\n" + asList(p["重視する条件"]));
    lines.push("● 不安・障壁\n" + asList(p["不安_障壁"]));
    lines.push("● 意思決定の軸\n" + (p["意思決定の軸"] || ""));
    lines.push("● 情報接触\n" + (p["情報接触"] || ""));
    const t = p["訴求の方向性"] || {};
    lines.push("● 訴求の方向性");
    lines.push("  - 刺さる軸: " + flat(t["刺さる軸"]));
    lines.push("  - キーメッセージ案:\n" + asList(t["キーメッセージ案"], "    "));
    lines.push("  - NG訴求: " + flat(t["NG訴求"]));
    return lines.join("\n");
  }

  function copy(kind: string) {
    let payload = "";
    if (kind === "json") {
      payload = JSON.stringify(
        {
          クライアント: clientName,
          ポジション: position,
          雇用条件: experience,
          ペルソナ: persona,
        },
        null,
        2
      );
    } else {
      payload = personaToText(persona);
    }
    navigator.clipboard.writeText(payload).then(function () {
      setCopied(kind);
      setTimeout(function () {
        setCopied("");
      }, 1600);
    });
  }

  return (
    <div
      style={{
        background: COLORS.bg,
        minHeight: "100vh",
        fontFamily: FONT,
        color: COLORS.ink,
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, letterSpacing: 3, color: COLORS.greyblue, fontWeight: 700 }}>
            HATCH PROMOTION
          </span>
          <span style={{ color: COLORS.line }}>|</span>
          <span style={{ fontSize: 12, letterSpacing: 2, color: COLORS.greyblue }}>
            PERSONA ENGINE
          </span>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "10px 0 6px", lineHeight: 1.25 }}>
          ペルソナ生成エンジン
        </h1>
        <p style={{ color: COLORS.inkSoft, margin: 0, fontSize: 14 }}>
          tl;dv議事録を貼って、求人票生成にそのまま渡せるペルソナを一気通貫で。
        </p>

        <div
          style={{
            background: COLORS.paper,
            border: "1px solid " + COLORS.line,
            borderRadius: 14,
            padding: 20,
            marginTop: 24,
          }}
        >
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Field label="クライアント名">
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="例：アクアテック"
                style={inputStyle}
              />
            </Field>
            <Field label="ポジション">
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="例：施工管理"
                style={inputStyle}
              />
            </Field>
            <Field label="雇用条件" grow={false}>
              <div style={{ display: "flex", gap: 6 }}>
                {EXPERIENCE.map((x) => (
                  <button
                    key={x}
                    onClick={() => setExperience(x)}
                    style={{
                      ...chipStyle,
                      background: experience === x ? COLORS.ink : COLORS.paper,
                      color: experience === x ? COLORS.paper : COLORS.inkSoft,
                      borderColor: experience === x ? COLORS.ink : COLORS.line,
                    }}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>tl;dv議事録</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="tl;dvの文字起こし／議事録をそのまま貼り付けてください。"
              rows={10}
              style={{
                ...inputStyle,
                width: "100%",
                resize: "vertical",
                lineHeight: 1.7,
                fontFamily: FONT,
                marginTop: 6,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
            <button
              onClick={generate}
              disabled={!canGenerate}
              style={{
                background: canGenerate ? COLORS.ink : COLORS.greyblue,
                color: COLORS.paper,
                border: "none",
                borderRadius: 10,
                padding: "13px 26px",
                fontSize: 15,
                fontWeight: 700,
                cursor: canGenerate ? "pointer" : "not-allowed",
                fontFamily: FONT,
              }}
            >
              {loading ? "生成中…" : "ペルソナを生成"}
            </button>
            {transcript.trim().length > 0 && transcript.trim().length <= 20 ? (
              <span style={{ fontSize: 12, color: COLORS.greyblue }}>
                議事録をもう少し貼ってください
              </span>
            ) : null}
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginTop: 18,
              padding: "14px 16px",
              borderRadius: 10,
              background: "#FBEDE9",
              border: "1px solid #E9C9BF",
              color: "#8A3A22",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}

        {persona ? (
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>生成されたペルソナ</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <SmallBtn onClick={() => copy("text")} active={copied === "text"}>
                  {copied === "text" ? "コピーしました" : "テキストでコピー"}
                </SmallBtn>
                <SmallBtn onClick={() => copy("json")} active={copied === "json"}>
                  {copied === "json" ? "コピーしました" : "JSONをコピー"}
                </SmallBtn>
              </div>
            </div>

            <div
              style={{
                background: COLORS.paper,
                border: "1px solid " + COLORS.line,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div style={{ background: COLORS.ink, color: COLORS.paper, padding: "16px 22px" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: COLORS.sand }}>PERSONA</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                  {persona["ラベル"] || "（ラベルなし）"}
                </div>
                <div style={{ fontSize: 12, color: COLORS.greyblue, marginTop: 4 }}>
                  {(clientName || "—") + " ／ " + (position || "—") + " ／ " + experience}
                </div>
              </div>

              <div style={{ padding: "8px 22px 22px" }}>
                <Row label="基本属性" value={persona["基本属性"]} />
                <Row label="現状" value={persona["現状"]} />
                <Row label="転職動機（顕在）" value={persona["転職動機_顕在"]} />
                <Row label="転職動機（潜在）" value={persona["転職動機_潜在"]} accent />
                <RowList label="重視する条件" items={persona["重視する条件"]} />
                <RowList label="不安・障壁" items={persona["不安_障壁"]} />
                <Row label="意思決定の軸" value={persona["意思決定の軸"]} />
                <Row label="情報接触" value={persona["情報接触"]} />

                {persona["訴求の方向性"] ? (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px dashed " + COLORS.line,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: 1.5,
                        color: COLORS.greyblue,
                        fontWeight: 700,
                        marginBottom: 10,
                      }}
                    >
                      訴求の方向性（求人票生成のインプット）
                    </div>
                    <Chips label="刺さる軸" items={persona["訴求の方向性"]["刺さる軸"]} />
                    <RowList
                      label="キーメッセージ案"
                      items={persona["訴求の方向性"]["キーメッセージ案"]}
                      tight
                    />
                    <Chips label="NG訴求" items={persona["訴求の方向性"]["NG訴求"]} danger />
                  </div>
                ) : null}
              </div>
            </div>

            <button
              onClick={() => setShowJson(!showJson)}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: COLORS.greyblue,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: FONT,
                padding: 0,
              }}
            >
              {showJson ? "生出力を隠す ▲" : "生出力（JSON）を表示 ▼"}
            </button>
            {showJson ? (
              <pre
                style={{
                  marginTop: 8,
                  background: COLORS.ink,
                  color: "#E8E8E8",
                  padding: 16,
                  borderRadius: 10,
                  fontSize: 12,
                  overflowX: "auto",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {raw}
              </pre>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const inputStyle = {
  border: "1px solid " + COLORS.line,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: COLORS.ink,
  outline: "none",
  background: COLORS.paper,
  fontFamily: FONT,
  width: "100%",
  boxSizing: "border-box" as const,
};
const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: COLORS.inkSoft,
  display: "block",
};
const chipStyle = {
  border: "1px solid " + COLORS.line,
  borderRadius: 999,
  padding: "9px 14px",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: FONT,
  fontWeight: 600,
};

function Field(props: any) {
  const grow = props.grow !== false;
  return (
    <div style={{ flex: grow ? "1 1 200px" : "0 0 auto", minWidth: grow ? 180 : "auto" }}>
      <label style={labelStyle}>{props.label}</label>
      <div style={{ marginTop: 6 }}>{props.children}</div>
    </div>
  );
}

function Row(props: any) {
  const accent = props.accent;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: COLORS.greyblue, fontWeight: 700 }}>
        {props.label}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          marginTop: 4,
          color: COLORS.ink,
          background: accent ? "#F4F1EC" : "transparent",
          borderLeft: accent ? "3px solid " + COLORS.sand : "none",
          padding: accent ? "8px 12px" : 0,
          borderRadius: accent ? 6 : 0,
        }}
      >
        {props.value || "—"}
      </div>
    </div>
  );
}

function RowList(props: any) {
  const arr = Array.isArray(props.items) ? props.items : [];
  return (
    <div style={{ marginTop: props.tight ? 12 : 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: COLORS.greyblue, fontWeight: 700 }}>
        {props.label}
      </div>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {arr.length === 0 ? (
          <li style={{ fontSize: 14, color: COLORS.greyblue }}>—</li>
        ) : (
          arr.map((x: any, i: number) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 2 }}>
              {x}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function Chips(props: any) {
  const arr = Array.isArray(props.items) ? props.items : [];
  const danger = props.danger;
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1,
          color: COLORS.greyblue,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {props.label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {arr.length === 0 ? (
          <span style={{ fontSize: 13, color: COLORS.greyblue }}>—</span>
        ) : (
          arr.map((x: any, i: number) => (
            <span
              key={i}
              style={{
                fontSize: 13,
                padding: "6px 12px",
                borderRadius: 999,
                background: danger ? "#FBEDE9" : "#EFEAE3",
                color: danger ? "#8A3A22" : COLORS.ink,
                border: "1px solid " + (danger ? "#E9C9BF" : COLORS.line),
              }}
            >
              {x}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function SmallBtn(props: any) {
  return (
    <button
      onClick={props.onClick}
      style={{
        background: props.active ? COLORS.sand : COLORS.paper,
        border: "1px solid " + COLORS.line,
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: FONT,
        color: COLORS.ink,
      }}
    >
      {props.children}
    </button>
  );
}
