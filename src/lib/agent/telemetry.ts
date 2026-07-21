import { OvermindClient } from "@overmind-lab/trace-sdk";
import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";

export const AGENT_ID = "1ab9c3b2-1852-476d-b9f9-eb9752474934";
export const AGENT_NAME = "Ledgerline Invoice Triage Agent";

let initialized = false;

export const initOvermind = () => {
  if (initialized || !process.env.OVERMIND_API_KEY) return;
  initialized = true;

  const client = new OvermindClient({
    apiKey: process.env.OVERMIND_API_KEY,
    appName: "ledgerline-invoice-triage",
  });

  client.initTracing({
    enableBatching: process.env.NODE_ENV === "production",
    enabledProviders: {} as { openai: typeof import("openai").OpenAI },
  });
};

export const tracer = trace.getTracer("ledgerline-invoice-triage");

export const spanAttrs = (
  type: string,
  extra?: Record<string, string | number | boolean>,
) => ({
  "overmind.span.type": type,
  "overmind.agent.id": AGENT_ID,
  "overmind.agent.name": AGENT_NAME,
  ...extra,
});

export const recordException = (span: Span, err: unknown) => {
  if (err instanceof Error) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  }
};
