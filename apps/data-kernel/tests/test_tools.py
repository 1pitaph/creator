from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def snapshot() -> dict:
    return {
        "profile": {
            "id": "starter-food",
            "handle": "@三分钟家常菜",
            "displayName": "三分钟家常菜",
            "domain": "美食教程",
            "lifecycle": "new",
            "contentFormats": ["short_video"],
            "goals": ["increase_views"],
            "bottlenecks": ["前 3 秒点击后流失高"],
            "audience": [{"label": "通勤族", "percentage": 60, "note": "晚间活跃"}],
            "creatorHabits": ["周末拍摄"],
            "tone": "直接实用",
        },
        "summary": {
            "views7d": 184000,
            "viewsChangePct": 22,
            "completionRate": 0.39,
            "interactionRate": 0.048,
            "followerGain7d": 1260,
            "followerConversionRate": 0.0068,
            "publishCount7d": 4,
        },
        "history": [
            {"date": "2026-06-21", "views": 19000, "completionRate": 0.34, "interactionRate": 0.039, "followerConversionRate": 0.0048, "followersGained": 92},
            {"date": "2026-06-22", "views": 22000, "completionRate": 0.36, "interactionRate": 0.041, "followerConversionRate": 0.0052, "followersGained": 114},
            {"date": "2026-06-23", "views": 26000, "completionRate": 0.37, "interactionRate": 0.047, "followerConversionRate": 0.0061, "followersGained": 159},
            {"date": "2026-06-24", "views": 21000, "completionRate": 0.35, "interactionRate": 0.043, "followerConversionRate": 0.0055, "followersGained": 121},
            {"date": "2026-06-25", "views": 30000, "completionRate": 0.41, "interactionRate": 0.051, "followerConversionRate": 0.007, "followersGained": 224},
            {"date": "2026-06-26", "views": 33000, "completionRate": 0.42, "interactionRate": 0.057, "followerConversionRate": 0.0076, "followersGained": 281},
        ],
        "topContents": [
            {"id": "v1", "title": "下班 10 分钟做出番茄肥牛饭", "views": 68000, "completionRate": 0.47, "interactionRate": 0.061, "followerConversionRate": 0.0084, "hook": "开头直接展示成品和耗时", "opportunity": "固定系列名"}
        ],
    }


def request(tool: str, input_data: dict | None = None, limits: dict | None = None) -> dict:
    return {
        "requestId": f"test-{tool}",
        "tool": tool,
        "creatorId": "starter-food",
        "dataset": snapshot(),
        "input": input_data or {},
        "limits": limits or {"maxRows": 3, "maxExecutionMs": 3000, "maxColumns": 10},
    }


def test_profile_dataset() -> None:
    client = TestClient(app)
    response = client.post("/tools/profile_dataset", json=request("profile_dataset"))
    payload = response.json()
    assert response.status_code == 200
    assert payload["ok"] is True
    assert payload["result"]["history"]["rowCount"] == 6


def test_create_chart_data_truncates() -> None:
    client = TestClient(app)
    response = client.post("/tools/create_chart_data", json=request("create_chart_data", {"metricKeys": ["views", "completionRate"]}))
    payload = response.json()
    assert payload["ok"] is True
    assert payload["result"]["truncated"] is True
    assert len(payload["result"]["rows"]) == 3


def test_explain_metric_drop() -> None:
    client = TestClient(app)
    response = client.post("/tools/explain_metric_drop", json=request("explain_metric_drop", {"metricKey": "completionRate"}))
    payload = response.json()
    assert payload["ok"] is True
    assert payload["result"]["metricKey"] == "completionRate"


def test_run_sql_allows_select_and_rejects_mutation() -> None:
    client = TestClient(app)
    ok = client.post("/tools/run_sql", json=request("run_sql", {"sql": "select date, views from history order by views desc"})).json()
    denied = client.post("/tools/run_sql", json=request("run_sql", {"sql": "delete from history"})).json()
    assert ok["ok"] is True
    assert ok["result"]["truncated"] is True
    assert denied["ok"] is False
    assert denied["error"]["code"] == "VALIDATION_ERROR"


def test_run_sql_allows_with_and_blocks_file_network_access() -> None:
    client = TestClient(app)
    ok = client.post("/tools/run_sql", json=request("run_sql", {"sql": "with ranked as (select date, views from history) select * from ranked"})).json()
    file_denied = client.post("/tools/run_sql", json=request("run_sql", {"sql": "select * from read_csv_auto('/tmp/leak.csv')"})).json()
    url_denied = client.post("/tools/run_sql", json=request("run_sql", {"sql": "select 'https://example.com/data.csv' as url"})).json()
    multi_denied = client.post("/tools/run_sql", json=request("run_sql", {"sql": "select * from history; select * from profile"})).json()
    assert ok["ok"] is True
    assert file_denied["ok"] is False
    assert url_denied["ok"] is False
    assert multi_denied["ok"] is False


def test_run_sql_enforces_max_columns() -> None:
    client = TestClient(app)
    payload = client.post(
        "/tools/run_sql",
        json=request("run_sql", {"sql": "select * from history"}, {"maxRows": 10, "maxExecutionMs": 3000, "maxColumns": 2}),
    ).json()
    assert payload["ok"] is False
    assert payload["error"]["code"] == "TOO_MANY_COLUMNS"


def test_run_sql_timeout() -> None:
    client = TestClient(app)
    payload = client.post(
        "/tools/run_sql",
        json=request(
            "run_sql",
            {"sql": "select sum(a.i * b.i) from range(10000000) a(i), range(10000000) b(i)"},
            {"maxRows": 3, "maxExecutionMs": 100, "maxColumns": 10},
        ),
    ).json()
    assert payload["ok"] is False
    assert payload["error"]["code"] == "TIMEOUT"


def test_tool_path_mismatch_and_token_auth(monkeypatch) -> None:
    client = TestClient(app)
    mismatch = client.post("/tools/profile_dataset", json=request("run_sql", {"sql": "select * from history"}))
    assert mismatch.status_code == 400

    monkeypatch.setenv("DATA_KERNEL_TOKEN", "secret")
    unauthorized = client.post("/tools/profile_dataset", json=request("profile_dataset"))
    authorized = client.post("/tools/profile_dataset", headers={"authorization": "Bearer secret"}, json=request("profile_dataset"))
    assert unauthorized.status_code == 401
    assert authorized.status_code == 200

    monkeypatch.delenv("DATA_KERNEL_TOKEN")
    monkeypatch.setenv("DATA_KERNEL_REQUIRE_TOKEN", "1")
    missing_token = client.post("/tools/profile_dataset", json=request("profile_dataset"))
    assert missing_token.status_code == 503
