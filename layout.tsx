import React from "react";

export const metadata = {
  title: "ハチプロ ペルソナ生成エンジン",
  description: "tl;dv議事録からペルソナを生成",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
