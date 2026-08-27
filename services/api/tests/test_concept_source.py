from app.sources.eastmoney import parse_concept_catalog, parse_concept_members


def test_concept_parser_never_labels_rows_as_shenwan() -> None:
    sectors = parse_concept_catalog(
        {"rc": 0, "data": {"diff": [{"f12": "BK0818", "f14": "可燃冰"}]}}
    )
    members = parse_concept_members(
        "eastmoney_concept:BK0818",
        {"rc": 0, "data": {"diff": [{"f12": "000400", "f13": 0, "f14": "许继电气"}]}},
    )

    assert sectors[0].taxonomy == "eastmoney_concept"
    assert sectors[0].id == "eastmoney_concept:BK0818"
    assert members[0].stock_symbol == "000400"
