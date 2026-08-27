import type {Metadata} from "next";
import {SettingsWorkspace} from "@/components/SettingsWorkspace";

export const metadata: Metadata = {title: "连接设置"};

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><div><p className="eyebrow">APP PAIRING</p><h1>连接设置</h1></div><p>配对信息仅用于同一局域网中的股识 App。</p></header>
      <SettingsWorkspace />
    </div>
  );
}
