import { context, ROOT_CONTEXT, SpanStatusCode, trace } from "@opentelemetry/api";
import type { Span, Tracer } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const TRACER_NAME = "invoice-agent";
const SDK_NAME = "overmind-otel-js";
const SDK_VERSION = "0.1.0";
const AGENT_NAME = "Ledgerline Invoice Triage Agent";

let provider: BasicTracerProvider | null = null;
let initialized = false;

export const isTelemetryEnabled = () => Boolean(process.env.OVERMIND_API_KEY);

const jsonStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, (_key, v) =>
      typeof v === "bigint" ? v.toString() : v,
    );
  } catch {
    return JSON.stringify(String(value));
  }
};

const stampIdentity = (span: Span) => {
  span.setAttribute("overmind.agent.name", AGENT_NAME);
  const agentId = process.env.OVERMIND_AGENT_ID;
  const projectId = process.env.OVERMIND_PROJECT_ID;
  if (agentId) span.setAttribute("overmind.agent.id", agentId);
  if (projectId) span.setAttribute("overmind.project.id", projectId);
};

const finalizeSpan = (
  span: Span,
  startMs: number,
  error: unknown | null,
) => {
  const durationSeconds = Math.max(0, (Date.now() - startMs) / 1000);
  span.setAttribute("overmind.duration.seconds", durationSeconds);

  if (error == null) {
    span.setAttribute("overmind.status", "success");
    span.setStatus({ code: SpanStatusCode.OK });
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  span.setAttribute("overmind.status", "failed");
  span.setAttribute("overmind.error.type", err.name || "Error");
  span.setAttribute("overmind.error.message", err.message.slice(0, 1024));
  span.recordException(err);
  span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
};

const hasRealTracerProvider = () => {
  const current = trace.getTracerProvider() as {
    getDelegate?: () => { constructor?: { name?: string } };
  };
  const delegateName = current.getDelegate?.()?.constructor?.name;
  return Boolean(
    delegateName &&
      delegateName !== "ProxyTracerProvider" &&
      delegateName !== "NoopTracerProvider",
  );
};

const ensureContextManager = () => {
  try {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
  } catch {
    // Already registered — OpenTelemetry only allows one global manager.
  }
};

export const initTelemetry = () => {
  if (initialized) return;
  initialized = true;

  if (!isTelemetryEnabled()) return;

  if (hasRealTracerProvider()) {
    ensureContextManager();
    return;
  }

  ensureContextManager();

  const apiKey = process.env.OVERMIND_API_KEY!;
  const baseUrl = (
    process.env.OVERMIND_API_URL || "https://api.overmindlab.ai"
  ).replace(/\/$/, "");
  const environment =
    process.env.OVERMIND_ENVIRONMENT ||
    process.env.DEPLOYMENT_ENVIRONMENT ||
    "development";

  const attributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]:
      process.env.OVERMIND_SERVICE_NAME || "invoice-agent",
    [ATTR_SERVICE_VERSION]:
      process.env.SERVICE_VERSION || SDK_VERSION,
    "deployment.environment": environment,
    "overmind.sdk.name": SDK_NAME,
    "overmind.sdk.version": SDK_VERSION,
    "overmind.agent.name": AGENT_NAME,
  };

  if (process.env.OVERMIND_AGENT_ID) {
    attributes["overmind.agent.id"] = process.env.OVERMIND_AGENT_ID;
  }
  if (process.env.OVERMIND_PROJECT_ID) {
    attributes["overmind.project.id"] = process.env.OVERMIND_PROJECT_ID;
  }

  const exporter = new OTLPTraceExporter({
    url: `${baseUrl}/api/v1/traces`,
    headers: { "X-Api-Key": apiKey },
  });

  provider = new BasicTracerProvider({
    resource: resourceFromAttributes(attributes),
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  trace.setGlobalTracerProvider(provider);
};

const getTracer = (): Tracer | null => {
  if (!isTelemetryEnabled()) return null;
  if (!initialized) initTelemetry();
  if (!isTelemetryEnabled()) return null;
  return trace.getTracer(TRACER_NAME);
};

export const withEntryPointSpan = async <T>(
  name: string,
  inputs: unknown,
  fn: () => Promise<T>,
): Promise<T> => {
  const tracer = getTracer();
  if (!tracer) return fn();

  const span = tracer.startSpan(name, undefined, ROOT_CONTEXT);
  const startMs = Date.now();
  span.setAttribute("overmind.span.type", "entry_point");
  stampIdentity(span);
  span.setAttribute("inputs", jsonStringify(inputs));

  return context.with(trace.setSpan(ROOT_CONTEXT, span), async () => {
    try {
      const result = await fn();
      span.setAttribute("outputs", jsonStringify(result));
      finalizeSpan(span, startMs, null);
      return result;
    } catch (error) {
      finalizeSpan(span, startMs, error);
      throw error;
    } finally {
      span.end();
    }
  });
};
