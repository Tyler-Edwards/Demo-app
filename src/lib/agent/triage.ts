import { SpanStatusCode } from "@opentelemetry/api";
import type { RawEmail } from "@/lib/gmail";
import { analyzeEmailWithLlm, requireLlmConfigured } from "@/lib/agent/llm";
import { ensureTelemetry, getTracer } from "@/lib/telemetry";
import type { InvoiceRecord } from "@/lib/types";

const toGmailUrl = (emailId: string, source: "gmail" | "demo") =>
  source === "demo"
    ? "#"
    : `https://mail.google.com/mail/u/0/#inbox/${emailId}`;

const analyzeEmailBody = async (
  email: RawEmail,
  source: "gmail" | "demo",
): Promise<InvoiceRecord | null> => {
  const combinedText = [
    email.subject,
    email.snippet,
    email.bodyText,
    ...email.attachmentTexts,
  ]
    .filter(Boolean)
    .join("\n");

  const llm = await analyzeEmailWithLlm({
    subject: email.subject,
    from: email.from,
    date: email.date,
    text: combinedText,
  });

  if (!llm.isInvoice) return null;

  return {
    id: `${source}-${email.id}`,
    emailId: email.id,
    threadId: email.threadId || undefined,
    subject: email.subject,
    from: email.from,
    vendor: llm.vendor || "Unknown vendor",
    receivedAt: new Date(email.date).toISOString(),
    amount:
      llm.amount != null
        ? {
            value: llm.amount,
            currency: llm.currency || "USD",
            raw: `${llm.currency || "USD"} ${llm.amount}`,
          }
        : null,
    dueDate: llm.dueDate,
    invoiceNumber: llm.invoiceNumber,
    confidence: Number(llm.confidence.toFixed(2)),
    summary: llm.summary || email.snippet || email.subject,
    gmailUrl: toGmailUrl(email.id, source),
    source,
  };
};

export const analyzeEmail = async (
  email: RawEmail,
  source: "gmail" | "demo",
): Promise<InvoiceRecord | null> => {
  ensureTelemetry();
  return getTracer().startActiveSpan(
    "analyzeEmail",
    { attributes: { "overmind.span.type": "TOOL" } },
    async (span) => {
      try {
        return await analyzeEmailBody(email, source);
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw err;
      }
    },
  );
};

const runInvoiceAgentBody = async (
  emails: RawEmail[],
  source: "gmail" | "demo",
) => {
  requireLlmConfigured();

  const invoices: InvoiceRecord[] = [];

  await getTracer().startActiveSpan(
    "batch_orchestration",
    { attributes: { "overmind.span.type": "WORKFLOW" } },
    async () => {
      for (const email of emails) {
        await getTracer().startActiveSpan("analyze_email", async () => {
          const record = await analyzeEmail(email, source);
          if (record) invoices.push(record);
        });
      }
    },
  );

  await getTracer().startActiveSpan("sort_by_due_date", async () => {
    invoices.sort((a, b) => {
      const aDue = a.dueDate || "9999-12-31";
      const bDue = b.dueDate || "9999-12-31";
      return aDue.localeCompare(bDue);
    });
  });

  return invoices;
};

export const runInvoiceAgent = async (
  emails: RawEmail[],
  source: "gmail" | "demo",
) => {
  ensureTelemetry();
  return getTracer().startActiveSpan(
    "Ledgerline Invoice Triage Agent",
    { attributes: { "overmind.span.type": "ENTRY_POINT" } },
    async (span) => {
      try {
        span.setAttribute("inputs.email_count", emails.length);
        span.setAttribute("inputs.source", source);
        const invoices = await runInvoiceAgentBody(emails, source);
        span.setAttribute("outputs.invoice_count", invoices.length);
        return invoices;
      } catch (err) {
        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw err;
      }
    },
  );
};
