/**
 * BYOK AI client abstraction.
 *
 * SafeNest AI never ships with a bundled/hardcoded LLM key. Every AI-powered
 * feature (loan document extraction, plain-language explanation, chat-style
 * clarifications) calls out through this module using whichever provider,
 * model, and API key the current user configured in Settings → AI
 * Configuration. Provider + model actually used are always disclosed back
 * to the caller so the UI can show "Powered by <provider>/<model>" next to
 * any AI-generated content.
 */

export type AIProvider = "openai" | "anthropic" | "openai_compatible";

export type AICallConfig = {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
};

export type AIChatResult = {
  text: string;
  provider: AIProvider;
  model: string;
  raw?: unknown;
};

export class AIConfigError extends Error {}
export class AIProviderError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function callAI(
  config: AICallConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<AIChatResult> {
  if (!config.apiKey) {
    throw new AIConfigError(
      "No AI API key configured. Go to Settings → AI Configuration and add your own key (BYOK)."
    );
  }

  switch (config.provider) {
    case "openai":
      return callOpenAICompatible(
        "https://api.openai.com/v1/chat/completions",
        config,
        systemPrompt,
        userPrompt
      );
    case "openai_compatible":
      if (!config.baseUrl) {
        throw new AIConfigError("baseUrl is required for openai_compatible provider.");
      }
      return callOpenAICompatible(config.baseUrl, config, systemPrompt, userPrompt);
    case "anthropic":
      return callAnthropic(config, systemPrompt, userPrompt);
    default:
      throw new AIConfigError(`Unsupported provider: ${config.provider}`);
  }
}

async function callOpenAICompatible(
  url: string,
  config: AICallConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<AIChatResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AIProviderError(`AI provider error (${res.status}): ${body.slice(0, 300)}`, res.status);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  return { text, provider: config.provider, model: config.model, raw: data };
}

async function callAnthropic(
  config: AICallConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<AIChatResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AIProviderError(`AI provider error (${res.status}): ${body.slice(0, 300)}`, res.status);
  }

  const data = await res.json();
  const text: string = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
  return { text, provider: config.provider, model: config.model, raw: data };
}

/** Lightweight connectivity test used by the Settings page "Test Connection" button. */
export async function testAIConnection(config: AICallConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await callAI(
      config,
      "You are a connectivity test responder.",
      'Reply with exactly the single word: OK'
    );
    return { ok: true, message: `Connected. Sample reply: "${result.text.trim().slice(0, 60)}"` };
  } catch (err) {
    if (err instanceof AIConfigError || err instanceof AIProviderError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Unexpected error while testing the AI connection." };
  }
}
