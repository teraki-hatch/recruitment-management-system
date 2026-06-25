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

const FIELDS = [
  "キャッチコピー",
  "仕事のタイトル",
  "仕事内容",
  "応募資格",
  "歓迎要件",
  "給与",
  "勤務地",
  "勤務時間",
  "休日休暇",
  "待遇・福利厚生",
  "求める人物像",
  "アピール文",
];

export default function JobAds() {
  const [personas, setPersonas] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState(null);
  const [genError, setGenError] = useState("");
  const [genRaw, setGenRaw] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [savedAds, setSavedAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [openSaved, setOpenSaved] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(function () {
    loadPersonas();
  }, []);

  async function loadPersonas() {
    try {
      const res = await fetch("/api/personas", { method: "GET" });
      const data = await res.json();
      const flat = [];
      (data.clients || []).forEach(function (c) {
        (c.positions || []).forEach(function (p) {
          (p.conditions || []).forEach(function (cond) {
            (cond.personas || []).forEach(function (per) {
              flat.push({
                id: per.id,
                label:
                  c.name +
                  " / " +
                  p.name +
                  " / " +
                  cond.experience +
                  " / " +
                  (per.label || "（ラベルなし）"),
              });
            });
          });
        });
      });
      setPersonas(flat);
    } catch (e) {
      // 取得失敗は静かに無視（必要なら再選択で復帰）
    }
  }

  function onSelect(id) {
    setSelectedId(id);
    setVariants(null);
    setGenError("");
    setGenRaw("");
    setSaveMsg("");
    if (id) {
      loadSavedAds(id);
    } else {
      setSavedAds([]);
    }
  }

  async function loadSavedAds(id) {
    setLoadingAds(true);
    try {
      const res = await fetch("/api/job-ads?persona_id=" + encodeURIComponent(id), {
        method: "GET",
      });
      const data = await res.json();
      setSavedAds(data.job_ads || []);
    } catch (e) {
      setSavedAds([]);
    } finally {
      setLoadingAds(false);
    }
  }

  async function generate() {
    if (!selectedId) return;
    setGenerating(true);
    setGenError("");
    setVariants(null);
    setGenRaw("");
    setSaveMsg("");
    try {
      const res = await fetch("/api/job-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", persona_id: selectedId }),
      });
      const data = await res.json();
      if (data.error) {
        setGenError(data.error);
        if (data.raw) {
          setGenRaw(data.raw);
          setShowRaw(true);
        }
        return;
      }
      setVariants(data.variants || []);
    } catch (e) {
      setGenError("生成に失敗しました。もう一度お試しください。");
    } finally {
      setGenerating(false);
    }
  }

  async function saveVariant(v) {
    try {
      const res = await fetch("/api/job-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", persona_id: selectedId, variants: [v] }),
      });
      const data = await res.json();
      if (data.error) {
        setSaveMsg(data.error);
        return;
      }
      setSaveMsg("保存しました。");
      loadSavedAds(selectedId);
    } catch (e) {
      setSaveMsg("保存に失敗しました。");
    }
  }

  async function deleteAd(id) {
    const ok = window.confirm("この求人票を削除しますか？（元に戻せません）");
    if (!ok) return;
    try {
      const res = await fetch("/api/job-ads?id=" + encodeURIComponent(id), {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) {
        window.alert(data.error);
        return;
      }
      loadSavedAds(selectedId);
    } catch (e) {
      window.alert("削除に失敗しました。");
    }
  }

  function adToText(d) {
    const lines = [];
    FIELDS.forEach(function (f) {
      lines.push("【" + f + "】");
      lines.push(d && d[f] ? d[f] : "");
      lines.push("");
    });
    return lines.join("\n");
  }

  function copyAd(key, d) {
    navigator.clipboard.writeText(adToText(d)).then(function () {
      setCopied(key);
      setTimeout(function () {
        setCopied("");
      }, 1600);
    });
  }

  return (
    <div>
      <div
        style={{
          background: COLORS.paper,
          border: "1px solid " + COLORS.line,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <label
          style={{ fontSize: 12, fontWeight: 700, color: COLORS.inkSoft, display: "block" }}
        >
          ペルソナを選択
        </label>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            marginTop: 6,
            width: "100%",
            border: "1px solid " + COLORS.line,
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 14,
            color: COLORS.ink,
            background: COLORS.paper,
            fontFamily: FONT,
            boxSizing: "border-box" as const,
          }}
        >
          <option value="">— 保存済みペルソナから選ぶ —</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
          <button
            onClick={generate}
            disabled={!selectedId || generating}
            style={{
              background: selectedId && !generating ? COLORS.ink : COLORS.greyblue,
              color: COLORS.paper,
              border: "none",
              borderRadius: 10,
              padding: "13px 26px",
              fontSize: 15,
              fontWeight: 700,
              cursor: selectedId && !generating ? "pointer" : "not-allowed",
              fontFamily: FONT,
            }}
          >
            {generating ? "生成中…（3案）" : "Airワーク用に3案（A/B/C）生成"}
          </button>
          {personas.length === 0 ? (
            <span style={{ fontSize: 12, color: COLORS.greyblue }}>
              先に「保存済み一覧」でペルソナを保存してください
            </span>
          ) : null}
        </div>
      </div>

      {genError ? (
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
          {genError}
          {genRaw ? (
            <div>
              <button
                onClick={() => setShowRaw(!showRaw)}
                style={{
                  marginTop: 8,
                  background: "none",
                  border: "none",
                  color: "#8A3A22",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: FONT,
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {showRaw ? "生出力を隠す" : "生出力を表示"}
              </button>
              {showRaw ? (
                <pre
                  style={{
                    marginTop: 8,
                    background: COLORS.ink,
                    color: "#E8E8E8",
                    padding: 16,
                    borderRadius: 10,
                    fontSize: 12,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {genRaw}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {saveMsg ? (
        <div style={{ marginTop: 14, fontSize: 13, color: COLORS.inkSoft }}>{saveMsg}</div>
      ) : null}

      {variants && variants.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 14px" }}>
            生成された3案（保存したい案を選んでください）
          </h2>
          {variants.map((v, i) => {
            const key = "var-" + i;
            return (
              <div
                key={key}
                style={{
                  background: COLORS.paper,
                  border: "1px solid " + COLORS.line,
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 18,
                }}
              >
                <div style={{ background: COLORS.ink, color: COLORS.paper, padding: "14px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        background: COLORS.sand,
                        color: COLORS.ink,
                        borderRadius: 6,
                        padding: "2px 10px",
                      }}
                    >
                      案 {v["案ラベル"] || String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ fontSize: 13, color: COLORS.greyblue }}>
                      {v["案の方向性"] || ""}
                    </span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}>
                    {v["キャッチコピー"] || ""}
                  </div>
                </div>
                <div style={{ padding: "8px 20px 18px" }}>
                  <AdFields data={v} />
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => saveVariant(v)}
                      style={{
                        background: COLORS.ink,
                        color: COLORS.paper,
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 18px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: FONT,
                      }}
                    >
                      この案を保存
                    </button>
                    <button
                      onClick={() => copyAd(key, v)}
                      style={{
                        background: copied === key ? COLORS.sand : COLORS.paper,
                        border: "1px solid " + COLORS.line,
                        borderRadius: 8,
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: FONT,
                        color: COLORS.ink,
                      }}
                    >
                      {copied === key ? "コピーしました" : "テキストでコピー"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedId ? (
        <div style={{ marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>このペルソナの保存済み求人票</h2>
            <button
              onClick={() => loadSavedAds(selectedId)}
              style={{
                background: COLORS.paper,
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
              {loadingAds ? "読込中…" : "再読み込み"}
            </button>
          </div>

          {savedAds.length === 0 && !loadingAds ? (
            <div
              style={{
                padding: "28px 20px",
                textAlign: "center",
                color: COLORS.greyblue,
                background: COLORS.paper,
                border: "1px dashed " + COLORS.line,
                borderRadius: 14,
                fontSize: 14,
              }}
            >
              まだ保存された求人票はありません。
            </div>
          ) : null}

          {savedAds.map((ad) => {
            const open = openSaved === ad.id;
            const d = ad.created_at ? new Date(ad.created_at) : null;
            const pad = (n) => (n < 10 ? "0" + n : "" + n);
            const dateStr = d
              ? d.getFullYear() + "/" + pad(d.getMonth() + 1) + "/" + pad(d.getDate())
              : "";
            const key = "saved-" + ad.id;
            return (
              <div
                key={ad.id}
                style={{
                  border: "1px solid " + COLORS.line,
                  borderRadius: 12,
                  marginBottom: 10,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "12px 16px",
                    background: open ? "#F4F1EC" : COLORS.paper,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        background: COLORS.ink,
                        color: COLORS.paper,
                        borderRadius: 6,
                        padding: "2px 8px",
                      }}
                    >
                      案 {ad.variant || "-"}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
                      {dateStr}
                    </span>
                    <span style={{ fontSize: 13, color: COLORS.inkSoft }}>
                      {ad.title || "（タイトルなし）"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => copyAd(key, ad.data)}
                      style={smallBtn(copied === key)}
                    >
                      {copied === key ? "コピー済" : "コピー"}
                    </button>
                    <button
                      onClick={() => setOpenSaved(open ? "" : ad.id)}
                      style={smallBtn(false)}
                    >
                      {open ? "閉じる" : "開く"}
                    </button>
                    <button
                      onClick={() => deleteAd(ad.id)}
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
                    <AdFields data={ad.data} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function smallBtn(active: boolean) {
  return {
    background: active ? COLORS.sand : COLORS.paper,
    border: "1px solid " + COLORS.line,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT,
    color: COLORS.ink,
  };
}

function AdFields(props: any) {
  const d = props.data || {};
  return (
    <div>
      {FIELDS.map((f) => (
        <div key={f} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 1, color: COLORS.greyblue, fontWeight: 700 }}>
            {f}
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              marginTop: 4,
              color: COLORS.ink,
              whiteSpace: "pre-wrap",
            }}
          >
            {d[f] || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
