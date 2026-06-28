from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


MetricKey = Literal[
    "views",
    "completionRate",
    "interactionRate",
    "followerConversionRate",
    "followersGained",
    "commerceConversionRate",
    "liveGmv",
]


class AudienceSegment(BaseModel):
    label: str
    percentage: float
    note: str


class CreatorProfile(BaseModel):
    id: str
    handle: str
    displayName: str
    domain: str
    lifecycle: str
    contentFormats: list[str]
    goals: list[str]
    bottlenecks: list[str]
    audience: list[AudienceSegment]
    creatorHabits: list[str]
    tone: str


class MetricPoint(BaseModel):
    date: str
    views: float
    completionRate: float
    interactionRate: float
    followerConversionRate: float
    followersGained: float
    commerceConversionRate: float | None = None
    liveGmv: float | None = None


class TopContent(BaseModel):
    id: str
    title: str
    views: float
    completionRate: float
    interactionRate: float
    followerConversionRate: float
    hook: str
    opportunity: str


class DatasetSnapshot(BaseModel):
    profile: CreatorProfile
    summary: dict[str, Any]
    history: list[MetricPoint]
    topContents: list[TopContent]


class DataKernelLimits(BaseModel):
    maxRows: int = Field(default=200, ge=1, le=5000)
    maxExecutionMs: int = Field(default=3000, ge=100, le=30000)
    maxColumns: int = Field(default=40, ge=1, le=200)


class DataKernelRequest(BaseModel):
    requestId: str
    tool: Literal["profile_dataset", "create_chart_data", "explain_metric_drop", "run_sql"]
    creatorId: str
    dataset: DatasetSnapshot
    input: dict[str, Any] = Field(default_factory=dict)
    limits: DataKernelLimits = Field(default_factory=DataKernelLimits)


class KernelEvidence(BaseModel):
    sourceTable: str
    rowCount: int
    columns: list[str]
    excerpt: str
    metricKey: str | None = None


class KernelArtifact(BaseModel):
    id: str
    kind: Literal["table", "chart", "profile", "explanation"]
    title: str
    data: Any


class KernelError(BaseModel):
    code: str
    message: str
    detail: str | None = None


class DataKernelResponse(BaseModel):
    ok: bool
    requestId: str
    tool: str
    result: Any | None = None
    evidence: list[KernelEvidence] = Field(default_factory=list)
    artifacts: list[KernelArtifact] = Field(default_factory=list)
    stats: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    error: KernelError | None = None
