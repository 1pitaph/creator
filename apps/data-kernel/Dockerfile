FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_KERNEL_REQUIRE_TOKEN=1 \
    DATA_KERNEL_HOST=0.0.0.0 \
    DATA_KERNEL_PORT=8790

WORKDIR /app

COPY pyproject.toml ./
RUN python -m pip install --upgrade pip && python -m pip install .

COPY app ./app

RUN useradd --create-home --shell /usr/sbin/nologin kernel
USER kernel

EXPOSE 8790
HEALTHCHECK --interval=10s --timeout=5s --retries=6 --start-period=10s CMD ["python", "-m", "app.healthcheck"]
CMD ["sh", "-c", "python -m uvicorn app.main:app --host ${DATA_KERNEL_HOST} --port ${DATA_KERNEL_PORT}"]
