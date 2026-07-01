"use client";

import { useState, useEffect } from "react";

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

export default function Persona() {
  // 生成フォーム
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
  const [saveState, setSaveState] = useState("idle");
  const [saveMsg, setSaveMsg] = useState("");

  // 一覧
  const [listLoading, setListLoading] = useState(false);
  const [listData, setListData] = useState([]);
  const [listError, setListError] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [openClients, setOpenClients] = useState({});

  const canGenerate = transcript.trim().length > 20 && !loading;

  useEffect(function () {
    loadList();
  }, []);

  async function generate() {
    setLoading(true);
    setError("");
    setPersona(null);
    setRaw("");
    setSaveState("idle");
    setSaveMsg("");
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

  async function savePersona() {
    if (!persona) return;
    if (!clientName.trim() || !position.trim()) {
      setSaveState("error");
      setSaveMsg("保存にはクライアント名とポジションが必要です。");
      return;
    }
    setSaveState("saving");
    setSaveMsg("");
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName,
          position: position,
          experience: experience,
          persona: persona,
          transcript: transcript,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setSaveState("error");
        setSaveMsg(data.error);
        return;
      }
      setSaveState("saved");
      setSaveMsg("保存しました。");
      loadList();
    } catch (e) {
      setSaveState("error");
      setSaveMsg("保存に失敗しました。");
    }
  }

  async function loadList() {
    setListLoading(true);
    setListError("");
    try {
      const res = await fetch("/api/personas", { method: "GET" });
      const data = await res.json();
      if (data.error) {
        setListError(data.error);
        setListData([]);
        return;
      }
      setListData(data.clients || []);
    } catch (e) {
      setListError("一覧の取得に失敗しました。");
    } finally {
      setListLoading(false);
    }
  }

  async function deletePersona(id) {
    const ok = window.confirm("このペルソナを削除しますか？（元に戻せません）");
    if (!ok) return;
    try {
      const res = await fetch("/api/personas?id=" + encodeURIComponent(id), {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        window.alert(data.error);
        return;
      }
      loadList();
    } catch (e) {
      window.alert("削除に失敗しました。");
    }
  }

  function toggleClient(id) {
    setOpenClients(function (prev) {
      const next = Object.assign({}, prev);
      next[id] = !next[id];
      return next;
    });
  }

  function asList(arr, indent) {
    const pad = indent || "  ";
    if (!Array.isArray(arr) || arr.length === 0) return pad + "-";
    return arr.map((x) => pad + "・" + x).join("\n");
  }
  function flat(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return "-";
    return arr.join(" / ");
  }

  function personaToText(p) {
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

  function copy(kind) {
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
    <div>
      {/* 生成フォーム */}
      <div
        style={{
          background: COLORS.paper,
          border: "1px solid " + COLORS.line,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Field label="クライアント名">
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="例：株式会社Hatch Promotion"
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
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SmallBtn onClick={() => copy("text")} active={copied === "text"}>
                {copied === "text" ? "コピーしました" : "テキストでコピー"}
              </SmallBtn>
              <SmallBtn onClick={() => copy("json")} active={copied === "json"}>
                {copied === "json" ? "コピーしました" : "JSONをコピー"}
              </SmallBtn>
              <button
                onClick={savePersona}
                disabled={saveState === "saving" || saveState === "saved"}
                style={{
                  background: saveState === "saved" ? COLORS.greyblue : COLORS.ink,
                  color: COLORS.paper,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor:
                    saveState === "saving" || saveState === "saved" ? "default" : "pointer",
                  fontFamily: FONT,
                }}
              >
                {saveState === "saving"
                  ? "保存中…"
                  : saveState === "saved"
                  ? "保存済み ✓"
                  : "このペルソナを保存"}
              </button>
            </div>
          </div>

          {saveMsg ? (
            <div
              style={{
                marginBottom: 12,
                fontSize: 13,
                color: saveState === "error" ? "#8A3A22" : COLORS.inkSoft,
              }}
            >
              {saveMsg}
            </div>
          ) : null}

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
              <PersonaBody persona={persona} />
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

      {/* 保存済み一覧 */}
      <div style={{ marginTop: 40 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>
            保存したペルソナをクライアント別に表示します。
          </div>
          <SmallBtn onClick={loadList}>{listLoading ? "読込中…" : "再読み込み"}</SmallBtn>
        </div>

        {listError ? (
          <div
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: 10,
              background: "#FBEDE9",
              border: "1px solid #E9C9BF",
              color: "#8A3A22",
              fontSize: 14,
            }}
          >
            {listError}
          </div>
        ) : null}

        {!listLoading && listData.length === 0 && !listError ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: COLORS.greyblue,
              background: COLORS.paper,
              border: "1px dashed " + COLORS.line,
              borderRadius: 14,
              fontSize: 14,
            }}
          >
            まだ保存されたペルソナはありません。上のフォームで作って保存してください。
          </div>
        ) : null}

        {listData.map((client) => {
          let personaCount = 0;
          (client.positions || []).forEach((pos) => {
            (pos.conditions || []).forEach((cond) => {
              personaCount = personaCount + (cond.personas ? cond.personas.length : 0);
            });
          });
          const clientOpen = !!openClients[client.id];
          return (
            <div
              key={client.id}
              style={{
                marginBottom: 20,
                background: COLORS.paper,
                border: "1px solid " + COLORS.line,
                borderRadius: 14,
                padding: "16px 20px",
              }}
            >
              <div
                onClick={() => toggleClient(client.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: COLORS.greyblue }}>
                    {clientOpen ? "▼" : "▶"}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{client.name}</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: COLORS.inkSoft,
                    background: COLORS.bg,
                    border: "1px solid " + COLORS.line,
                    borderRadius: 999,
                    padding: "3px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  ペルソナ {personaCount}件
                </span>
              </div>

              {clientOpen
                ? (client.positions || []).map((pos) => (
                    <div key={pos.id} style={{ marginTop: 14, paddingLeft: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.inkSoft }}>
                        {pos.name}
                      </div>

                      {(pos.conditions || []).map((cond) => {
                        const personas = (cond.personas || [])
                          .slice()
                          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
                        return (
                          <div key={cond.id} style={{ marginTop: 8, paddingLeft: 12 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: COLORS.greyblue,
                                fontWeight: 700,
                                marginBottom: 6,
                              }}
                            >
                              {cond.experience}
                            </div>

                            {personas.map((p) => {
                              const open = expandedId === p.id;
                              const d = p.created_at ? new Date(p.created_at) : null;
                              const pad = (n) => (n < 10 ? "0" + n : "" + n);
                              const dateStr = d
                                ? d.getFullYear() +
                                  "/" +
                                  pad(d.getMonth() + 1) +
                                  "/" +
                                  pad(d.getDate()) +
                                  " " +
                                  pad(d.getHours()) +
                                  ":" +
                                  pad(d.getMinutes())
                                : "";
                              return (
                                <div
                                  key={p.id}
                                  style={{
                                    border: "1px solid " + COLORS.line,
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      padding: "10px 14px",
                                      background: open ? "#F4F1EC" : COLORS.paper,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {p.is_current ? (
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: COLORS.paper,
                                            background: COLORS.ink,
                                            borderRadius: 999,
                                            padding: "2px 8px",
                                          }}
                                        >
                                          現行
                                        </span>
                                      ) : null}
                                      <span
                                        style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}
                                      >
                                        {dateStr}
                                      </span>
                                      <span style={{ fontSize: 13, color: COLORS.inkSoft }}>
                                        {p.label || "（ラベルなし）"}
                                      </span>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <SmallBtn onClick={() => setExpandedId(open ? "" : p.id)}>
                                        {open ? "閉じる" : "開く"}
                                      </SmallBtn>
                                      <button
                                        onClick={() => deletePersona(p.id)}
                                        style={{
                                          background: COLORS.paper,
                                          border: "1px solid #E9C9BF",
                                          color: "#8A3A22",
                                          borderRadius: 8,
                                          padding: "8px 12px",
                                          fontSize: 13,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          fontFamily: FONT,
                                        }}
                                      >
                                        削除
                                      </button>
                                    </div>
                                  </div>
                                  {open ? (
                                    <div style={{ padding: "8px 18px 18px" }}>
                                      <PersonaBody persona={p.data} />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))
                : null}
            </div>
          );
        })}
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

function PersonaBody(props: any) {
  const persona = props.persona || {};
  return (
    <div>
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
  );
}

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
