import { google } from "googleapis";
import type { SessionData } from "@/lib/session";

const GMAIL_READONLY = "https://www.googleapis.com/auth/gmail.readonly";
const USERINFO_EMAIL = "https://www.googleapis.com/auth/userinfo.email";

export const isGoogleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const getRedirectUri = () =>
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

export const createOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. See .env.example.",
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
};

export const getAuthUrl = () => {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY, USERINFO_EMAIL],
  });
};

export const exchangeCodeForTokens = async (code: string) => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
};

export const getAuthorizedClient = (tokens: SessionData["tokens"]) => {
  if (!tokens?.access_token) {
    throw new Error("No Gmail access token in session.");
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
    token_type: tokens.token_type ?? undefined,
    scope: tokens.scope ?? undefined,
  });
  return client;
};

export type RawEmail = {
  id: string;
  threadId?: string | null;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  bodyText: string;
  attachmentTexts: string[];
};

const decodeBase64Url = (data?: string | null) => {
  if (!data) return "";
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
};

type MessagePart = {
  mimeType?: string | null;
  filename?: string | null;
  body?: { data?: string | null; attachmentId?: string | null } | null;
  parts?: MessagePart[] | null;
};

const collectTextParts = (part?: MessagePart | null): string[] => {
  if (!part) return [];

  const chunks: string[] = [];
  const mime = part.mimeType || "";

  if ((mime === "text/plain" || mime === "text/html") && part.body?.data) {
    const decoded = decodeBase64Url(part.body.data);
    chunks.push(
      mime === "text/html" ? decoded.replace(/<[^>]+>/g, " ") : decoded,
    );
  }

  for (const child of part.parts || []) {
    chunks.push(...collectTextParts(child));
  }

  return chunks;
};

const collectPdfAttachmentIds = (
  part?: MessagePart | null,
): Array<{ attachmentId: string; filename: string }> => {
  if (!part) return [];

  const files: Array<{ attachmentId: string; filename: string }> = [];
  const filename = part.filename || "";
  const isPdf =
    filename.toLowerCase().endsWith(".pdf") ||
    part.mimeType === "application/pdf";

  if (isPdf && part.body?.attachmentId) {
    files.push({ attachmentId: part.body.attachmentId, filename });
  }

  for (const child of part.parts || []) {
    files.push(...collectPdfAttachmentIds(child));
  }

  return files;
};

const extractPdfText = async (buffer: Buffer) => {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || "";
  } catch {
    return "";
  }
};

const getHeader = (
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string,
) =>
  headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value || "";

export const fetchCandidateEmails = async (
  tokens: SessionData["tokens"],
  options?: { maxResults?: number },
): Promise<RawEmail[]> => {
  const auth = getAuthorizedClient(tokens);
  const gmail = google.gmail({ version: "v1", auth });
  const maxResults = options?.maxResults ?? 40;

  // Broad recent mail; the LLM decides which messages are invoices.
  const query = "newer_than:12m -category:promotions -category:social";

  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messages = list.data.messages || [];
  const emails: RawEmail[] = [];

  for (const message of messages) {
    if (!message.id) continue;

    const full = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    const payload = full.data.payload as MessagePart | undefined;
    const headers = full.data.payload?.headers;
    const bodyText = collectTextParts(payload).join("\n").trim();
    const pdfRefs = collectPdfAttachmentIds(payload).slice(0, 2);
    const attachmentTexts: string[] = [];

    for (const pdf of pdfRefs) {
      const attachment = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId: message.id,
        id: pdf.attachmentId,
      });
      const data = attachment.data.data;
      if (!data) continue;
      const buffer = Buffer.from(
        data.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      );
      const text = await extractPdfText(buffer);
      if (text.trim()) {
        attachmentTexts.push(text);
      }
    }

    emails.push({
      id: message.id,
      threadId: full.data.threadId,
      subject: getHeader(headers, "Subject") || "(no subject)",
      from: getHeader(headers, "From") || "Unknown",
      date: getHeader(headers, "Date") || new Date().toISOString(),
      snippet: full.data.snippet || "",
      bodyText,
      attachmentTexts,
    });
  }

  return emails;
};

export const fetchUserEmail = async (tokens: SessionData["tokens"]) => {
  const auth = getAuthorizedClient(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth });
  const profile = await oauth2.userinfo.get();
  return profile.data.email || null;
};
