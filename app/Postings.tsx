"use client";
import { useState, useEffect, useRef } from "react";

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

// ===== 求人票(12項目) → AirWork5項目 のマッピング補助 =====
// 職種名: ポジション名を記号除去＋30字トリム（AirWork制約）
function sanitizeJobTitle(s) {
  var t = "" + (s || "");
  t = t.replace(/[^0-9A-Za-zぁ-んァ-ヶ一-龠々ー\u3000\s]/g, "");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 30) t = t.slice(0, 30);
  return t;
}
// 句読点で綺麗に切るトリム。
// 上限内の最後の句点(。！？)までで止める（文として完結させる）。
// 句点が min(max*0.3, 8) 字以上の位置にあればそこで切り、無ければ文字数で素直に切る。
function trimTo(s, max) {
  var t = ("" + (s || "")).trim();
  if (t.length <= max) return t;
  var head = t.slice(0, max);
  var lastEnd = Math.max(
    head.lastIndexOf("。"),
    head.lastIndexOf("！"),
    head.lastIndexOf("？")
  );
  var threshold = Math.min(Math.floor(max * 0.3), 8);
  if (lastEnd >= threshold) {
    return head.slice(0, lastEnd + 1);
  }
  return head;
}
// 見出し付き連結（空セクションは省く）
function joinSections(pairs) {
  var blocks = [];
  for (var i = 0; i < pairs.length; i++) {
    var label = pairs[i][0];
    var body = ("" + (pairs[i][1] || "")).trim();
    if (!body) continue;
    blocks.push("【" + label + "】\n" + body);
  }
  return blocks.join("\n\n");
}
// 求人票data + ポジション名 → 5項目（aw_* キー）
function mapJobAdToAw(d, positionName) {
  d = d || {};
  var jobDescription = joinSections([
    ["仕事内容", d["仕事内容"]],
    ["給与", d["給与"]],
    ["勤務地", d["勤務地"]],
    ["勤務時間", d["勤務時間"]],
    ["休日休暇", d["休日休暇"]],
    ["待遇・福利厚生", d["待遇・福利厚生"]],
  ]);
  var personal = joinSections([
    ["求める人物像", d["求める人物像"]],
    ["応募資格", d["応募資格"]],
    ["歓迎要件", d["歓迎要件"]],
  ]);
  return {
    aw_job_title: sanitizeJobTitle(positionName || ""),
    aw_subtitle: trimTo(d["キャッチコピー"], 30),
    aw_job_description: trimTo(jobDescription, 4000),
    aw_personal: trimTo(personal, 4000),
    aw_working_environment: trimTo(d["アピール文"], 128),
  };
}

