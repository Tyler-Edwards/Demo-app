import { SpanStatusCode } from "@opentelemetry/api";
import { z } from "zod";
import { ensureTelemetry, getTracer } from "@/lib/telemetry";

const LlmExtractionSchema = z.object({
  isInvoice: z.boolean(),
  vendor: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  dueDate: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  summary: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type LlmExtraction = z.infer<typeof LlmExtractionSchema>;

export type LlmEndpoint = {
  provider: "openai" | "ollama";
  url: string;
  model: string;
  headers: Record<string, string>;
};

export const isLlmConfigured = () =>
  Boolean(process.env.OPENAI_API_KEY || process.env.OLLAMA_BASE_URL);

export const requireLlmConfigured = () => {
  if (isLlmConfigured()) return;
  throw new Error(
    "LLM is required. Set OPENAI_API_KEY (or OLLAMA_BASE_URL for a local model) in .env.local, then restart the app.",
  );
};

export const getLlmEndpoint = (): LlmEndpoint => {
  requireLlmConfigured();

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      url:
        process.env.OPENAI_BASE_URL ||
        "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    };
  }

  const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  );

  return {
    provider: "ollama",
    url: `${base}/v1/chat/completions`,
    model: process.env.OLLAMA_MODEL || "llama3.2",
    headers: { "Content-Type": "application/json" },
  };
};

export const getLlmStatus = () => {
  if (!isLlmConfigured()) {
    return { configured: false as const, provider: null, model: null };
  }

  const endpoint = getLlmEndpoint();
  return {
    configured: true as const,
    provider: endpoint.provider,
    model: endpoint.model,
  };
};

const SYSTEM_PROMPT = `You are Ledgerline, an accounting invoice triage agent.
You ONLY decide from email content whether the message is a payable invoice / bill for accounting, and extract structured fields.

Rules:
- isInvoice=true only for unpaid/payable invoices, bills, or statements with an amount owed.
- isInvoice=false for receipts already paid, marketing, newsletters, personal chat, shipping notices without a bill, and unrelated mail.
- amount must be the total amount due (number only, no currency symbols).
- currency must be an ISO code like USD, GBP, EUR when known.
- dueDate must be YYYY-MM-DD when known, else null.
- Prefer explicit "amount due" / "total" / "balance due" over subtotals or tax lines.
- If uncertain, lower confidence and set isInvoice=false unless evidence is strong.
- confidence must be a number between 0 and 1 (not a percentage).
- Return JSON only. No markdown.`;

const extractJsonObject = (content: string) => {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed) as unknown;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("LLM did not return JSON.");
  }
  return JSON.parse(match[0]) as unknown;
};

export const analyzeEmailWithLlm = async (input: {
  subject: string;
  from: string;
  date: string;
  text: string;
}): Promise<LlmExtraction> => {
  ensureTelemetry();
  return getTracer().startActiveSpan(
    "analyzeEmailWithLlm",
    { attributes: { "overmind.span.type": "LLM" } },
    async (span) => {
      try {
        const endpoint = getLlmEndpoint();
        span.setAttribute("genai.request.model", endpoint.model);
        span.setAttribute("genai.provider", endpoint.provider);

        const userPrompt = `Analyze this email for accounting invoice triage.

Return ONLY valid JSON with exactly these keys:
{
  "isInvoice": boolean,
  "vendor": string|null,
  "amount": number|null,
  "currency": string|null,
  "dueDate": "YYYY-MM-DD"|null,
  "invoiceNumber": string|null,
  "summary": string|null,
  "confidence": number
}

Email date: ${input.date}
Email subject: ${input.subject}
From: ${input.from}
Body / attachments text:
${input.text.slice(0, 10000)}`;

        const response = await getTracer().startActiveSpan(
          "llm_chat_completions",
          { attributes: { "overmind.span.type": "LLM" } },
          async (llmSpan) => {
            llmSpan.setAttribute("genai.request.model", endpoint.model);
            llmSpan.setAttribute("genai.provider", endpoint.provider);
            llmSpan.setAttribute("genai.request.temperature", 0);

            return fetch(endpoint.url, {
              method: "POST",
              headers: endpoint.headers,
              body: JSON.stringify({
                model: endpoint.model,
                temperature: 0,
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userPrompt },
                ],
                response_format: { type: "json_object" },
              }),
            });
          },
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(
            `LLM request failed (${response.status}): ${errorText.slice(0, 240) || response.statusText}`,
          );
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
          };
          model?: string;
        };
        if (data.usage?.prompt_tokens != null) {
          span.setAttribute("genai.prompt_tokens", data.usage.prompt_tokens);
          span.setAttribute(
            "genai.completion_tokens",
            data.usage.completion_tokens ?? 0,
          );
          span.setAttribute(
            "genai.total_tokens",
            data.usage.total_tokens ??
              (data.usage.prompt_tokens + (data.usage.completion_tokens ?? 0)),
          );
        }
        if (data.model) {
          span.setAttribute("genai.response.model", data.model);
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("LLM returned an empty response.");
        }

        const parsed = extractJsonObject(content) as Record<string, unknown>;

        // Some models return confidence as 0–100; normalize to 0–1 for the schema.
        if (typeof parsed.confidence === "number" && parsed.confidence > 1) {
          parsed.confidence = Math.min(parsed.confidence / 100, 1);
        }

        const result = LlmExtractionSchema.safeParse(parsed);
        if (!result.success) {
          throw new Error(
            `LLM returned invalid invoice JSON: ${result.error.message}`,
          );
        }

        return result.data;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw err;
      }
    },
  );
};
