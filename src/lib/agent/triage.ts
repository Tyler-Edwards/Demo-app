import type { RawEmail } from "@/lib/gmail";
import type { InvoiceRecord } from "@/lib/types";

const PYTHON_AGENT_URL =
  process.env.PYTHON_AGENT_URL || "http://127.0.0.1:8000";

export const runInvoiceAgent = async (
  emails: RawEmail[],
  source: "gmail" | "demo",
  userEmail?: string,
): Promise<InvoiceRecord[]> => {
  const response = await fetch(`${PYTHON_AGENT_URL}/triage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails, source, userEmail }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Invoice triage agent failed (${response.status}): ${errorText.slice(0, 240) || response.statusText}`,
    );
  }

  const data = (await response.json()) as { invoices: InvoiceRecord[] };
  return data.invoices;
};
