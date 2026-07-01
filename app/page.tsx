"use client";

import { useState, useEffect } from "react";
import JobAds from "./JobAds";
import Numbers from "./Numbers";
import Postings from "./Postings";

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

const TABS = [
  { key: "overview", label: "概要" },
  { key: "persona", label: "ペルソナ" },
  { key: "jobad", label: "求人票" },
  { key: "posting", label: "掲載求人" },
  { key: "numbers", label: "数値管理" },
];

export default function Page() {
  // screen: "list"（クライアント一覧） or "detail"（クライアントページ）
  const [screen, setScreen] = useState("list");
  const [activeClient, setActiveClient] = useState(null);
  const [tab, setTab] = useState("overview");

  function openClient(c) {
    setActiveClient(c || null);
    setTab("overview");
    setScreen("detail");
  }

  function backToList() {
    setScreen("list");
    setActiveClient(null);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: FONT,
        color: COLORS.ink,
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 28px 80px" }}>
        <TopBar />

        {screen === "list" ? (
          <ClientList onOpenClient={openClient} />
        ) : (
          <ClientDetail
            client={activeClient}
            tab={tab}
            onTab={setTab}
            onBack={backToList}
          />
        )}
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: COLORS.greyblue, fontWeight: 700 }}>
        HATCH PROMOTION RMS
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, letterSpacing: 1 }}>
        ハチプロ RMS
      </div>
    </div>
  );
}

