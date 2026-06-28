import {
  DataKernelRequestSchema,
  DataKernelResponseSchema,
  type DataKernelLimits,
  type DataKernelRequest,
  type DataKernelResponse,
  type DataKernelToolName,
  type DatasetSnapshot,
  type DiagnosisResponse
} from "@creator/data-contracts";

export type DataKernelClientOptions = {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type RunKernelToolOptions = {
  diagnosis: DiagnosisResponse;
  tool: DataKernelToolName;
  input?: Record<string, unknown>;
  limits?: Partial<DataKernelLimits>;
  requestId?: string;
};

export const createDatasetSnapshot = (diagnosis: DiagnosisResponse): DatasetSnapshot => ({
  profile: diagnosis.creator,
  summary: diagnosis.metrics.summary,
  history: diagnosis.metrics.history,
  topContents: diagnosis.metrics.topContents
});

const defaultRequestId = () => `kernel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createDataKernelClient = ({
  baseUrl = process.env.DATA_KERNEL_URL ?? "http://127.0.0.1:8790",
  token = process.env.DATA_KERNEL_TOKEN,
  timeoutMs = 5000,
  fetchImpl = fetch
}: DataKernelClientOptions = {}) => {
  const runTool = async ({ diagnosis, tool, input = {}, limits = {}, requestId = defaultRequestId() }: RunKernelToolOptions): Promise<DataKernelResponse> => {
    const request: DataKernelRequest = DataKernelRequestSchema.parse({
      requestId,
      tool,
      creatorId: diagnosis.creator.id,
      dataset: createDatasetSnapshot(diagnosis),
      input,
      limits
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/tools/${tool}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        return DataKernelResponseSchema.parse({
          ok: false,
          requestId,
          tool,
          error: {
            code: `HTTP_${response.status}`,
            message: "Data kernel request failed.",
            detail: JSON.stringify(payload)
          }
        });
      }

      return DataKernelResponseSchema.parse(payload);
    } catch (error) {
      return DataKernelResponseSchema.parse({
        ok: false,
        requestId,
        tool,
        error: {
          code: error instanceof DOMException && error.name === "AbortError" ? "TIMEOUT" : "CLIENT_ERROR",
          message: error instanceof Error ? error.message : "Data kernel client failed."
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  const health = async () => {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/health`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined
    });

    return response.ok;
  };

  return {
    health,
    runTool
  };
};
