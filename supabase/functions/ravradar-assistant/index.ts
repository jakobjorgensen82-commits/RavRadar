import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertAllowedOrigin, corsHeaders, enforceRateLimits, fetchWithTimeout, GatewayError, readJsonObject, safeGatewayError } from "../_shared/public-gateway.ts";
import {
  assistantPrompt,
  assistantScoreFindAnswer,
  assistantSystemInstruction,
  extractCloudflareAssistantResult,
  normaliseAssistantLocale,
  RAV_ASSISTANT_BINDING_HEADERS,
  RAV_ASSISTANT_KNOWLEDGE_SCHEMA,
  RAV_ASSISTANT_KNOWLEDGE_SHA256,
  RAV_ASSISTANT_MODEL,
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
    "Access-Control-Expose-Headers": Object.values(RAV_ASSISTANT_BINDING_HEADERS).join(", "),
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
  let observedStage: string | null = null;
  let observedUpstreamStatus: number | null = null;
  let observedRejectionCode: string | null = null;
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: assistantHeaders(request) });
    const body = await readJsonObject(request, 16 * 1024);
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

    await enforceRateLimits(request, "ravradar-assistant", { minute: 6, hour: 40, globalDay: 300 });
    const { accountId, token } = cloudflareCredential();
    observedStage = "UPSTREAM_REQUEST";
    const response = await fetchWithTimeout(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${RAV_ASSISTANT_MODEL}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: assistantSystemInstruction() },
          { role: "user", content: assistantPrompt(question, body.context, locale) },
        ],
        max_completion_tokens: 800,
        reasoning_effort: "low",
        seed: 827,
        store: false,
        response_format: { type: "json_object" },
      }),
    }, 7_000);
    observedUpstreamStatus = response.status;
    if (!response.ok) {
      observedStage = "UPSTREAM_HTTP_REJECTED";
      throw new GatewayError(502, "ASSISTANT_UPSTREAM_FAILED");
    }
    observedStage = "UPSTREAM_JSON_PARSE";
    const payload = await response.json();
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
    return assistantJsonResponse(request, { answer: validated.answer });
  } catch (error) {
    const response = assistantErrorResponse(request, error);
    if (observedStage !== null) reportAssistantFailure(observedStage, observedUpstreamStatus, observedRejectionCode, response.status);
    return response;
  }
});
