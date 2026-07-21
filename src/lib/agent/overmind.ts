import { SpanStatusCode, trace } from "@opentelemetry/api";
import { OvermindClient } from "@overmind-lab/trace-sdk";

const AGENT_NAME = "Ledgerline Invoice Triage Agent";
const AGENT_ID = "1ab9c3b2-1852-476d-b9f9-eb9752474934";
const SERVICE_NAME = "ledgerline-invoice-triage";

type SpanKind = "entry_point" | "function" | "tool" | "workflow" | "retrieval";

let client: OvermindClient | null = null;
let initialized = false;

const ensureOvermindInit = () => {
  if (initialized) return;
  initialized = true;

  const apiKey = process.env.OVERMIND_API_KEY;
  if (!apiKey) return;

  client = new OvermindClient({
    apiKey,
    appName: SERVICE_NAME,
  });

  client.initTracing({
    enableBatching: process.env.NODE_ENV === "production",
    enabledProviders: {} as { openai?: typeof import("openai").OpenAI },
  });
};

const stampAgent = (span: ReturnType<typeof trace.getActiveSpan>) => {
  if (!span) return;
  span.setAttribute("overmind.agent.id", AGENT_ID);
  span.setAttribute("overmind.agent.name", AGENT_NAME);
};

const jsonSafe = (value: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
};

const captureInputs = (
  span: NonNullable<ReturnType<typeof trace.getActiveSpan>>,
  args: unknown[],
) => {
  const [first, second] = args;
  const inputs: Record<string, unknown> = {};
  if (args.length === 2) {
    inputs.emails = jsonSafe(first);
    inputs.source = jsonSafe(second);
  } else if (args.length === 1 && typeof first === "object" && first) {
    Object.assign(inputs, jsonSafe(first) as Record<string, unknown>);
  } else {
    args.forEach((arg, index) => {
      inputs[`arg_${index}`] = jsonSafe(arg);
    });
  }
  span.setAttribute("inputs", JSON.stringify(inputs));
};

const finalizeSpan = (
  span: NonNullable<ReturnType<typeof trace.getActiveSpan>>,
  start: number,
  error?: unknown,
) => {
  const duration = Math.max(0, (performance.now() - start) / 1000);
  span.setAttribute("overmind.duration.seconds", duration);

  if (!error) {
    span.setAttribute("overmind.status", "success");
    span.setStatus({ code: SpanStatusCode.OK });
    return;
  }

  span.setAttribute("overmind.status", "failed");
  span.setAttribute("overmind.error.type", (error as Error).constructor?.name || "Error");
  span.setAttribute(
    "overmind.error.message",
    String((error as Error).message ?? error).slice(0, 1024),
  );
  span.recordException(error as Error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: String((error as Error).message ?? error),
  });
};

const wrapSpan = <Args extends unknown[], Result>(
  name: string,
  spanType: SpanKind,
  fn: (...args: Args) => Promise<Result>,
) => {
  return async (...args: Args): Promise<Result> => {
    ensureOvermindInit();
    if (!client) return fn(...args);

    const tracer = trace.getTracer(SERVICE_NAME);
    return tracer.startActiveSpan(name, async (span) => {
      stampAgent(span);
      span.setAttribute("overmind.span.type", spanType);
      captureInputs(span, args);
      const start = performance.now();
      try {
        const result = await fn(...args);
        span.setAttribute("outputs", JSON.stringify(jsonSafe(result)));
        finalizeSpan(span, start);
        return result;
      } catch (error) {
        finalizeSpan(span, start, error);
        throw error;
      }
    });
  };
};

export const entryPoint = <Args extends unknown[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
) => wrapSpan(name, "entry_point", fn);

export const observe = <Args extends unknown[], Result>(
  name: string,
  fn: (...args: Args) => Promise<Result>,
) => wrapSpan(name, "function", fn);

export const setTag = (key: string, value: string | number | boolean) => {
  const span = trace.getActiveSpan();
  if (!span) return;
  span.setAttribute(key, value);
};

export const captureException = (error: unknown) => {
  const span = trace.getActiveSpan();
  if (!span) return;
  span.recordException(error as Error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: String((error as Error).message ?? error),
  });
};

export const shutdownOvermind = async () => {
  await client?.shutdown();
};
