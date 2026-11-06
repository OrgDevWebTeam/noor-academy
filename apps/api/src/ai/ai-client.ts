import {
  type AiResult,
  type RecitationLevel,
  aiFallbackResult,
  aiResultSchema,
} from "@noor/contracts";

export interface RecitationRequest {
  attemptId: string;
  surah: number;
  ayah: number;
  level: RecitationLevel;
  audio: { buffer: Buffer; mimeType: string; fileName: string };
}

/** Why the API used the fallback result. Logged, never shown to the child. */
export type AiFailure = "timeout" | "unreachable" | "bad_status" | "invalid_result";

export interface AiOutcome {
  result: AiResult;
  failure: AiFailure | null;
}

export interface AiClient {
  /** Never throws: any failure becomes an "uncertain" fallback result (Architecture 8.5). */
  analyzeRecitation(request: RecitationRequest): Promise<AiOutcome>;
}

/**
 * HTTP client for the internal AI service. Only the attempt id, surah, ayah, level and the
 * audio are sent: no child id, family id or name crosses this boundary.
 */
export function createAiClient(options: {
  baseUrl: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
}): AiClient {
  const fetchFn = options.fetchFn ?? fetch;
  const url = new URL("/v1/recitation/analyze", options.baseUrl).toString();

  return {
    async analyzeRecitation(request) {
      const started = Date.now();
      const fallback = (failure: AiFailure): AiOutcome => ({
        result: aiFallbackResult(request.attemptId, Date.now() - started),
        failure,
      });

      const form = new FormData();
      form.set("attemptId", request.attemptId);
      form.set("surah", String(request.surah));
      form.set("ayah", String(request.ayah));
      form.set("level", request.level);
      form.set(
        "audio",
        new Blob([new Uint8Array(request.audio.buffer)], { type: request.audio.mimeType }),
        request.audio.fileName,
      );

      let response: Response;
      try {
        response = await fetchFn(url, {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(options.timeoutMs),
        });
      } catch (error) {
        const name = (error as { name?: string }).name;
        return fallback(
          name === "TimeoutError" || name === "AbortError" ? "timeout" : "unreachable",
        );
      }
      if (!response.ok) return fallback("bad_status");

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return fallback("invalid_result");
      }
      const parsed = aiResultSchema.safeParse(body);
      // A result for another attempt is as bad as a malformed one.
      if (!parsed.success || parsed.data.attemptId !== request.attemptId) {
        return fallback("invalid_result");
      }
      return { result: parsed.data, failure: null };
    },
  };
}
