from app.domain.summaries import summarize_profile


def test_summary_precedence_is_manual_then_source_then_excerpt() -> None:
    manual = summarize_profile("外部主营", "公司聚焦电网业务。还有历史。", "人工主营")
    sourced = summarize_profile("外部主营", "公司聚焦电网业务。还有历史。", None)
    excerpt = summarize_profile(None, "  公司聚焦电网业务。还有历史。", None)

    assert (manual.text, manual.source) == ("人工主营", "manual")
    assert (sourced.text, sourced.source) == ("外部主营", "source")
    assert (excerpt.text, excerpt.source) == ("公司聚焦电网业务。", "excerpt")


def test_empty_profile_produces_no_invented_summary() -> None:
    result = summarize_profile(None, "  ", None)

    assert result.text is None
    assert result.source is None
