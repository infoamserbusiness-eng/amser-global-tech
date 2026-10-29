"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente del navegador (usa la sesión por cookie del usuario). Se usa para subir material a Storage.
export const supabaseBrowser = () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
