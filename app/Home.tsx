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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    load();
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
    </div>
  );
}
