import {ArrowRight, Building2, Grid2X2, Search} from "lucide-react-native";
import {useMemo, useState} from "react";
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";

import type {LocalCatalog} from "@/src/db/repository";
import {colors, tabularNumbers} from "@/src/theme/tokens";

function DeckRow({
  deck,
  onOpenDeck,
}: {
  deck: LocalCatalog["markets"][number];
  onOpenDeck: (deckId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deck.name}，${deck.stockCount} 只股票`}
      onPress={() => onOpenDeck(deck.id)}
      style={({pressed}) => [styles.deckRow, pressed && styles.pressed]}
    >
      <View style={styles.deckCopy}>
        <Text style={styles.deckName}>{deck.name}</Text>
        <Text style={styles.deckCount}>{deck.stockCount} 只</Text>
      </View>
      <ArrowRight size={17} color={colors.faint} />
    </Pressable>
  );
}

export function MarketCatalog({
  catalog,
  onOpenDeck,
}: {
  catalog: LocalCatalog;
  onOpenDeck: (deckId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    return value ? catalog.sectors.filter((deck) => deck.name.toLocaleLowerCase().includes(value)) : catalog.sectors;
  }, [catalog.sectors, query]);
  const shenwan = matches.filter((deck) => deck.taxonomy === "shenwan");
  const concepts = matches.filter((deck) => deck.taxonomy === "concept");
  const other = matches.filter((deck) => !["shenwan", "concept"].includes(deck.taxonomy));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}><Building2 size={22} color={colors.inkBlue} /></View>
        <View>
          <Text style={styles.eyebrow}>MARKET DECKS</Text>
          <Text style={styles.title}>市场与板块</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>股票市场</Text>
      <View style={styles.rows}>{catalog.markets.map((deck) => <DeckRow key={deck.id} deck={deck} onOpenDeck={onOpenDeck} />)}</View>

      <View style={styles.searchBox}>
        <Search size={17} color={colors.faint} />
        <TextInput
          accessibilityLabel="搜索板块"
          onChangeText={setQuery}
          placeholder="搜索申万行业或概念"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.sectionHeading}>
        <Grid2X2 size={17} color={colors.inkBlue} />
        <Text style={styles.sectionTitleInline}>申万行业</Text>
        <Text style={styles.sectionCount}>{shenwan.length}</Text>
      </View>
      <View style={styles.rows}>
        {shenwan.length ? shenwan.map((deck) => <DeckRow key={deck.id} deck={deck} onOpenDeck={onOpenDeck} />) : <Text style={styles.empty}>没有匹配的申万行业</Text>}
      </View>

      <View style={styles.sectionHeading}>
        <Grid2X2 size={17} color={colors.inkBlue} />
        <Text style={styles.sectionTitleInline}>热门概念</Text>
        <Text style={styles.sectionCount}>{concepts.length}</Text>
      </View>
      <View style={styles.rows}>
        {concepts.length ? concepts.map((deck) => <DeckRow key={deck.id} deck={deck} onOpenDeck={onOpenDeck} />) : <Text style={styles.empty}>没有匹配的概念板块</Text>}
      </View>

      {other.length ? (
        <>
          <Text style={styles.sectionTitle}>其他分类</Text>
          <View style={styles.rows}>{other.map((deck) => <DeckRow key={deck.id} deck={deck} onOpenDeck={onOpenDeck} />)}</View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.canvas},
  content: {padding: 18, paddingBottom: 42},
  titleRow: {flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 22},
  titleIcon: {width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: "#E8EEF5"},
  eyebrow: {fontSize: 9, fontWeight: "700", color: colors.inkBlue},
  title: {marginTop: 2, fontSize: 24, fontWeight: "700", color: colors.inkBlueDark},
  sectionTitle: {marginTop: 8, marginBottom: 8, fontSize: 14, fontWeight: "700", color: colors.ink},
  rows: {borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface},
  deckRow: {height: 58, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: colors.border},
  pressed: {backgroundColor: "#EDF2F6"},
  deckCopy: {flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12},
  deckName: {flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink},
  deckCount: {...tabularNumbers, fontSize: 11, color: colors.muted},
  searchBox: {height: 42, marginTop: 24, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  searchInput: {height: 42, flex: 1, paddingVertical: 0, fontSize: 14, color: colors.ink},
  sectionHeading: {marginTop: 22, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 7},
  sectionTitleInline: {flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink},
  sectionCount: {...tabularNumbers, fontSize: 11, color: colors.muted},
  empty: {padding: 18, fontSize: 12, color: colors.muted},
});
