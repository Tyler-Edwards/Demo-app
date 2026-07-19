import { InvoiceDashboard } from "@/components/InvoiceDashboard";
import { getLlmStatus } from "@/lib/agent/llm";
import { isGoogleConfigured } from "@/lib/gmail";
import { getSession } from "@/lib/session";
import type { AuthStatus } from "@/lib/types";

type HomeProps = {
  searchParams: Promise<{ authError?: string }>;
};

const Home = async ({ searchParams }: HomeProps) => {
  const params = await searchParams;
  const session = await getSession();
  const llm = getLlmStatus();

  const initialStatus: AuthStatus = {
    connected: Boolean(session.tokens?.access_token),
    email: session.email || null,
    hasLlm: llm.configured,
    llmProvider: llm.provider,
    llmModel: llm.model,
    googleConfigured: isGoogleConfigured(),
  };

  return (
    <InvoiceDashboard
      initialAuthError={params.authError || null}
      initialStatus={initialStatus}
    />
  );
};

export default Home;