// ===== クライアント一覧（トップ） =====
function ClientList(props: any) {
  const onOpenClient = props.onOpenClient || function () {};
  const [clients, setClients] = useState([]);
  const [postingCount, setPostingCount] = useState({});
  const [loading, setLoading] = useState(true);

  // 新規クライアント追加
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [addState, setAddState] = useState("idle");
  const [addMsg, setAddMsg] = useState("");

  useEffect(function () {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const cRes = await fetch("/api/clients", { method: "GET" });
      const cData = await cRes.json();
      setClients(cData.clients || []);

      const pRes = await fetch("/api/postings", { method: "GET" });
      const pData = await pRes.json();
      const postings = pData.postings || [];
      const counts = {};
      postings.forEach(function (p) {
        const pos = p.positions;
        const cl = pos ? pos.clients : null;
        const cid = cl ? cl.id : "";
        if (!cid) return;
        counts[cid] = (counts[cid] || 0) + 1;
      });
      setPostingCount(counts);
    } catch (e) {
      // 取得失敗時は空表示
    } finally {
      setLoading(false);
    }
  }

  async function addClient() {
    const name = (newName || "").trim();
    if (!name) {
      setAddState("error");
      setAddMsg("クライアント名を入力してください。");
      return;
    }
    setAddState("saving");
    setAddMsg("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name }),
      });
      const data = await res.json();
      if (data.error) {
        setAddState("error");
        setAddMsg(data.error);
        return;
      }
      setAddState("idle");
      setAddMsg(data.existed ? "同名のクライアントが既にあります。" : "");
      setNewName("");
      setShowAdd(false);
      load();
    } catch (e) {
      setAddState("error");
      setAddMsg("登録に失敗しました。");
    }
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
          クライアントを選ぶと、そのクライアントのペルソナ・求人票・掲載求人・数値をまとめて管理できます。
        </div>
        <button
          onClick={function () {
            setShowAdd(function (v) {
              return !v;
            });
            setAddMsg("");
          }}
          style={{
            background: showAdd ? COLORS.ink : COLORS.paper,
            color: showAdd ? COLORS.paper : COLORS.ink,
            border: "1px solid " + (showAdd ? COLORS.ink : COLORS.line),
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT,
            whiteSpace: "nowrap",
          }}
        >
          {showAdd ? "閉じる" : "＋クライアント追加"}
        </button>
      </div>

      {showAdd ? (
        <div
          style={{
            marginBottom: 20,
            padding: "18px 20px",
            background: COLORS.paper,
            border: "1px solid " + COLORS.line,
            borderRadius: 14,
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.inkSoft }}>
            クライアント名
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
            <input
              value={newName}
              onChange={function (e) {
                setNewName(e.target.value);
              }}
              placeholder="例：株式会社カイゼン・マーケティング"
              style={{
                border: "1px solid " + COLORS.line,
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 14,
                color: COLORS.ink,
                outline: "none",
                background: COLORS.paper,
                fontFamily: FONT,
                flex: "1 1 260px",
                minWidth: 200,
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={addClient}
              disabled={addState === "saving"}
              style={{
                background: COLORS.ink,
                color: COLORS.paper,
                border: "none",
                borderRadius: 10,
                padding: "11px 22px",
                fontSize: 14,
                fontWeight: 700,
                cursor: addState === "saving" ? "default" : "pointer",
                fontFamily: FONT,
                whiteSpace: "nowrap",
              }}
            >
              {addState === "saving" ? "登録中…" : "登録する"}
            </button>
          </div>
          {addMsg ? (
            <div
              style={{
                fontSize: 12,
                color: addState === "error" ? "#8A3A22" : COLORS.inkSoft,
                marginTop: 8,
              }}
            >
              {addMsg}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div style={{ fontSize: 13, color: COLORS.greyblue }}>読み込み中…</div>
      ) : clients.length === 0 ? (
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
          登録済みのクライアントがありません。「＋クライアント追加」から登録してください。
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {clients.map(function (c) {
            const cnt = postingCount[c.id] || 0;
            return (
              <div
                key={c.id}
                onClick={function () {
                  onOpenClient({ id: c.id, name: c.name });
                }}
                style={{
                  background: COLORS.paper,
                  border: "1px solid " + COLORS.line,
                  borderRadius: 14,
                  padding: "20px 22px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 116,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.ink, lineHeight: 1.4 }}>
                  {c.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 16,
                  }}
                >
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
                    掲載求人 {cnt}件
                  </span>
                  <span style={{ fontSize: 12, color: COLORS.greyblue }}>開く →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== クライアントページ（詳細・タブ） =====
function ClientDetail(props: any) {
  const client = props.client || {};
  const tab = props.tab;
  const onTab = props.onTab || function () {};
  const onBack = props.onBack || function () {};

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: COLORS.greyblue,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: FONT,
          padding: 0,
          marginBottom: 10,
        }}
      >
        ← クライアント一覧へ戻る
      </button>

      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 18px", lineHeight: 1.25 }}>
        {client.name || "（クライアント）"}
      </h1>

      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          borderBottom: "1px solid " + COLORS.line,
          marginBottom: 22,
        }}
      >
        {TABS.map(function (t) {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={function () {
                onTab(t.key);
              }}
              style={{
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid " + COLORS.ink : "2px solid transparent",
                color: active ? COLORS.ink : COLORS.greyblue,
                fontSize: 14,
                fontWeight: active ? 800 : 600,
                cursor: "pointer",
                fontFamily: FONT,
                padding: "8px 14px 12px",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? <Overview client={client} /> : null}
      {tab === "persona" ? <Placeholder label="ペルソナ" /> : null}
      {tab === "jobad" ? <JobAds /> : null}
      {tab === "posting" ? <Postings /> : null}
      {tab === "numbers" ? <Numbers /> : null}
    </div>
  );
}

function Overview(props: any) {
  const client = props.client || {};
  return (
    <div
      style={{
        background: COLORS.paper,
        border: "1px solid " + COLORS.line,
        borderRadius: 14,
        padding: "22px 24px",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{client.name}</div>
      <div style={{ fontSize: 13, color: COLORS.inkSoft, lineHeight: 1.8 }}>
        上のタブから、このクライアントのペルソナ・求人票・掲載求人・数値管理にアクセスできます。
        各機能を「このクライアント専用」に紐付ける調整は次の段階で行います。
      </div>
    </div>
  );
}

function Placeholder(props: any) {
  return (
    <div
      style={{
        padding: "48px 20px",
        textAlign: "center",
        color: COLORS.greyblue,
        background: COLORS.paper,
        border: "1px dashed " + COLORS.line,
        borderRadius: 14,
        fontSize: 14,
      }}
    >
      {props.label}機能はこのクライアントページへ移設中です（準備中）。
    </div>
  );
}
