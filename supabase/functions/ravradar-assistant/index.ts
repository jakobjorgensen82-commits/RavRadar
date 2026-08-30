import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertAllowedOrigin, corsHeaders, enforceRateLimits, fetchWithTimeout, GatewayError, readJsonObject, safeGatewayError } from "../_shared/public-gateway.ts";
import {
  assistantPrompt,
  assistantSystemInstruction,
  extractCloudflareAssistantResult,
  normaliseAssistantLocale,
  RAV_ASSISTANT_BINDING_HEADERS,
  RAV_ASSISTANT_KNOWLEDGE_SCHEMA,
  RAV_ASSISTANT_KNOWLEDGE_SHA256,
  RAV_ASSISTANT_MODEL,
  RAV_ASSISTANT_REFUSALS,
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

Deno.serve(async (request) => {
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: assistantHeaders(request) });
    const body = await readJsonObject(request, 16 * 1024);
    if (!sameAssistantRavScoreModelBinding(body.context?.modelBinding)) {
      return assistantJsonResponse(request, { error: "MODEL_BINDING_MISMATCH" }, 409);
    }
    const locale = normaliseAssistantLocale(body.locale);
    if (!locale) return assistantJsonResponse(request, { error: "LOCALE_NOT_SUPPORTED" }, 400);
    const question = String(body.question || "").trim().slice(0, 600);
    if (!question) return assistantJsonResponse(request, { error: "QUESTION_REQUIRED" }, 400);
    if (routeAssistantQuestion(question) === "fixed-refusal") return assistantJsonResponse(request, { answer: RAV_ASSISTANT_REFUSALS[locale] });

    await enforceRateLimits(request, "ravradar-assistant", { minute: 6, hour: 40, globalDay: 300 });
    const { accountId, token } = cloudflareCredential();
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
    if (!response.ok) throw new GatewayError(502, "ASSISTANT_UPSTREAM_FAILED");
    const payload = await response.json();
    if (payload?.success === false) throw new GatewayError(502, "ASSISTANT_UPSTREAM_FAILED");
    const parsed = extractCloudflareAssistantResult(payload);
    const validated = validateAssistantResult(parsed, locale);
    if (!validated) throw new GatewayError(502, "ASSISTANT_RESPONSE_REJECTED");
    return assistantJsonResponse(request, { answer: validated.answer });
  } catch (error) {
    return assistantErrorResponse(request, error);
  }
});
