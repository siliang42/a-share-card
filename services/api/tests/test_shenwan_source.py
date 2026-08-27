from app.sources.shenwan import parse_components, parse_index_page


def test_shenwan_parser_preserves_taxonomy_and_members() -> None:
    sectors = parse_index_page(
        {
            "data": {
                "count": 1,
                "results": [
                    {"swindexcode": "801120", "swindexname": "食品饮料"}
                ],
            }
        }
    )
    memberships = parse_components(
        "shenwan:801120",
        {"data": {"results": [{"stockcode": "600519", "stockname": "贵州茅台"}]}},
    )

    assert sectors[0].taxonomy == "shenwan"
    assert sectors[0].id == "shenwan:801120"
    assert memberships[0].stock_symbol == "600519"
