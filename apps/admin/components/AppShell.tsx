"use client";

import {
  Blocks,
  Database,
  FileInput,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import type {ReactNode} from "react";

const NAVIGATION = [
  {href: "/", label: "数据总览", icon: LayoutDashboard},
  {href: "/stocks", label: "股票维护", icon: Database},
  {href: "/sectors", label: "板块目录", icon: Blocks},
  {href: "/imports", label: "导入导出", icon: FileInput},
  {href: "/settings", label: "连接设置", icon: Settings},
];

export function AppShell({children}: {children: ReactNode}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="股识数据后台首页">
          <span className="brand-mark">股</span>
          <span><strong>股识</strong><small>数据维护台</small></span>
        </Link>
        <nav aria-label="后台主导航">
          {NAVIGATION.map(({href, label, icon: Icon}) => {
            const active = href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link href={href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} key={href}>
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <ShieldCheck aria-hidden="true" size={17} />
          <span><strong>本地数据服务</strong><small>仅此 Mac 可维护</small></span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="service-status"><span aria-hidden="true" />本地维护模式</div>
          <p>公开数据仅供学习，不构成投资建议</p>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
