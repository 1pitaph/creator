from __future__ import annotations

import os
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

from .schemas import DataKernelRequest, DataKernelResponse
from .tools import execute_tool


app = FastAPI(title="Creator Data Kernel", version="0.1.0")


def verify_token(authorization: Annotated[str | None, Header()] = None) -> None:
    expected = os.getenv("DATA_KERNEL_TOKEN")
    if not expected:
        return
    if authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="Invalid data kernel token")


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "service": "creator-data-kernel"}


@app.post("/tools/{tool_name}", response_model=DataKernelResponse)
def run_tool(tool_name: str, request: DataKernelRequest, _: None = Depends(verify_token)) -> DataKernelResponse:
    if tool_name != request.tool:
        raise HTTPException(status_code=400, detail="Path tool does not match request tool")
    return execute_tool(request)
