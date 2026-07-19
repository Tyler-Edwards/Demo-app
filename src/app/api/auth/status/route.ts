import { NextResponse } from "next/server";
import { getLlmStatus } from "@/lib/agent/llm";
import { isGoogleConfigured } from "@/lib/gmail";
import { getSession } from "@/lib/session";
import type { AuthStatus } from "@/lib/types";

export const GET = async () => {
  const session = await getSession();
  const llm = getLlmStatus();

  const status: AuthStatus = {
    connected: Boolean(session.tokens?.access_token),
    email: session.email || null,
    hasLlm: llm.configured,
    llmProvider: llm.provider,
    llmModel: llm.model,
    googleConfigured: isGoogleConfigured(),
  };

  return NextResponse.json(status);
};
