import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  tokens?: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    token_type?: string | null;
    scope?: string | null;
  };
  email?: string;
};

const fallbackSecret = "dev-only-invoice-agent-session-secret-change-me";

export const getSessionOptions = (): SessionOptions => {
  const password = process.env.SESSION_SECRET || fallbackSecret;

  return {
    password,
    cookieName: "invoice_agent_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };
};

export const getSession = async () => {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
};
