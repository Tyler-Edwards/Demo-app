import { NextResponse } from "next/server";
import { getAuthUrl, isGoogleConfigured } from "@/lib/gmail";

export const GET = () => {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, or use Demo mode.",
      },
      { status: 400 },
    );
  }

  return NextResponse.redirect(getAuthUrl());
};
