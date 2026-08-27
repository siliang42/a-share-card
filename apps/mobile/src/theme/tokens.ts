import type {TextStyle} from "react-native";

export const colors = {
  canvas: "#F4F6F8",
  surface: "#FFFFFF",
  ink: "#172330",
  inkBlue: "#173F6F",
  inkBlueDark: "#102D50",
  muted: "#677584",
  faint: "#8B98A5",
  border: "#D7DEE5",
  borderStrong: "#C4CDD6",
  study: "#D5A82E",
  studySoft: "#FFF6D8",
  rise: "#C83A3A",
  fall: "#21855B",
  stale: "#A06612",
} as const;

export const boardLabels: Record<string, string> = {
  SH_MAIN: "沪市主板",
  SZ_MAIN: "深市主板",
  CHINEXT: "创业板",
  STAR: "科创板",
  BSE: "北交所",
  sh_main: "沪市主板",
  sz_main: "深市主板",
  chinext: "创业板",
  star: "科创板",
  bse: "北交所",
};

export const tabularNumbers: TextStyle = {fontVariant: ["tabular-nums"]};
