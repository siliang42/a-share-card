from dataclasses import dataclass
import re


@dataclass(frozen=True)
class SummaryResult:
    text: str | None
    source: str | None


def summarize_profile(
    source_summary: str | None,
    company_intro: str | None,
    manual_override: str | None,
) -> SummaryResult:
    manual = (manual_override or "").strip()
    if manual:
        return SummaryResult(text=manual, source="manual")

    sourced = (source_summary or "").strip()
    if sourced:
        return SummaryResult(text=sourced, source="source")

    introduction = (company_intro or "").strip()
    if not introduction:
        return SummaryResult(text=None, source=None)
    sentence = re.match(r"^.*?[。！？!?](?:\s|$)?", introduction)
    excerpt = sentence.group(0).strip() if sentence else introduction[:160].strip()
    return SummaryResult(text=excerpt[:160], source="excerpt")
