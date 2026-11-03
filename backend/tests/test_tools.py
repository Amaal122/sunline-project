from sqlalchemy import text

from sunline_agent.db import make_data_session_factory, make_engine
from sunline_agent.seed_demo import seed
from sunline_agent.tools import SearchProductsArgs, search_products


def test_search_reports_in_stock_flag():
    engine = make_engine("sqlite:///:memory:")
    seed(engine)
    from sqlalchemy.orm import sessionmaker
    with sessionmaker(engine)() as s:
        res = search_products(s, SearchProductsArgs(query="jean", max_price=80), {})
    assert [p["name"] for p in res["products"]] == ["Jean Slim Gris"]
    assert res["products"][0]["in_stock"] is False       # slim gris: stock 0 everywhere
    with sessionmaker(engine)() as s:
        res = search_products(s, SearchProductsArgs(query="jean noir"), {})
    assert res["products"][0]["in_stock"] is True