export default function Postings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState("");
  const [draft, setDraft] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [saveMsg, setSaveMsg] = useState("");

  // 新規登録フォーム
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    positionName: "",
    title: "",
    sourceAirworkId: "",
    status: "未作成",
  });
  const [formState, setFormState] = useState("idle");
  const [formMsg, setFormMsg] = useState("");

  // クライアントcombobox
  const [clients, setClients] = useState([]);
  const [clientOpen, setClientOpen] = useState(false);
  const clientBoxRef = useRef(null);

  // 求人票取り込み用
  const [personas, setPersonas] = useState([]);
  const [selPersona, setSelPersona] = useState("");
  const [ads, setAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [selAd, setSelAd] = useState("");
  const [importMsg, setImportMsg] = useState("");

  useEffect(function () {
    load();
    loadPersonas();
    loadClients();
  }, []);

  // combobox外クリックで候補を閉じる
  useEffect(function () {
    function onDocClick(e) {
      if (clientBoxRef.current && !clientBoxRef.current.contains(e.target)) {
        setClientOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return function () {
      document.removeEventListener("mousedown", onDocClick);
    };
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

  // クライアントマスタを取得
  async function loadClients() {
    try {
      const res = await fetch("/api/clients", { method: "GET" });
      const data = await res.json();
      setClients(data.clients || []);
    } catch (e) {
      // 取得失敗は静かに無視（combobox候補が空になるだけ）
    }
  }

  // ペルソナ一覧をフラット化して取得（JobAdsと同じ経路）
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
                  c.name + " / " + p.name + " / " + cond.experience + " / " + (per.label || "（ラベルなし）"),
              });
            });
          });
        });
      });
      setPersonas(flat);
    } catch (e) {
      // 取得失敗は静かに無視
    }
  }

  async function loadAds(personaId) {
    if (!personaId) {
      setAds([]);
      return;
    }
    setAdsLoading(true);
    try {
      const res = await fetch("/api/job-ads?persona_id=" + encodeURIComponent(personaId), {
        method: "GET",
      });
      const data = await res.json();
      setAds(data.job_ads || []);
    } catch (e) {
      setAds([]);
    } finally {
      setAdsLoading(false);
    }
  }

  function setFormField(key, val) {
    setForm(function (prev) {
      const next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  // クライアント名の入力変化（自由入力。候補を開く）
  function onClientInput(val) {
    setFormField("clientName", val);
    setClientOpen(true);
    if (formState !== "idle") {
      setFormState("idle");
      setFormMsg("");
    }
  }

  // 候補（既存クライアント）を選んで確定
  function pickClient(name) {
    setFormField("clientName", name);
    setClientOpen(false);
  }

  // いま入力中の文字でマスタを絞り込む
  function filteredClients() {
    const q = (form.clientName || "").trim();
    if (!q) return clients;
    return clients.filter(function (c) {
      return ("" + (c.name || "")).indexOf(q) >= 0;
    });
  }

  // 入力値が既存マスタと完全一致しているか
  function exactClientExists() {
    const q = (form.clientName || "").trim();
    if (!q) return false;
    return clients.some(function (c) {
      return ("" + (c.name || "")).trim() === q;
    });
  }

  // 掲載求人を1件登録する（5項目は持たせず、複製元ID・status・識別情報のみ）
  async function submitForm() {
    const clientName = (form.clientName || "").trim();
    const positionName = (form.positionName || "").trim();
    if (!clientName || !positionName) {
      setFormState("error");
      setFormMsg("クライアント名とポジション名は必須です。");
      return;
    }
    setFormState("saving");
    setFormMsg("");
    try {
      const res = await fetch("/api/postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName,
          positionName: positionName,
          title: (form.title || "").trim(),
          sourceAirworkId: (form.sourceAirworkId || "").trim(),
          status: form.status || "未作成",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setFormState("error");
        setFormMsg(data.error);
        return;
      }
      setFormState("saved");
      setFormMsg("登録しました。");
      setForm({
        clientName: "",
        positionName: "",
        title: "",
        sourceAirworkId: "",
        status: "未作成",
      });
      load();
      loadClients();
    } catch (e) {
      setFormState("error");
      setFormMsg("登録に失敗しました。");
    }
  }

  function openEditor(it) {
    setOpenId(it.id);
    setSaveState("idle");
    setSaveMsg("");
    setImportMsg("");
    setSelPersona("");
    setSelAd("");
    setAds([]);
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
    setImportMsg("");
    setDraft({});
  }

  function setField(key, val) {
    setDraft(function (prev) {
      const next = Object.assign({}, prev);
      next[key] = val;
      return next;
    });
  }

  function onSelectPersona(id) {
    setSelPersona(id);
    setSelAd("");
    setImportMsg("");
    loadAds(id);
  }

  // 選択中の求人票を5項目欄へ取り込む（職種名はその求人のポジション名から）
  function importFromAd(it) {
    if (!selAd) {
      setImportMsg("取り込む求人票を選んでください。");
      return;
    }
    const ad = ads.filter(function (a) {
      return a.id === selAd;
    })[0];
    if (!ad) {
      setImportMsg("求人票が見つかりません。");
      return;
    }
    const pos = it.positions || {};
    const positionName = pos.name || "";
    const mapped = mapJobAdToAw(ad.data, positionName);
    setDraft(function (prev) {
      const next = Object.assign({}, prev);
      AW_FIELDS.forEach(function (f) {
        next[f.key] = mapped[f.key] || "";
      });
      return next;
    });
    setImportMsg("取り込みました。内容を確認して保存してください。");
    setSaveState("idle");
    setSaveMsg("");
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

  const cFiltered = filteredClients();
  const cExact = exactClientExists();
  const cTyped = (form.clientName || "").trim();

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
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={function () {
              setShowForm(function (v) {
                return !v;
              });
              setFormState("idle");
              setFormMsg("");
            }}
            style={{
              background: showForm ? COLORS.ink : COLORS.paper,
              color: showForm ? COLORS.paper : COLORS.ink,
              border: "1px solid " + (showForm ? COLORS.ink : COLORS.line),
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: FONT,
              whiteSpace: "nowrap",
            }}
          >
            {showForm ? "登録フォームを閉じる" : "＋新規登録"}
          </button>
          <button onClick={load} style={smallBtnStyle}>
            {loading ? "読込中…" : "再読み込み"}
          </button>
        </div>
      </div>

      {showForm ? (
        <div
          style={{
            marginBottom: 18,
            padding: "18px 20px",
            background: COLORS.paper,
            border: "1px solid " + COLORS.line,
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.ink, marginBottom: 4 }}>
            掲載求人を新規登録
          </div>
          <div style={{ fontSize: 12, color: COLORS.greyblue, marginBottom: 16 }}>
            行を作るだけの軽い登録です。5項目（AirWork流し込み）は登録後に「5項目を編集」または求人票取り込みで入れられます。
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <div ref={clientBoxRef} style={{ position: "relative" }}>
              <label style={labelStyle}>クライアント名 ＊</label>
              <input
                value={form.clientName}
                onChange={function (e) {
                  onClientInput(e.target.value);
                }}
                onFocus={function () {
                  setClientOpen(true);
                }}
                placeholder="既存から選ぶ／新規は入力"
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
                autoComplete="off"
              />
              {clientOpen ? (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    background: COLORS.paper,
                    border: "1px solid " + COLORS.line,
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                    zIndex: 20,
                    maxHeight: 260,
                    overflowY: "auto",
                  }}
                >
                  {cFiltered.length > 0 ? (
                    cFiltered.map(function (c) {
                      return (
                        <div
                          key={c.id}
                          onClick={function () {
                            pickClient(c.name);
                          }}
                          style={{
                            padding: "10px 12px",
                            fontSize: 13,
                            color: COLORS.ink,
                            cursor: "pointer",
                            borderBottom: "1px solid " + COLORS.line,
                          }}
                        >
                          {c.name}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: "10px 12px", fontSize: 12, color: COLORS.greyblue }}>
                      一致する既存クライアントはありません
                    </div>
                  )}

                  {cTyped && !cExact ? (
                    <div
                      onClick={function () {
                        pickClient(cTyped);
                      }}
                      style={{
                        padding: "11px 12px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#1F6B3B",
                        cursor: "pointer",
                        background: "#F1F7F2",
                      }}
                    >
                      ＋「{cTyped}」を新規クライアントとして登録
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 4 }}>
                {cTyped && !cExact
                  ? "この名前は新規クライアントになります（既存にある場合は上の候補から選んでください）。"
                  : "既存の名前は一覧から選べます。表記ゆれによる二重登録を防ぎます。"}
              </div>
            </div>

            <div>
              <label style={labelStyle}>ポジション名 ＊</label>
              <input
                value={form.positionName}
                onChange={function (e) {
                  setFormField("positionName", e.target.value);
                }}
                placeholder="例：動画編集スタッフ"
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
              />
              <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 4 }}>
                取り込み時の職種名のもとになります。
              </div>
            </div>

            <div>
              <label style={labelStyle}>タイトル（識別ラベル）</label>
              <input
                value={form.title}
                onChange={function (e) {
                  setFormField("title", e.target.value);
                }}
                placeholder="例：動画編集スタッフ（複製本番）"
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
              />
              <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 4 }}>
                一覧で見分けるための名前。任意。
              </div>
            </div>

            <div>
              <label style={labelStyle}>複製元ID（source_airwork_id）</label>
              <input
                value={form.sourceAirworkId}
                onChange={function (e) {
                  setFormField("sourceAirworkId", e.target.value);
                }}
                placeholder="例：11871143"
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
              />
              <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 4 }}>
                AirWorkで複製のもとにする求人ID。一気通貫の複製ソースです。
              </div>
            </div>

            <div>
              <label style={labelStyle}>status</label>
              <input
                value={form.status}
                onChange={function (e) {
                  setFormField("status", e.target.value);
                }}
                placeholder="未作成"
                style={{ ...inputStyle, width: "100%", marginTop: 6 }}
              />
              <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 4 }}>
                「未作成」のとき一気通貫のキューに乗ります。
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 18,
            }}
          >
            <button
              onClick={submitForm}
              disabled={formState === "saving"}
              style={{
                background: COLORS.ink,
                color: COLORS.paper,
                border: "none",
                borderRadius: 10,
                padding: "11px 22px",
                fontSize: 14,
                fontWeight: 700,
                cursor: formState === "saving" ? "default" : "pointer",
                fontFamily: FONT,
              }}
            >
              {formState === "saving" ? "登録中…" : "登録する"}
            </button>
            {formMsg ? (
              <span
                style={{
                  fontSize: 13,
                  color: formState === "error" ? "#8A3A22" : COLORS.inkSoft,
                }}
              >
                {formMsg}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <div style={errorBoxStyle}>{error}</div> : null}

      {!loading && items.length === 0 && !error ? (
        <div style={emptyBoxStyle}>掲載求人がまだありません。</div>
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
                {/* 求人票から取り込む */}
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 6,
                    padding: "14px 16px",
                    background: COLORS.bg,
                    border: "1px solid " + COLORS.line,
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.inkSoft, marginBottom: 8 }}>
                    求人票から取り込む（任意）
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      value={selPersona}
                      onChange={function (e) {
                        onSelectPersona(e.target.value);
                      }}
                      style={selectStyle}
                    >
                      <option value="">— ペルソナを選ぶ —</option>
                      {personas.map(function (p) {
                        return (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={selAd}
                      onChange={function (e) {
                        setSelAd(e.target.value);
                        setImportMsg("");
                      }}
                      disabled={!selPersona || adsLoading}
                      style={selectStyle}
                    >
                      <option value="">
                        {adsLoading
                          ? "読込中…"
                          : !selPersona
                          ? "— 先にペルソナを選択 —"
                          : ads.length === 0
                          ? "— 保存済み求人票なし —"
                          : "— 求人票を選ぶ —"}
                      </option>
                      {ads.map(function (a) {
                        return (
                          <option key={a.id} value={a.id}>
                            {"案" + (a.variant || "-") + " ｜ " + (a.title || "（無題）")}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      onClick={function () {
                        importFromAd(it);
                      }}
                      disabled={!selAd}
                      style={{
                        background: selAd ? COLORS.ink : COLORS.greyblue,
                        color: COLORS.paper,
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: selAd ? "pointer" : "not-allowed",
                        fontFamily: FONT,
                        whiteSpace: "nowrap",
                      }}
                    >
                      5項目に取り込む
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 8 }}>
                    職種名はこの求人のポジション名（{(it.positions && it.positions.name) || "—"}）から自動セットされます。条件系（給与・勤務地など）は仕事内容にまとめられます。取り込み後に編集できます。
                  </div>
                  {importMsg ? (
                    <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 6 }}>{importMsg}</div>
                  ) : null}
                </div>

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
const selectStyle = {
  border: "1px solid " + COLORS.line,
  borderRadius: 8,
  padding: "9px 10px",
  fontSize: 13,
  color: COLORS.ink,
  outline: "none",
  background: COLORS.paper,
  fontFamily: FONT,
  flex: "1 1 200px",
  minWidth: 160,
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
