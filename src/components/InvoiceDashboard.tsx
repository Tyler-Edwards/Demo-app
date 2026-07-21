"use client";

import { useState } from "react";
import type { AuthStatus, InvoiceRecord, ScanResult } from "@/lib/types";

const formatMoney = (invoice: InvoiceRecord) => {
  if (!invoice.amount) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: invoice.amount.currency,
    }).format(invoice.amount.value);
  } catch {
    return `${invoice.amount.currency} ${invoice.amount.value.toFixed(2)}`;
  }
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const isOverdue = (dueDate: string | null) => {
  if (!dueDate) return false;
  const due = new Date(`${dueDate}T00:00:00Z`);
  const today = new Date();
  const todayUtc = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  return due < todayUtc;
};

type InvoiceDashboardProps = {
  initialAuthError?: string | null;
  initialStatus: AuthStatus;
};

export const InvoiceDashboard = ({
  initialAuthError = null,
  initialStatus,
}: InvoiceDashboardProps) => {
  const [status, setStatus] = useState<AuthStatus>(initialStatus);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const authError = initialAuthError;

  const refreshStatus = async () => {
    const response = await fetch("/api/auth/status");
    const data = (await response.json()) as AuthStatus;
    setStatus(data);
  };

  const handleConnect = () => {
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = async () => {
    setError(null);
    await fetch("/api/auth/logout", { method: "POST" });
    setResult(null);
    await refreshStatus();
  };

  const handleScan = async (mode: "gmail" | "demo") => {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await response.json()) as ScanResult & { error?: string };

      if (!response.ok) {
        setError(data.error || "Scan failed");
        return;
      }

      setResult(data);
    } catch {
      setError("Could not reach the local agent.");
    } finally {
      setIsScanning(false);
    }
  };

  const invoices = result?.invoices || [];
  const totalDue = invoices.reduce(
    (sum, invoice) => sum + (invoice.amount?.value || 0),
    0,
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(47,111,94,0.16),transparent_42%),radial-gradient(circle_at_88%_0%,rgba(11,31,51,0.12),transparent_40%),linear-gradient(180deg,#f3efe6_0%,#e7eef2_48%,#f7f4ee_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
        }}
      />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-10 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-[#0b1f33]/15 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[#0b1f33] sm:text-5xl">
              Ledgerline
            </p>
            <h1 className="mt-3 max-w-xl text-xl font-medium text-[#0b1f33]/85 sm:text-2xl">
              LLM invoice agent for your inbox
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-[#0b1f33]/70">
              Grant read-only Gmail access. A language model triages each email
              and extracts how much is owed and when payment is due.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="text-sm text-[#0b1f33]/65">
              {!status.hasLlm
                ? "LLM not configured — add OVERMIND_API_KEY to .env.local"
                : status.connected
                  ? `Connected as ${status.email || "Gmail account"}`
                  : status.googleConfigured
                    ? "Gmail not connected"
                    : "Google OAuth not configured — use Demo"}
            </p>
            <div className="flex flex-wrap gap-3">
              {status.connected ? (
                <button
                  type="button"
                  onClick={() => void handleDisconnect()}
                  aria-label="Disconnect Gmail read access"
                  className="rounded-md border border-[#0b1f33]/25 bg-white/50 px-4 py-2 text-sm font-medium text-[#0b1f33] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f5e]"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={!status.googleConfigured}
                  aria-label="Connect Gmail with read-only access"
                  className="rounded-md bg-[#0b1f33] px-4 py-2 text-sm font-medium text-[#f7f4ee] transition hover:bg-[#16324d] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f6f5e]"
                >
                  Connect Gmail (read-only)
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleScan(status.connected ? "gmail" : "demo")}
                disabled={isScanning || !status.hasLlm}
                aria-label={
                  status.connected
                    ? "Scan Gmail for invoices with LLM"
                    : "Run demo invoice scan with LLM"
                }
                className="rounded-md bg-[#2f6f5e] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#265a4c] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1f33]"
              >
                {isScanning
                  ? "LLM scanning…"
                  : status.connected
                    ? "Scan inbox"
                    : "Run demo scan"}
              </button>
              {status.connected ? (
                <button
                  type="button"
                  onClick={() => void handleScan("demo")}
                  disabled={isScanning || !status.hasLlm}
                  aria-label="Run demo invoice scan with LLM"
                  className="rounded-md border border-[#2f6f5e]/40 px-4 py-2 text-sm font-medium text-[#2f6f5e] transition hover:bg-[#2f6f5e]/10 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f5e]"
                >
                  Demo
                </button>
              ) : null}
            </div>
          </div>
        </header>

        {(authError || error) && (
          <div
            role="alert"
            className="border border-[#8a3b2b]/35 bg-[#8a3b2b]/10 px-4 py-3 text-sm text-[#5c2418]"
          >
            {authError || error}
          </div>
        )}

        <section aria-label="Agent status" className="grid gap-4 sm:grid-cols-3">
          <div className="border-l-2 border-[#2f6f5e] pl-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#0b1f33]/55">
              Emails scanned
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#0b1f33]">
              {result?.scanned ?? "—"}
            </p>
          </div>
          <div className="border-l-2 border-[#0b1f33]/35 pl-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#0b1f33]/55">
              Invoices found
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#0b1f33]">
              {result ? invoices.length : "—"}
            </p>
          </div>
          <div className="border-l-2 border-[#0b1f33]/20 pl-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#0b1f33]/55">
              Extracted total
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#0b1f33]">
              {result
                ? new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: invoices[0]?.amount?.currency || "USD",
                  }).format(totalDue)
                : "—"}
            </p>
          </div>
        </section>

        <section aria-label="Invoice results">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#0b1f33]">
                Invoice emails
              </h2>
              <p className="mt-1 text-sm text-[#0b1f33]/65">
                Amount owed and payment due date for each invoice the LLM
                identified.
              </p>
            </div>
            {status.hasLlm ? (
              <p className="text-xs text-[#2f6f5e]">
                LLM: {status.llmProvider}/{status.llmModel}
              </p>
            ) : (
              <p className="text-xs text-[#8a3b2b]">
                Set OVERMIND_API_KEY or OLLAMA_BASE_URL
              </p>
            )}
          </div>

          {!status.hasLlm ? (
            <p className="border border-dashed border-[#8a3b2b]/30 bg-[#8a3b2b]/8 px-5 py-10 text-sm text-[#5c2418]">
              This app is LLM-only. Add{" "}
              <code className="font-medium">OVERMIND_API_KEY</code> (or{" "}
              <code className="font-medium">OLLAMA_BASE_URL</code>) to{" "}
              <code className="font-medium">.env.local</code>, restart{" "}
              <code className="font-medium">npm run dev</code>, then scan.
            </p>
          ) : !result ? (
            <p className="border border-dashed border-[#0b1f33]/20 bg-white/40 px-5 py-10 text-sm text-[#0b1f33]/65">
              Connect Gmail and scan, or run a demo scan. Every email is
              classified by the LLM.
            </p>
          ) : invoices.length === 0 ? (
            <p className="border border-dashed border-[#0b1f33]/20 bg-white/40 px-5 py-10 text-sm text-[#0b1f33]/65">
              No invoice emails found in the scanned set.
            </p>
          ) : (
            <div className="overflow-x-auto border border-[#0b1f33]/12 bg-white/55">
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">
                  Invoice emails with amount and due date
                </caption>
                <thead className="bg-[#0b1f33]/05 text-xs uppercase tracking-[0.12em] text-[#0b1f33]/60">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Vendor / email
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Due date
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Invoice #
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-t border-[#0b1f33]/08 align-top"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#0b1f33]">
                          {invoice.vendor}
                        </p>
                        <p className="mt-1 text-[#0b1f33]/70">
                          {invoice.subject}
                        </p>
                        {invoice.source === "gmail" ? (
                          <a
                            href={invoice.gmailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs font-medium text-[#2f6f5e] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2f6f5e]"
                            aria-label={`Open email about ${invoice.subject} in Gmail`}
                          >
                            Open in Gmail
                          </a>
                        ) : (
                          <p className="mt-2 text-xs text-[#0b1f33]/45">
                            Demo sample
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 font-[family-name:var(--font-display)] text-lg text-[#0b1f33]">
                        {formatMoney(invoice)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            isOverdue(invoice.dueDate)
                              ? "font-medium text-[#8a3b2b]"
                              : "text-[#0b1f33]"
                          }
                        >
                          {formatDate(invoice.dueDate)}
                        </span>
                        {isOverdue(invoice.dueDate) ? (
                          <span className="mt-1 block text-xs text-[#8a3b2b]">
                            Overdue
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-[#0b1f33]/80">
                        {invoice.invoiceNumber || "—"}
                      </td>
                      <td className="px-4 py-4 text-[#0b1f33]/70">
                        {Math.round(invoice.confidence * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="border-t border-[#0b1f33]/12 pt-6 text-xs leading-relaxed text-[#0b1f33]/55">
          LLM-only triage and extraction. Gmail uses read-only scope
          (`gmail.readonly`). Tokens stay in an encrypted local session cookie.
          Configure `OVERMIND_API_KEY` or `OLLAMA_BASE_URL` in `.env.local`.
        </footer>
      </main>
    </div>
  );
};
