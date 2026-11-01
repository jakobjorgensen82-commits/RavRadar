import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertAllowedOrigin, corsHeaders, enforceRateLimits, GatewayError, readJsonObject, safeGatewayError } from "../_shared/public-gateway.ts";
import {
  assistantPrompt,
  assistantIdentificationPolicy,
  assistantIdentificationFocusAnswer,
  assistantScoreFindAnswer,
  assistantSystemInstruction,
  extractCloudflareAssistantResult,
  normaliseAssistantLocale,
  RAV_ASSISTANT_BINDING_HEADERS,
  RAV_ASSISTANT_KNOWLEDGE_SCHEMA,
  RAV_ASSISTANT_KNOWLEDGE_SHA256,
  RAV_ASSISTANT_MODEL,
  RAV_ASSISTANT_SUCCESS_PROVENANCE,
  RAV_ASSISTANT_REFUSALS,
  RAV_ASSISTANT_REJECTION_CODES,
  RAV_ASSISTANT_RAVSCORE_MODEL_BINDING,
  routeAssistantQuestion,
  sameAssistantRavScoreModelBinding,
  validateAssistantResult,
} from "../_shared/rav-assistant-contract.ts";

function assistantHeaders(request: Request) {
  const headers: Record<string, string> = {
    ...corsHeaders(request),
    "Access-Control-Expose-Headers": [...Object.values(RAV_ASSISTANT_BINDING_HEADERS), RAV_ASSISTANT_SUCCESS_PROVENANCE.header].join(", "),
    [RAV_ASSISTANT_BINDING_HEADERS.modelId]: RAV_ASSISTANT_RAVSCORE_MODEL_BINDING.modelId,
    [RAV_ASSISTANT_BINDING_HEADERS.modelStateVersion]: RAV_ASSISTANT_RAVSCORE_MODEL_BINDING.stateSchemaVersion,
    [RAV_ASSISTANT_BINDING_HEADERS.modelContractSha256]: RAV_ASSISTANT_RAVSCORE_MODEL_BINDING.modelContractSha256,
    [RAV_ASSISTANT_BINDING_HEADERS.modelBundleSha256]: RAV_ASSISTANT_RAVSCORE_MODEL_BINDING.modelBundleSha256,
    [RAV_ASSISTANT_BINDING_HEADERS.knowledgeSchema]: RAV_ASSISTANT_KNOWLEDGE_SCHEMA,
    [RAV_ASSISTANT_BINDING_HEADERS.knowledgeSha256]: RAV_ASSISTANT_KNOWLEDGE_SHA256,
  };
  return headers;
}

function assistantJsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...assistantHeaders(request) },
  });
}

