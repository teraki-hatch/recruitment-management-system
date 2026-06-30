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

// AirWork上書き5項目の定義（順番・ラベル・上限・複数行か）
const AW_FIELDS = [
  { key: "aw_job_title", label: "職種名", max: 30, multiline: false, note: "記号は使えません（AirWork制約）" },
  { key: "aw_subtitle", label: "キャッチコピー", max: 30, multiline: false, note: "" },
  { key: "aw_job_description", label: "仕事内容", max: 4000, multiline: true, note: "" },
  { key: "aw_personal", label: "求める人材", max: 4000, multiline: true, note: "" },
  { key: "aw_working_environment", label: "職場環境", max: 128, multiline: true, note: "" },
];

export default function Postings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState("");
  const [draft, setDraft] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(function () {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/postings", { method: "GET" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setItems([]);
        return;
      }
      setItems(data.postings || []);
    } catch (e) {
      setError("一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function openEditor(it) {
    setOpenId(it.id);
    setSaveState("idle");
    setSaveMsg("");
    const d = {};
    AW_FIELDS.forEach(function (f) {
      d[f.key] = it[f.key] || "";
    });
    setDraft(d);
  }

  function closeEditor() {
    setOpenId("");
    setSaveState("idle");
    setSaveMsg("");
    setDraft({});
  }

  function setField(key, val) {
    setDraft(function (prev) {
      const next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  async function save(id) {
    setSaveState("saving");
    setSaveMsg("");
    try {
      const payload = { id: id };
      AW_FIELDS.forEach(function (f) {
        payload[f.key] = draft[f.key] || "";
      });
      const res = await fetch("/api/postings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        setSaveState("error");
        setSaveMsg(data.error);
        return;
      }
      setSaveState("saved");
      setSaveMsg("保存しました。");
      // ローカルの一覧にも反映（再取得せず即時反映）
      setItems(function (prev) {
        return prev.map(function (x) {
          if (x.id !== id) return x;
          const merged = Object.assign({}, x);
          AW_FIELDS.forEach(function (f) {
            merged[f.key] = draft[f.key] || "";
          });
          return merged;
        });
      });
    } catch (e) {
      setSaveState("error");
      setSaveMsg("保存に失敗しました。");
    }
  }

  function clientLabel(it) {
    const pos = it.positions;
    if (!pos) return "—";
    const cl = pos.clients;
    const clientName = cl && cl.name ? cl.name : "—";
    return clientName + " ／ " + (pos.name || "—");
  }

  function filledCount(it) {
    let n = 0;
    AW_FIELDS.forEach(function (f) {
      if (it[f.key] && ("" + it[f.key]).trim().length > 0) n = n + 1;
    });
    return n;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>
          掲載求人ごとに、AirWorkへ流し込む5項目（職種名・キャッチ・仕事内容・求める人材・職場環境）を編集します。
        </div>
        <button onClick={load} style={smallBtnStyle}>
          {loading ? "読込中…" : "再読み込み"}
        </button>
      </div>

      {error ? (
        <div style={errorBoxStyle}>{error}</div>
      ) : null}

      {!loading && items.length === 0 && !error ? (
        <div style={emptyBoxStyle}>
          掲載求人がまだありません。
        </div>
      ) : null}

      {items.map(function (it) {
        const open = openId === it.id;
        const filled = filledCount(it);
        return (
          <div
            key={it.id}
            style={{
              marginBottom: 14,
              background: COLORS.paper,
              border: "1px solid " + COLORS.line,
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "14px 18px",
                background: open ? "#F4F1EC" : COLORS.paper,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink }}>
                  {it.title || "（タイトル未設定）"}
                </div>
                <div style={{ fontSize: 12, color: COLORS.greyblue, marginTop: 2 }}>
                  {clientLabel(it)}
                </div>
                <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 4 }}>
                  AirWork ID: {it.airwork_id || "—"} ／ 5項目入力 {filled}/5
                </div>
              </div>
              <button
                onClick={function () {
                  if (open) {
                    closeEditor();
                  } else {
                    openEditor(it);
                  }
                }}
                style={smallBtnStyle}
              >
                {open ? "閉じる" : "5項目を編集"}
              </button>
            </div>

            {open ? (
              <div style={{ padding: "8px 18px 20px" }}>
                {AW_FIELDS.map(function (f) {
                  const val = draft[f.key] || "";
                  const len = ("" + val).length;
                  const over = len > f.max;
                  return (
                    <div key={f.key} style={{ marginTop: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                        }}
                      >
                        <label style={labelStyle}>{f.label}</label>
                        <span
                          style={{
                            fontSize: 11,
                            color: over ? "#8A3A22" : COLORS.greyblue,
                            fontWeight: over ? 700 : 500,
                          }}
                        >
                          {len} / {f.max}
                        </span>
                      </div>
                      {f.multiline ? (
                        <textarea
                          value={val}
                          onChange={function (e) {
                            setField(f.key, e.target.value);
                          }}
                          rows={f.max > 200 ? 6 : 3}
                          style={{
                            ...inputStyle,
                            width: "100%",
                            resize: "vertical",
                            lineHeight: 1.7,
                            marginTop: 6,
                          }}
                        />
                      ) : (
                        <input
                          value={val}
                          onChange={function (e) {
                            setField(f.key, e.target.value);
                          }}
                          style={{ ...inputStyle, width: "100%", marginTop: 6 }}
                        />
                      )}
                      {f.note ? (
                        <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 4 }}>
                          {f.note}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  <button
                    onClick={function () {
                      save(it.id);
                    }}
                    disabled={saveState === "saving"}
                    style={{
                      background: COLORS.ink,
                      color: COLORS.paper,
                      border: "none",
                      borderRadius: 10,
                      padding: "11px 22px",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: saveState === "saving" ? "default" : "pointer",
                      fontFamily: FONT,
                    }}
                  >
                    {saveState === "saving" ? "保存中…" : "5項目を保存"}
                  </button>
                  {saveMsg ? (
                    <span
                      style={{
                        fontSize: 13,
                        color: saveState === "error" ? "#8A3A22" : COLORS.inkSoft,
                      }}
                    >
                      {saveMsg}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
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
  boxSizing: "border-box" as const,
};
const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: COLORS.inkSoft,
};
const smallBtnStyle = {
  background: COLORS.paper,
  border: "1px solid " + COLORS.line,
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
  color: COLORS.ink,
  whiteSpace: "nowrap" as const,
};
const errorBoxStyle = {
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 10,
  background: "#FBEDE9",
  border: "1px solid #E9C9BF",
  color: "#8A3A22",
  fontSize: 14,
};
const emptyBoxStyle = {
  padding: "40px 20px",
  textAlign: "center" as const,
  color: COLORS.greyblue,
  background: COLORS.paper,
  border: "1px dashed " + COLORS.line,
  borderRadius: 14,
  fontSize: 14,
};
