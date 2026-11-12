import { NextResponse } from "next/server";
import { REF_CODE_RE, REFERRAL } from "@/lib/referrals";

/**
 * Share link: creatorsai.me/r/abcd2345. Remembers the referrer in a first-party, httpOnly cookie for
 * 30 days (read only by our sign-up API — not readable by scripts) and shows a personal invite page.
 */
export function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return params.then(({ code }) => {
    const c = code.toLowerCase();
    const url = new URL(req.url);
    if (!REF_CODE_RE.test(c)) return NextResponse.redirect(new URL("/signup", url), 302);
    const res = NextResponse.redirect(new URL(`/invite/${c}`, url), 302);
    res.cookies.set(REFERRAL.cookie, c, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: REFERRAL.attributionDays * 86_400 });
    return res;
  });
}
