"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Email login links bring the login in the address's #fragment. Wherever they
// land, this signs them in (saving it like any login), tidies the address
// and sends them on to where they were heading.
export function AuthFromLink() {
  const router = useRouter();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash.includes("access_token") && !hash.includes("error_description"))
      return;
    const params = new URLSearchParams(hash);
    const clean = () =>
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) {
      clean();
      router.replace("/login?error=link");
      return;
    }
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        clean();
        if (error) return router.replace("/login?error=link");
        const saved = decodeURIComponent(
          document.cookie.match(/(?:^|; )after_login=([^;]*)/)?.[1] ?? "",
        );
        document.cookie = "after_login=; path=/; max-age=0";
        const next =
          saved.startsWith("/") && !saved.startsWith("//") ? saved : "/";
        router.replace(
          window.location.pathname === "/login" ||
            window.location.pathname.startsWith("/auth")
            ? next
            : saved && saved !== "/"
              ? next
              : window.location.pathname,
        );
        router.refresh();
      });
  }, [router]);
  return null;
}
