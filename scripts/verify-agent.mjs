import assert from "node:assert/strict";

process.env.OVERMIND_API_KEY = "test-key";
process.env.OPENAI_MODEL = "ft-f361c700-qwen3-5-27b";

const responses = new Map([
  [
    "demo-1",
    {
      isInvoice: true,
      vendor: "Northwind",
      amount: 1240.5,
      currency: "GBP",
      dueDate: "2026-07-31",
      invoiceNumber: "INV-1042",
      summary: "Northwind invoice INV-1042",
      confidence: 0.92,
    },
  ],
  [
    "demo-2",
    {
      isInvoice: true,
      vendor: "Amazon",
      amount: 312.88,
      currency: "USD",
      dueDate: "2026-07-20",
      invoiceNumber: "123456789",
      summary: "AWS invoice",
      confidence: 0.9,
    },
  ],
  [
    "demo-3",
    {
      isInvoice: false,
      vendor: null,
      amount: null,
      currency: null,
      dueDate: null,
      invoiceNumber: null,
      summary: "Personal lunch email",
      confidence: 0.95,
    },
  ],
  [
    "demo-4",
    {
      isInvoice: false,
      vendor: "Figma",
      amount: 45,
      currency: "USD",
      dueDate: null,
      invoiceNumber: null,
      summary: "Paid receipt",
      confidence: 0.93,
    },
  ],
  [
    "demo-5",
    {
      isInvoice: true,
      vendor: "Cloudhost",
      amount: 890,
      currency: "EUR",
      dueDate: "2026-07-16",
      invoiceNumber: "7781",
      summary: "Cloudhost invoice 7781",
      confidence: 0.91,
    },
  ],
]);

const toGmailUrl = (emailId, source) =>
  source === "demo" ? "#" : `https://mail.google.com/mail/u/0/#inbox/${emailId}`;

globalThis.fetch = async (url, options) => {
  if (String(url).endsWith("/triage")) {
    const body = JSON.parse(options.body);
    const invoices = [];

    for (const email of body.emails) {
      const llm = responses.get(email.id);
      if (!llm?.isInvoice) continue;

      const currency = llm.currency || "USD";
      invoices.push({
        id: `${body.source}-${email.id}`,
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
                currency,
                raw: `${currency} ${llm.amount}`,
              }
            : null,
        dueDate: llm.dueDate,
        invoiceNumber: llm.invoiceNumber,
        confidence: Number(llm.confidence.toFixed(2)),
        summary: llm.summary || email.snippet || email.subject,
        gmailUrl: toGmailUrl(email.id, body.source),
        source: body.source,
      });
    }

    invoices.sort((a, b) => {
      const aDue = a.dueDate || "9999-12-31";
      const bDue = b.dueDate || "9999-12-31";
      return aDue.localeCompare(bDue);
    });

    return {
      ok: true,
      status: 200,
      text: async () => "",
      json: async () => ({ invoices }),
    };
  }

  throw new Error(`Unexpected fetch URL: ${url}`);
};

const { runInvoiceAgent } = await import("../src/lib/agent/triage.ts");
const { DEMO_EMAILS } = await import("../src/lib/demo-emails.ts");
const { isLlmConfigured, requireLlmConfigured } = await import(
  "../src/lib/agent/llm.ts"
);

assert.equal(isLlmConfigured(), true);
requireLlmConfigured();

const invoices = await runInvoiceAgent(DEMO_EMAILS, "demo");
assert.equal(invoices.length, 3);
assert.ok(!invoices.some((invoice) => invoice.subject.includes("Team lunch")));
assert.ok(!invoices.some((invoice) => invoice.vendor === "Figma"));
assert.equal(
  invoices.find((invoice) => invoice.vendor === "Amazon")?.invoiceNumber,
  "123456789",
);
assert.equal(
  invoices.find((invoice) => invoice.vendor === "Northwind")?.amount?.value,
  1240.5,
);

console.log(
  "LLM agent verification passed:",
  invoices.map((invoice) => ({
    vendor: invoice.vendor,
    amount: invoice.amount,
    dueDate: invoice.dueDate,
  })),
);
