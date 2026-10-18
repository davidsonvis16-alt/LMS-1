import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // Demo mode: signed in = has the demo cookie.
    const p = request.nextUrl.pathname;
    const gated = ["/dashboard", "/learn", "/certificates", "/account", "/company", "/admin"].some((x) => p === x || p.startsWith(x + "/"));
    if (gated && !request.cookies.get("demo_uid")) {
      const url = request.nextUrl.clone(); url.pathname = "/login"; url.search = `?next=${encodeURIComponent(p)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await sb.auth.getUser();
  const p = request.nextUrl.pathname;
  const gated = ["/dashboard", "/learn", "/certificates", "/account", "/company", "/admin"].some((x) => p === x || p.startsWith(x + "/"));
  if (gated && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(p + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|pdf.worker|api/pay/webhook|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
