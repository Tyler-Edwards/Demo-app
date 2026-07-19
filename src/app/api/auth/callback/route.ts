import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchUserEmail } from "@/lib/gmail";
import { getSession } from "@/lib/session";

export const GET = async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const origin = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(
      `${origin}/?authError=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?authError=${encodeURIComponent("Missing OAuth code")}`,
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const session = await getSession();
    session.tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
      scope: tokens.scope,
    };
    session.email = (await fetchUserEmail(session.tokens)) || undefined;
    await session.save();

    return NextResponse.redirect(`${origin}/?connected=1`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to complete Google auth";
    return NextResponse.redirect(
      `${origin}/?authError=${encodeURIComponent(message)}`,
    );
  }
};
