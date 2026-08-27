"use client";

import type {PairingInfo} from "@gushi/contracts";
import {useEffect, useState} from "react";

import {getPairing} from "@/lib/api";
import {PairingPanel} from "./PairingPanel";

export function SettingsWorkspace() {
  const [pairing, setPairing] = useState<PairingInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getPairing().then(setPairing).catch((reason) => {
      setError(reason instanceof Error ? reason.message : "无法获取配对信息");
    });
  }, []);

  if (error) return <div className="page-state" role="alert">{error}</div>;
  if (!pairing) return <div className="page-state" role="status">正在生成局域网配对信息</div>;
  return <PairingPanel pairing={pairing} />;
}
