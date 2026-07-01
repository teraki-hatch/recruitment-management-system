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
export default function Home(props: any) {
  const onNavigate = props.onNavigate || function () {};
  const onOpenClient = props.onOpenClient || function () {};
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // クライアント一覧と、クライアントごとの掲載求人数
  const [clients, setClients] = useState([]);
  const [postingCount, setPostingCount] = useState({});
  const [clientsLoading, setClientsLoading] = useState(true);

  useEffect(function () {
    load();
    loadClients();
  }, []);
  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/summary", { method: "GET" });
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch (e) {
      // 取得失敗時は0表示のまま
    } finally {
      setLoading(false);
    }
  }

  // クライアント一覧＋掲載求人を取得し、クライアントidごとの件数を数える
  async function loadClients() {
    setClientsLoading(true);
    try {
      const cRes = await fetch("/api/clients", { method: "GET" });
      const cData = await cRes.json();
      const list = cData.clients || [];
      setClients(list);

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
      // 取得失敗時はカードなし
    } finally {
      setClientsLoading(false);
    }
  }

  const cards = [
    { key: "clients", label: "クライアント", value: stats ? stats.clients : 0, go: "" },
    { key: "positions", label: "ポジション", value: stats ? stats.positions : 0, go: "" },
    { key: "personas", label: "ペルソナ", value: stats ? stats.personas : 0, go: "list" },
    { key: "job_ads", label: "求人票", value: stats ? stats.job_ads : 0, go: "jobad" },
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 20 }}>
        貯まっているデータの全体サマリーです。
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {cards.map(function (c) {
          const clickable = c.go !== "";
          return (
            <div
              key={c.key}
              onClick={clickable ? () => onNavigate(c.go) : undefined}
              style={{
                flex: "1 1 180px",
                minWidth: 160,
                background: COLORS.paper,
                border: "1px solid " + COLORS.line,
                borderRadius: 14,
                padding: "18px 20px",
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <div style={{ fontSize: 12, color: COLORS.greyblue, fontWeight: 700 }}>{c.label}</div>
              <div style={{ fontSize: 34, fontWeight: 800, marginTop: 6, lineHeight: 1.1 }}>
                {loading ? "—" : c.value}
              </div>
              {clickable ? (
                <div style={{ fontSize: 11, color: COLORS.greyblue, marginTop: 6 }}>
                  クリックで一覧へ →
                </div>
              ) : (
                <div style={{ fontSize: 11, color: COLORS.line, marginTop: 6 }}>&nbsp;</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => onNavigate("generate")}
          style={{
            background: COLORS.ink,
            color: COLORS.paper,
            border: "none",
            borderRadius: 10,
            padding: "12px 22px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          ＋ ペルソナを生成
        </button>
        <button
          onClick={() => onNavigate("jobad")}
          style={{
            background: COLORS.paper,
            color: COLORS.ink,
            border: "1px solid " + COLORS.line,
            borderRadius: 10,
            padding: "12px 22px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          求人票を作る
        </button>
      </div>

      {/* クライアント一覧カード */}
      <div style={{ marginTop: 40 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 2,
            color: COLORS.greyblue,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          CLIENTS
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>顧客一覧</div>

        {clientsLoading ? (
          <div style={{ fontSize: 13, color: COLORS.greyblue }}>読み込み中…</div>
        ) : clients.length === 0 ? (
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
            登録済みのクライアントがありません。掲載求人の「＋新規登録」から追加できます。
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
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
                    padding: "18px 20px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 108,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink, lineHeight: 1.4 }}>
                    {c.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 14,
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
    </div>
  );
}
