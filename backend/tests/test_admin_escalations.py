from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from sunline_agent.admin_api import build_admin_router
from sunline_agent.db import AgentEscalation, make_session_factory

URL = "/api/agent/admin/escalations"


def _client(get_admin):
    log_sf = make_session_factory("sqlite://")
    with log_sf() as s:
        s.add(AgentEscalation(reason="other", summary="cas de test", language="fr", status="open"))
        s.commit()
    app = FastAPI()
    app.include_router(build_admin_router(get_admin=get_admin, log_sf=log_sf), prefix="/api/agent/admin")
    return TestClient(app)


def _allow():
    return object()


def _deny():
    raise HTTPException(status_code=403, detail="Forbidden")


def test_every_route_is_behind_the_admin_dependency():
    c = _client(_deny)
    assert c.get(URL).status_code == 403
    assert c.patch(URL + "/1", json={"status": "done"}).status_code == 403


def test_list_filter_and_close():
    c = _client(_allow)
    assert len(c.get(URL).json()) == 1
    assert len(c.get(URL + "?status=done").json()) == 0
    r = c.patch(URL + "/1", json={"status": "done"})
    assert r.status_code == 200 and r.json()["status"] == "done"
    assert len(c.get(URL + "?status=open").json()) == 0


def test_patch_validation():
    c = _client(_allow)
    assert c.patch(URL + "/999", json={"status": "done"}).status_code == 404
    assert c.patch(URL + "/1", json={"status": "hacked"}).status_code == 422