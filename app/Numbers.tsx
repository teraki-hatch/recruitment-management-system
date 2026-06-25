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

function pad2(n) {
  return ("0" + n).slice(-2);
}

function fmtDate(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

// 与えた日付（YYYY-MM-DD）の週の月曜日を返す
function mondayOf(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=日 .. 6=土
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
}

function todayMonday() {
  return mondayOf(fmtDate(new Date()));
}

const inputStyle = {
  border: "1px solid " + COLORS.line,
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 14,
  color: COLORS.ink,
  outline: "none",
  background: COLORS.paper,
  fontFamily: FONT,
  boxSizing: "border-box",
};

export default function Numbers(props: any) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 登録フォーム
  const [clientName, setClientName] = useState("");
  const [positionName, setPositionName] = useState("");
  const [title, setTitle] = useState("");
  const [airworkId, setAirworkId] = useState("");
  const [indeedId, setIndeedId] = useState("");
  const [status, setStatus] = useState("募集中");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [openPosting, setOpenPosting] = useState("");

  useEffect(function () {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/postings");
      const data = await res.json();
      if (data.error) setErr(data.error);
      else setTree(buildTree(data.postings || []));
    } catch (e) {
      setErr("読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function buildTree(postings) {
    const clients = {};
    const order = [];
    postings.forEach(function (p) {
      const pos = p.positions || {};
      const cl = pos.clients || {};
      const clId = cl.id || "none";
      const clName = cl.name || "（未設定）";
      const posId = pos.id || "none";
      const posName = pos.name || "（未設定）";
      if (!clients[clId]) {
        clients[clId] = { id: clId, name: clName, positions: {}, order: [] };
        order.push(clId);
      }
      const c = clients[clId];
      if (!c.positions[posId]) {
        c.positions[posId] = { id: posId, name: posName, postings: [] };
        c.order.push(posId);
      }
      c.positions[posId].postings.push(p);
    });
    return order.map(function (clId) {
      const c = clients[clId];
      return {
        id: c.id,
        name: c.name,
        positions: c.order.map(function (posId) {
          return c.positions[posId];
        }),
      };
    });
  }

  async function register() {
    if (!clientName.trim() || !positionName.trim()) {
      setErr("クライアント名とポジション名は必須です。");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName,
          positionName: positionName,
          title: title,
          airworkId: airworkId,
          indeedId: indeedId,
          status: status,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setErr(data.error);
      } else {
        setTitle("");
        setAirworkId("");
        setIndeedId("");
        await load();
      }
    } catch (e) {
      setErr("登録に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function removePosting(id) {
    if (!confirm("この掲載求人を削除しますか？（数値も消えます）")) return;
    try {
      await fetch("/api/postings?id=" + id, { method: "DELETE" });
      if (openPosting === id) setOpenPosting("");
      await load();
    } catch (e) {
      // ignore
    }
  }

  function togglePosting(id) {
    setOpenPosting(openPosting === id ? "" : id);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>
          掲載求人を登録して、求人ごとに 媒体×週 で数値を入力します。
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: showForm ? COLORS.paper : COLORS.ink,
            color: showForm ? COLORS.ink : COLORS.paper,
            border: "1px solid " + (showForm ? COLORS.line : COLORS.ink),
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT,
            flexShrink: 0,
          }}
        >
          {showForm ? "閉じる" : "＋ 掲載求人を登録"}
        </button>
      </div>

      {/* 登録フォーム */}
      {showForm ? (
      <div
        style={{
          background: COLORS.paper,
          border: "1px solid " + COLORS.line,
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>掲載求人を登録</div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field label="クライアント名 *" width={220}>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="株式会社ユウキ建設様"
              style={Object.assign({}, inputStyle, { width: "100%" })}
            />
          </Field>
          <Field label="ポジション（職種）名 *" width={200}>
            <input
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="施工管理"
              style={Object.assign({}, inputStyle, { width: "100%" })}
            />
          </Field>
          <Field label="求人タイトル" width={220}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="施工管理（経験者）"
              style={Object.assign({}, inputStyle, { width: "100%" })}
            />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <Field label="AirWork ID（作成後に貼付・任意）" width={210}>
            <input
              value={airworkId}
              onChange={(e) => setAirworkId(e.target.value)}
              placeholder="11688714"
              style={Object.assign({}, inputStyle, { width: "100%" })}
            />
          </Field>
          <Field label="Indeed ID（任意）" width={180}>
            <input
              value={indeedId}
              onChange={(e) => setIndeedId(e.target.value)}
              placeholder=""
              style={Object.assign({}, inputStyle, { width: "100%" })}
            />
          </Field>
          <Field label="ステータス" width={150}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={Object.assign({}, inputStyle, { width: "100%" })}
            >
              <option value="募集中">募集中</option>
              <option value="募集停止中">募集停止中</option>
            </select>
          </Field>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={register}
            disabled={saving}
            style={{
              background: COLORS.ink,
              color: COLORS.paper,
              border: "none",
              borderRadius: 10,
              padding: "11px 22px",
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
              fontFamily: FONT,
            }}
          >
            {saving ? "登録中…" : "＋ 登録する"}
          </button>
        </div>
      </div>
      ) : null}

      {err ? (
        <div
          style={{
            background: "#FCEFEC",
            border: "1px solid #E8C7BE",
            color: "#9A3B25",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {err}
        </div>
      ) : null}

      {/* 一覧 */}
      {loading ? (
        <div style={{ color: COLORS.greyblue, fontSize: 14 }}>読み込み中…</div>
      ) : tree.length === 0 ? (
        <div
          style={{
            color: COLORS.greyblue,
            background: COLORS.paper,
            padding: "28px 20px",
            textAlign: "center",
            border: "1px dashed " + COLORS.line,
            borderRadius: 14,
            fontSize: 14,
          }}
        >
          まだ掲載求人がありません。上のフォームから登録してください。
        </div>
      ) : (
        tree.map(function (client) {
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
              <div style={{ fontSize: 17, fontWeight: 800 }}>{client.name}</div>

              {client.positions.map(function (pos) {
                return (
                  <div key={pos.id} style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.inkSoft }}>
                      {pos.name}
                    </div>

                    {pos.postings.map(function (p) {
                      const open = openPosting === p.id;
                      return (
                        <div
                          key={p.id}
                          style={{
                            border: "1px solid " + COLORS.line,
                            borderRadius: 10,
                            marginTop: 8,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 14px",
                              gap: 10,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>
                                {p.title || "（タイトル未設定）"}
                              </div>
                              <div style={{ fontSize: 12, color: COLORS.greyblue, marginTop: 3 }}>
                                {p.airwork_id ? "AirWork: " + p.airwork_id : "AirWork ID未設定"}
                                {"　/　"}
                                {p.status}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                              <button onClick={() => togglePosting(p.id)} style={smallBtn(open)}>
                                {open ? "閉じる" : "数値を入力"}
                              </button>
                              <button onClick={() => removePosting(p.id)} style={dangerBtn}>
                                削除
                              </button>
                            </div>
                          </div>

                          {open ? (
                            <div style={{ borderTop: "1px solid " + COLORS.line, padding: "14px" }}>
                              <MetricEditor postingId={p.id} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

function MetricEditor(props: any) {
  const postingId = props.postingId;
  const [media, setMedia] = useState("airwork");
  const [week, setWeek] = useState(todayMonday());
  const [imp, setImp] = useState("");
  const [clk, setClk] = useState("");
  const [app, setApp] = useState("");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(
    function () {
      loadRows();
    },
    [postingId]
  );

  async function loadRows() {
    try {
      const res = await fetch("/api/metrics?posting_id=" + postingId);
      const data = await res.json();
      if (!data.error) setRows(data.metrics || []);
    } catch (e) {
      // ignore
    }
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: postingId,
          media: media,
          week_start: mondayOf(week),
          impressions: imp,
          clicks: clk,
          applications: app,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg(data.error);
      } else {
        setMsg("保存しました（週の月曜：" + mondayOf(week) + "）");
        setImp("");
        setClk("");
        setApp("");
        await loadRows();
      }
    } catch (e) {
      setMsg("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  async function delRow(id) {
    try {
      await fetch("/api/metrics?id=" + id, { method: "DELETE" });
      await loadRows();
    } catch (e) {
      // ignore
    }
  }

  const mediaLabel = function (m) {
    return m === "indeed" ? "Indeed" : "AirWork";
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Field label="媒体" width={130}>
          <select
            value={media}
            onChange={(e) => setMedia(e.target.value)}
            style={Object.assign({}, inputStyle, { width: "100%" })}
          >
            <option value="airwork">AirWork</option>
            <option value="indeed">Indeed</option>
          </select>
        </Field>
        <Field label="週（その週の任意の日）" width={170}>
          <input
            type="date"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            style={Object.assign({}, inputStyle, { width: "100%" })}
          />
        </Field>
        <Field label="表示数" width={110}>
          <input
            value={imp}
            onChange={(e) => setImp(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            style={Object.assign({}, inputStyle, { width: "100%" })}
          />
        </Field>
        <Field label="クリック数" width={110}>
          <input
            value={clk}
            onChange={(e) => setClk(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            style={Object.assign({}, inputStyle, { width: "100%" })}
          />
        </Field>
        <Field label="応募数" width={110}>
          <input
            value={app}
            onChange={(e) => setApp(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            style={Object.assign({}, inputStyle, { width: "100%" })}
          />
        </Field>
        <button
          onClick={save}
          disabled={saving}
          style={{
            background: COLORS.ink,
            color: COLORS.paper,
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
            fontFamily: FONT,
            height: 38,
          }}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>

      <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 6 }}>
        ※ 入力した日が含まれる週（月曜始まり）に保存されます。同じ求人×媒体×週は上書きされます。
      </div>

      {msg ? (
        <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 8 }}>{msg}</div>
      ) : null}

      {/* 入力済みの一覧 */}
      {rows.length > 0 ? (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
              gap: 8,
              fontSize: 12,
              color: COLORS.greyblue,
              fontWeight: 700,
              padding: "0 4px 6px",
            }}
          >
            <div>週（月曜）</div>
            <div>媒体</div>
            <div>表示数</div>
            <div>クリック</div>
            <div>応募</div>
            <div></div>
          </div>
          {rows.map(function (r) {
            return (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
                  gap: 8,
                  fontSize: 13,
                  alignItems: "center",
                  padding: "8px 4px",
                  borderTop: "1px solid " + COLORS.line,
                }}
              >
                <div>{r.week_start}</div>
                <div>{mediaLabel(r.media)}</div>
                <div>{r.impressions}</div>
                <div>{r.clicks}</div>
                <div>{r.applications}</div>
                <div>
                  <button onClick={() => delRow(r.id)} style={dangerBtnSmall}>
                    削除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Field(props: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, width: props.width || 160 }}>
      <span style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 700 }}>{props.label}</span>
      {props.children}
    </div>
  );
}

function smallBtn(active) {
  return {
    background: active ? COLORS.ink : COLORS.paper,
    color: active ? COLORS.paper : COLORS.ink,
    border: "1px solid " + (active ? COLORS.ink : COLORS.line),
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONT,
  };
}

const dangerBtn = {
  background: COLORS.paper,
  color: "#9A3B25",
  border: "1px solid #E8C7BE",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
};

const dangerBtnSmall = {
  background: COLORS.paper,
  color: "#9A3B25",
  border: "1px solid #E8C7BE",
  borderRadius: 8,
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: FONT,
};
