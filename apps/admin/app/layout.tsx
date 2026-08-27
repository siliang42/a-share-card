import type {Metadata} from "next";
import type {ReactNode} from "react";

import {AppShell} from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {default: "股识数据维护台", template: "%s · 股识"},
  description: "A 股记忆学习系统的本地数据维护后台",
};

export default function RootLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <html lang="zh-CN">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
