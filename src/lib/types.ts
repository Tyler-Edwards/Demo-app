export type MoneyAmount = {
  value: number;
  currency: string;
  raw: string;
};

export type InvoiceRecord = {
  id: string;
  emailId: string;
  threadId?: string;
  subject: string;
  from: string;
  vendor: string;
  receivedAt: string;
  amount: MoneyAmount | null;
  dueDate: string | null;
  invoiceNumber: string | null;
  confidence: number;
  summary: string;
  gmailUrl: string;
  source: "gmail" | "demo";
};

export type ScanResult = {
  scanned: number;
  invoices: InvoiceRecord[];
  mode: "gmail" | "demo";
  scannedAt: string;
};

export type AuthStatus = {
  connected: boolean;
  email: string | null;
  hasLlm: boolean;
  llmProvider: "openai" | "ollama" | null;
  llmModel: string | null;
  googleConfigured: boolean;
};
