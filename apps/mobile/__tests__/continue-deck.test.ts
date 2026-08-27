import {resolveContinueDeck} from "@/src/features/home/continueDeck";

const catalog = {
  markets: [
    {id: "market:sh_main", name: "沪市主板", taxonomy: "market", stockCount: 1},
  ],
  sectors: [
    {id: "sector:shenwan:801730", name: "电力设备", taxonomy: "shenwan", stockCount: 2},
  ],
};

it("resumes the last sector deck instead of falling back to a market", () => {
  expect(resolveContinueDeck(catalog, "sector:shenwan:801730")).toEqual(catalog.sectors[0]);
});

it("uses the first market only when the saved deck no longer exists", () => {
  expect(resolveContinueDeck(catalog, "sector:removed")).toEqual(catalog.markets[0]);
});
