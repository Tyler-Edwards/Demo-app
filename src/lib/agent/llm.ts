import { z } from "zod";

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

export const analyzeEmailWithLlm = async (_input: {
  subject: string;
  from: string;
  date: string;
  text: string;
}): Promise<LlmExtraction> => {
  throw new Error(
    "LLM calls are handled by the Python agent service. Start it with npm run python-agent:dev.",
  );
};
