import { trace } from "@opentelemetry/api";
import { OvermindClient } from "@overmind-lab/trace-sdk";
import { OpenAI } from "openai";

let initialized = false;
let overmindClient: OvermindClient | undefined;

export const initTelemetry = () => {
  if (initialized || !process.env.OVERMIND_API_KEY) return;

  initialized = true;
  overmindClient = new OvermindClient({
    apiKey: process.env.OVERMIND_API_KEY,
    appName: "Ledgerline Invoice Triage Agent",
  });
  overmindClient.initTracing({
    enableBatching: process.env.NODE_ENV === "production",
    enabledProviders: { openai: OpenAI },
  });
};

export const ensureTelemetry = () => {
  initTelemetry();
};

export const getTracer = () => trace.getTracer("ledgerline-invoice-triage");

export const shutdownTelemetry = async () => {
  await overmindClient?.shutdown();
};
