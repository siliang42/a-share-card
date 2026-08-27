"use client";

import type {PairingInfo} from "@gushi/contracts";
import {Copy, Eye, EyeOff, Smartphone} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import {useState} from "react";

export function PairingPanel({pairing}: {pairing: PairingInfo}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const payload = JSON.stringify({baseUrl: pairing.baseUrl, token: pairing.token});

  async function copyConnection() {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
  }

  return (
    <section className="pairing-panel" aria-labelledby="pairing-title">
      <div className="pairing-copy">
        <p className="eyebrow">LOCAL CONNECTION</p>
        <h2 id="pairing-title">连接手机 App</h2>
        <p className="supporting-copy">让手机与这台 Mac 使用同一局域网，然后在 App 设置中扫描二维码。</p>
        <dl className="connection-list">
          <div><dt>服务</dt><dd>{pairing.service}</dd></div>
          <div><dt>局域网地址</dt><dd className="mono-cell">{pairing.baseUrl}</dd></div>
          <div>
            <dt>配对令牌</dt>
            <dd className="token-row">
              <code>{revealed ? pairing.token : "••••••••••••••••"}</code>
              <button
                className="icon-button"
                type="button"
                aria-label={revealed ? "隐藏配对令牌" : "显示配对令牌"}
                onClick={() => setRevealed((value) => !value)}
              >
                {revealed ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
              </button>
            </dd>
          </div>
        </dl>
        <button className="secondary-button" type="button" onClick={copyConnection}>
          <Copy aria-hidden="true" size={16} />
          {copied ? "连接信息已复制" : "复制连接信息"}
        </button>
      </div>
      <div className="qr-stage">
        <Smartphone aria-hidden="true" size={18} />
        <QRCodeSVG
          value={payload}
          role="img"
          aria-label="App 配对二维码"
          size={184}
          level="M"
          marginSize={2}
          bgColor="#FFFFFF"
          fgColor="#173F6F"
        />
      </div>
    </section>
  );
}