function assistantErrorResponse(request: Request, error: unknown) {
  const response = safeGatewayError(request, error);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(assistantHeaders(request))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Assistant-only deadline. Shared gateway/auth/quota implementations stay exact.
// The quota leaf may finish later; it contains no continuation to the provider.
function assistantDeadline(requestSignal: AbortSignal) {
  const end = performance.now() + 7_000;
  const controller = new AbortController(); let closed = false; let expired = false;
  let rejectDeadline: (reason: unknown) => void = () => {};
  const failure = () => new GatewayError(504, "UPSTREAM_TIMEOUT");
  const expiredPromise = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
  void expiredPromise.catch(() => {});
  const expire = () => { if (!expired) { expired = true; controller.abort(); rejectDeadline(failure()); } };
  const timer = setTimeout(expire, 7_000);
  requestSignal.addEventListener("abort", expire, { once:true });
  if (requestSignal.aborted) expire();
  const check = () => { if (closed || expired || performance.now() >= end) { expire(); throw failure(); } };
  return {
    signal: controller.signal, check,
    async wait<T>(pending: Promise<T>): Promise<T> {
      check(); const value = await Promise.race([pending, expiredPromise]); check(); return value;
    },
    close() { closed = true; clearTimeout(timer); requestSignal.removeEventListener("abort", expire); controller.abort(); },
  };
}
type AssistantDeadline = ReturnType<typeof assistantDeadline>;
function assistantRequestBody(request: Request, deadline: AssistantDeadline) {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let cancelled = false; let bytes = 0;
  const cancel = () => {
    if (cancelled) return; cancelled = true;
    if (reader) { const owned = reader; reader = null; void owned.cancel().catch(() => {});
      try { owned.releaseLock(); } catch { /* A pending owned read settles on cancellation. */ } }
  };
  // Preserve the normal pre-read method/origin/declared-size gates. The stream
  // has zero prefetch and acquires its reader only when readJsonObject consumes.
  if (request.method !== "POST" || Number(request.headers.get("content-length") || 0) > 16 * 1024 || !request.body)
    return { request, cancel };
  const stream = new ReadableStream<Uint8Array>({
    async pull(output) {
      try {
        deadline.check(); if (!reader) reader = request.body!.getReader();
        const owned = reader; const row = await deadline.wait(owned.read()); deadline.check();
        if (row.done) { reader = null; owned.releaseLock(); output.close(); return; }
        bytes += row.value.byteLength;
        if (bytes > 16 * 1024) throw new GatewayError(413, "PAYLOAD_TOO_LARGE");
        output.enqueue(row.value);
      } catch (error) { cancel(); output.error(error); }
    },
    cancel,
  }, { highWaterMark: 0 });
  return { request:new Request(request, { body:stream, duplex:"half" } as RequestInit & { duplex:"half" }), cancel };
}
async function assistantProviderJson(response: Response, deadline: AssistantDeadline) {
  deadline.check();
  if (!response.body) throw new GatewayError(502, "ASSISTANT_RESPONSE_REJECTED");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0; let done = false;
  try {
    while (true) {
      deadline.check(); const row = await deadline.wait(reader.read()); deadline.check();
      if (row.done) { done = true; break; }
      bytes += row.value.byteLength;
      if (bytes > 64 * 1024) throw new GatewayError(502, "ASSISTANT_RESPONSE_REJECTED");
      chunks.push(row.value);
    }
    const body = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const value = JSON.parse(new TextDecoder().decode(body)); deadline.check(); return value;
  } finally {
    if (!done) void reader.cancel().catch(() => {});
    try { reader.releaseLock(); } catch { /* Only this owned reader is closed. */ }
  }
}
function assistantProviderResponse(request: Request, answer: string) {
  const response = assistantJsonResponse(request, { answer });
  const headers = new Headers(response.headers);
  headers.set(RAV_ASSISTANT_SUCCESS_PROVENANCE.header, RAV_ASSISTANT_SUCCESS_PROVENANCE.value);
  return new Response(response.body, { status:response.status, headers });
}

function cloudflareCredential() {
  const accountId = String(Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "").trim();
  const token = String(Deno.env.get("CLOUDFLARE_WORKERS_AI_TOKEN") || "").trim();
  if (!/^[a-f0-9]{32}$/i.test(accountId) || token.length < 20) throw new GatewayError(503, "ASSISTANT_NOT_CONFIGURED");
  return { accountId, token };
}

// Failure observation contains only fixed categories and numeric HTTP status.
// A missing/failing logger must preserve the original public error unchanged.
function reportAssistantFailure(stage: string, upstreamStatus: number | null, rejectionCode: string | null, responseStatus: number) {
  try {
    const stages = ["UPSTREAM_REQUEST", "UPSTREAM_HTTP_REJECTED", "UPSTREAM_JSON_PARSE", "UPSTREAM_ENVELOPE_REJECTED", "RESULT_EXTRACTION", "RESULT_VALIDATION"];
    console.warn("RAVRADAR_ASSISTANT_FAILURE", {
      schemaVersion: 1,
      stage: stages.includes(stage) ? stage : "UNKNOWN",
      responseStatus: Number.isInteger(responseStatus) && responseStatus >= 400 && responseStatus <= 599 ? responseStatus : null,
      upstreamStatus: upstreamStatus !== null && Number.isInteger(upstreamStatus) && upstreamStatus >= 100 && upstreamStatus <= 599 ? upstreamStatus : null,
      rejectionCode: typeof rejectionCode === "string" && RAV_ASSISTANT_REJECTION_CODES.includes(rejectionCode) ? rejectionCode : null,
    });
  } catch { /* Diagnostics cannot replace the original failure. */ }
}

Deno.serve(async (request) => {
  let deadline: AssistantDeadline | null = null;
  let requestBody: ReturnType<typeof assistantRequestBody> | null = null;
  let upstream: Response | null = null;
  let observedStage: string | null = null;
  let observedUpstreamStatus: number | null = null;
  let observedRejectionCode: string | null = null;
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: assistantHeaders(request) });
    deadline = assistantDeadline(request.signal); deadline.check();
    requestBody = assistantRequestBody(request, deadline);
    const body = await deadline.wait(readJsonObject(requestBody.request, 16 * 1024)); deadline.check();
    if (!sameAssistantRavScoreModelBinding(body.context?.modelBinding)) {
      return assistantJsonResponse(request, { error: "MODEL_BINDING_MISMATCH" }, 409);
    }
    const locale = normaliseAssistantLocale(body.locale);
    if (!locale) return assistantJsonResponse(request, { error: "LOCALE_NOT_SUPPORTED" }, 400);
    const rawQuestion = String(body.question || "").trim();
    const question = rawQuestion.slice(0, 600);
    if (!question) return assistantJsonResponse(request, { error: "QUESTION_REQUIRED" }, 400);
    if (routeAssistantQuestion(rawQuestion) === "fixed-refusal"
        || routeAssistantQuestion(question) === "fixed-refusal") return assistantJsonResponse(request, { answer: RAV_ASSISTANT_REFUSALS[locale] });

    // Do not swallow private, compound or unknown suffixes in the provider prefix.
    const scoreFindAnswer = assistantScoreFindAnswer(rawQuestion, locale);
    if (scoreFindAnswer) return assistantJsonResponse(request, { answer: scoreFindAnswer });

    const identification = assistantIdentificationPolicy(rawQuestion, locale);
    // A raw overlong family never sends a clipped, falsely complete question.
    if (identification && rawQuestion.length > 600)
      return assistantJsonResponse(request, { answer:assistantIdentificationFocusAnswer(locale) });
    deadline.check();
    await deadline.wait(enforceRateLimits(request, "ravradar-assistant", { minute: 6, hour: 40, globalDay: 300 })); deadline.check();
    const { accountId, token } = cloudflareCredential();
    observedStage = "UPSTREAM_REQUEST";
    deadline.check();
    const response = await deadline.wait(fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${RAV_ASSISTANT_MODEL}`, {
      method: "POST",
      signal: deadline.signal,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: assistantSystemInstruction() },
          { role: "user", content: assistantPrompt(question, body.context, locale, rawQuestion) },
        ],
        max_completion_tokens: 800,
        reasoning_effort: "low",
        seed: 827,
        store: false,
        response_format: { type: "json_object" },
      }),
    }).then(value => {
      try { deadline!.check(); return value; }
      catch (error) { if (value.body) void value.body.cancel().catch(() => {}); throw error; }
    })); deadline.check(); upstream = response;
    observedUpstreamStatus = response.status;
    if (!response.ok) {
      observedStage = "UPSTREAM_HTTP_REJECTED";
      throw new GatewayError(502, "ASSISTANT_UPSTREAM_FAILED");
    }
    observedStage = "UPSTREAM_JSON_PARSE";
    const payload = await assistantProviderJson(response, deadline); deadline.check();
    if (payload?.success === false) {
      observedStage = "UPSTREAM_ENVELOPE_REJECTED";
      throw new GatewayError(502, "ASSISTANT_UPSTREAM_FAILED");
    }
    observedStage = "RESULT_EXTRACTION";
    const parsed = extractCloudflareAssistantResult(payload);
    observedStage = parsed === null ? "RESULT_EXTRACTION" : "RESULT_VALIDATION";
    const validated = validateAssistantResult(parsed, locale, body.context, rawQuestion,
      (code: string) => { observedRejectionCode = code; });
    if (!validated) throw new GatewayError(502, "ASSISTANT_RESPONSE_REJECTED");
    deadline.check();
    const answerResponse = assistantProviderResponse(request, validated.answer);
    deadline.check();
    return answerResponse;
  } catch (error) {
    const response = assistantErrorResponse(request, error);
    if (observedStage !== null) reportAssistantFailure(observedStage, observedUpstreamStatus, observedRejectionCode, response.status);
    return response;
  } finally {
    deadline?.close(); requestBody?.cancel();
    if (upstream?.body && !upstream.body.locked) void upstream.body.cancel().catch(() => {});
  }
});
