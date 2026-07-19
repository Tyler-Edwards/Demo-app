import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadEnvLocal = () => {
  const envPath = resolve(process.cwd(), ".env.local");
  let raw;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    throw new Error("Missing .env.local — add OPENAI_API_KEY before running.");
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvLocal();

if (!process.env.OPENAI_API_KEY && !process.env.OLLAMA_BASE_URL) {
  console.error(
    "Hard failure: set OPENAI_API_KEY or OLLAMA_BASE_URL in .env.local",
  );
  process.exit(1);
}

const { DEMO_EMAILS } = await import("../src/lib/demo-emails.ts");
const { runInvoiceAgent } = await import("../src/lib/agent/triage.ts");

if (DEMO_EMAILS.length !== 20) {
  console.error(
    `Hard failure: expected exactly 20 demo emails, found ${DEMO_EMAILS.length}`,
  );
  process.exit(1);
}

const pad = (value, width) => {
  const text = value == null ? "—" : String(value);
  return text.length >= width ? text.slice(0, width) : text.padEnd(width);
};

const formatAmount = (amount) => {
  if (!amount) return "—";
  return `${amount.currency} ${amount.value}`;
};

const vendorHint = (from) =>
  from.replace(/<.*>/, "").replace(/"/g, "").trim() || "—";

console.log(
  `Running ${DEMO_EMAILS.length} emails through runInvoiceAgent (model=${process.env.OPENAI_MODEL || "default"})…\n`,
);

let invoices;
try {
  invoices = await runInvoiceAgent(DEMO_EMAILS, "demo");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Hard failure: ${message}`);
  process.exit(1);
}

const invoiceByEmailId = new Map(
  invoices.map((invoice) => [invoice.emailId, invoice]),
);

const rows = DEMO_EMAILS.map((email) => {
  const invoice = invoiceByEmailId.get(email.id) || null;
  return {
    id: email.id,
    subject: email.subject,
    vendor: invoice?.vendor || vendorHint(email.from),
    isInvoice: Boolean(invoice),
    amount: formatAmount(invoice?.amount ?? null),
    dueDate: invoice?.dueDate || "—",
    confidence: invoice ? Number(invoice.confidence).toFixed(2) : "—",
  };
});

console.log(
  [
    pad("ID", 8),
    pad("Subject / Vendor", 48),
    pad("Invoice?", 10),
    pad("Amount", 16),
    pad("Due", 12),
    pad("Conf", 6),
  ].join(" "),
);
console.log("-".repeat(104));

for (const row of rows) {
  const label = `${row.subject} | ${row.vendor}`;
  console.log(
    [
      pad(row.id, 8),
      pad(label, 48),
      pad(row.isInvoice ? "yes" : "no", 10),
      pad(row.amount, 16),
      pad(row.dueDate, 12),
      pad(row.confidence, 6),
    ].join(" "),
  );
}

const invoiceRows = rows.filter((row) => row.isInvoice);
console.log("\nSummary");
console.log(`  Scanned: ${DEMO_EMAILS.length}`);
console.log(`  Classified as invoices: ${invoiceRows.length}`);
console.log(
  `  Rejected / non-invoices: ${DEMO_EMAILS.length - invoiceRows.length}`,
);

for (const row of invoiceRows) {
  console.log(
    `  • ${row.vendor}: ${row.amount}, due ${row.dueDate} (confidence ${row.confidence})`,
  );
}

process.exit(0);
