from __future__ import annotations

import re
import time
from typing import Any

import duckdb
import pandas as pd

from .schemas import DataKernelRequest, DataKernelResponse, KernelArtifact, KernelError, KernelEvidence


METRIC_COLUMNS = {
    "views",
    "completionRate",
    "interactionRate",
    "followerConversionRate",
    "followersGained",
    "commerceConversionRate",
    "liveGmv",
}

DENIED_SQL = re.compile(
    r"\b(copy|install|load|attach|export|create|insert|update|delete|drop|alter|pragma|call|read_csv|read_parquet|read_json|httpfs)\b",
    re.IGNORECASE,
)


def _snapshot_frames(request: DataKernelRequest) -> dict[str, pd.DataFrame]:
    dataset = request.dataset
    profile = dataset.profile.model_dump()
    profile["audienceLabels"] = ",".join(item.label for item in dataset.profile.audience)
    profile["goals"] = ",".join(dataset.profile.goals)
    profile["bottlenecks"] = ",".join(dataset.profile.bottlenecks)

    return {
        "profile": pd.DataFrame([profile]),
        "summary": pd.DataFrame([dataset.summary]),
        "history": pd.DataFrame([item.model_dump() for item in dataset.history]),
        "top_contents": pd.DataFrame([item.model_dump() for item in dataset.topContents]),
    }


def _evidence(source_table: str, frame: pd.DataFrame, excerpt: str, metric_key: str | None = None) -> KernelEvidence:
    return KernelEvidence(
        sourceTable=source_table,
        rowCount=int(len(frame)),
        columns=[str(column) for column in frame.columns],
        excerpt=excerpt,
        metricKey=metric_key,
    )


def profile_dataset(request: DataKernelRequest) -> DataKernelResponse:
    frames = _snapshot_frames(request)
    profile: dict[str, Any] = {}
    evidence: list[KernelEvidence] = []

    for name, frame in frames.items():
        numeric = frame.select_dtypes(include="number")
        profile[name] = {
            "rowCount": int(len(frame)),
            "columns": [
                {
                    "name": str(column),
                    "dtype": str(frame[column].dtype),
                    "nullCount": int(frame[column].isna().sum()),
                    "nullRate": float(frame[column].isna().mean()) if len(frame) else 0.0,
                }
                for column in frame.columns
            ],
            "numericSummary": numeric.describe().fillna(0).to_dict() if not numeric.empty else {},
        }
        evidence.append(_evidence(name, frame, f"{name} has {len(frame)} rows and {len(frame.columns)} columns."))

    return DataKernelResponse(
        ok=True,
        requestId=request.requestId,
        tool=request.tool,
        result=profile,
        evidence=evidence,
        artifacts=[KernelArtifact(id="dataset-profile", kind="profile", title="Dataset profile", data=profile)],
        stats={"tables": len(frames), "metricColumns": sorted(METRIC_COLUMNS)},
    )


def create_chart_data(request: DataKernelRequest) -> DataKernelResponse:
    frames = _snapshot_frames(request)
    history = frames["history"].copy()
    metric_keys = request.input.get("metricKeys") or ["views", "completionRate", "interactionRate", "followerConversionRate"]
    metric_keys = [key for key in metric_keys if key in history.columns]

    rows: list[dict[str, Any]] = []
    for _, row in history.iterrows():
        for key in metric_keys:
            value = row.get(key)
            if pd.notna(value):
                rows.append({"date": row["date"], "metric": key, "value": float(value)})

    max_rows = request.limits.maxRows
    truncated = len(rows) > max_rows
    rows = rows[:max_rows]

    result = {
        "rows": rows,
        "rowCount": len(rows),
        "truncated": truncated,
        "metricKeys": metric_keys,
    }

    return DataKernelResponse(
        ok=True,
        requestId=request.requestId,
        tool=request.tool,
        result=result,
        evidence=[_evidence("history", history, f"Prepared {len(rows)} chart rows from history.")],
        artifacts=[KernelArtifact(id="chart-data", kind="chart", title="Chart data", data=result)],
        warnings=["Result truncated to maxRows."] if truncated else [],
    )


