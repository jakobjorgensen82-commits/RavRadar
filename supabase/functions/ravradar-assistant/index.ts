import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assertAllowedOrigin, corsHeaders, enforceRateLimits, fetchWithTimeout, GatewayError, jsonResponse, readJsonObject, safeGatewayError } from "../_shared/public-gateway.ts";
import {
  assistantPrompt,
  assistantSystemInstruction,
  extractCloudflareAssistantResult,
  normaliseAssistantLocale,
  RAV_ASSISTANT_MODEL,
  RAV_ASSISTANT_REFUSALS,
  routeAssistantQuestion,
  validateAssistantResult,
} from "../_shared/rav-assistant-contract.ts";

function cloudflareCredential() {
  const accountId = String(Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "").trim();
  const token = String(Deno.env.get("CLOUDFLARE_WORKERS_AI_TOKEN") || "").trim();
  if (!/^[a-f0-9]{32}$/i.test(accountId) || token.length < 20) throw new GatewayError(503, "ASSISTANT_NOT_CONFIGURED");
  return { accountId, token };
}

Deno.serve(async (request) => {
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    const body = await readJsonObject(request, 16 * 1024);
    const locale = normaliseAssistantLocale(body.locale);
    if (!locale) return jsonResponse(request, { error: "LOCALE_NOT_SUPPORTED" }, 400);
    const question = String(body.question || "").trim().slice(0, 600);
    if (!question) return jsonResponse(request, { error: "QUESTION_REQUIRED" }, 400);
    if (routeAssistantQuestion(question) === "fixed-refusal") return jsonResponse(request, { answer: RAV_ASSISTANT_REFUSALS[locale] });

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
    return jsonResponse(request, { answer: validated.answer });
  } catch (error) {
    return safeGatewayError(request, error);
  }
});