def explain_metric_drop(request: DataKernelRequest) -> DataKernelResponse:
    frames = _snapshot_frames(request)
    history = frames["history"]
    metric_key = str(request.input.get("metricKey") or "views")

    if metric_key not in history.columns:
        return DataKernelResponse(
            ok=False,
            requestId=request.requestId,
            tool=request.tool,
            error=KernelError(code="UNKNOWN_METRIC", message=f"Metric {metric_key} is not available."),
        )

    midpoint = max(1, len(history) // 2)
    baseline = history.iloc[:midpoint][metric_key].dropna()
    current = history.iloc[midpoint:][metric_key].dropna()
    baseline_mean = float(baseline.mean()) if not baseline.empty else 0.0
    current_mean = float(current.mean()) if not current.empty else 0.0
    delta = current_mean - baseline_mean
    delta_pct = (delta / baseline_mean * 100) if baseline_mean else 0.0

    correlations: dict[str, float] = {}
    for key in sorted(METRIC_COLUMNS.intersection(history.columns)):
        if key == metric_key:
            continue
        series = history[[metric_key, key]].dropna()
        if len(series) >= 2:
            correlations[key] = float(series[metric_key].corr(series[key]))

    strongest = sorted(correlations.items(), key=lambda item: abs(item[1]), reverse=True)[:3]
    result = {
        "metricKey": metric_key,
        "baselineMean": baseline_mean,
        "currentMean": current_mean,
        "delta": delta,
        "deltaPct": delta_pct,
        "direction": "down" if delta < 0 else "up" if delta > 0 else "flat",
        "relatedSignals": [{"metricKey": key, "correlation": value} for key, value in strongest],
        "confidence": "medium" if len(history) >= 6 else "low",
    }

    return DataKernelResponse(
        ok=True,
        requestId=request.requestId,
        tool=request.tool,
        result=result,
        evidence=[_evidence("history", history, f"{metric_key} changed {delta_pct:.1f}% across the split window.", metric_key)],
        artifacts=[KernelArtifact(id="metric-drop-explanation", kind="explanation", title="Metric movement explanation", data=result)],
        warnings=["Sample size is small; treat correlation as directional only."],
    )


def _validate_sql(sql: str) -> str:
    stripped = sql.strip().rstrip(";")
    lowered = stripped.lower()
    if not (lowered.startswith("select") or lowered.startswith("with")):
        raise ValueError("Only SELECT or WITH queries are allowed.")
    if DENIED_SQL.search(stripped):
        raise ValueError("Query contains a denied SQL keyword or file/network function.")
    return stripped


def run_sql(request: DataKernelRequest) -> DataKernelResponse:
    sql = _validate_sql(str(request.input.get("sql") or ""))
    frames = _snapshot_frames(request)
    started = time.monotonic()

    try:
        connection = duckdb.connect(database=":memory:")
        connection.execute("SET memory_limit='128MB'")
        connection.execute("SET threads=1")
        for name, frame in frames.items():
            connection.register(name, frame)
        result_frame = connection.execute(sql).fetchdf()
    finally:
        try:
            connection.close()
        except Exception:
            pass

    elapsed_ms = int((time.monotonic() - started) * 1000)
    if elapsed_ms > request.limits.maxExecutionMs:
        return DataKernelResponse(
            ok=False,
            requestId=request.requestId,
            tool=request.tool,
            error=KernelError(code="TIMEOUT", message="Query exceeded maxExecutionMs."),
            stats={"elapsedMs": elapsed_ms},
        )

    if len(result_frame.columns) > request.limits.maxColumns:
        return DataKernelResponse(
            ok=False,
            requestId=request.requestId,
            tool=request.tool,
            error=KernelError(code="TOO_MANY_COLUMNS", message="Query returned too many columns."),
            stats={"elapsedMs": elapsed_ms, "columns": len(result_frame.columns)},
        )

    truncated = len(result_frame) > request.limits.maxRows
    limited = result_frame.head(request.limits.maxRows)
    rows = limited.where(pd.notnull(limited), None).to_dict(orient="records")
    result = {
        "columns": [str(column) for column in result_frame.columns],
        "rows": rows,
        "rowCount": int(len(result_frame)),
        "truncated": truncated,
        "elapsedMs": elapsed_ms,
    }

    return DataKernelResponse(
        ok=True,
        requestId=request.requestId,
        tool=request.tool,
        result=result,
        evidence=[_evidence("sql", result_frame, f"SQL returned {len(result_frame)} rows in {elapsed_ms}ms.")],
        artifacts=[KernelArtifact(id="sql-result", kind="table", title="SQL result", data=result)],
        stats={"elapsedMs": elapsed_ms},
        warnings=["Result truncated to maxRows."] if truncated else [],
    )


TOOLS = {
    "profile_dataset": profile_dataset,
    "create_chart_data": create_chart_data,
    "explain_metric_drop": explain_metric_drop,
    "run_sql": run_sql,
}


def execute_tool(request: DataKernelRequest) -> DataKernelResponse:
    try:
        return TOOLS[request.tool](request)
    except ValueError as error:
        return DataKernelResponse(
            ok=False,
            requestId=request.requestId,
            tool=request.tool,
            error=KernelError(code="VALIDATION_ERROR", message=str(error)),
        )
    except Exception as error:
        return DataKernelResponse(
            ok=False,
            requestId=request.requestId,
            tool=request.tool,
            error=KernelError(code="EXECUTION_ERROR", message="Tool execution failed.", detail=str(error)),
        )
