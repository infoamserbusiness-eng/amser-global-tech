// En producción NEXT_PUBLIC_DEMO_MODE no se define: sesión real (Supabase) y datos reales.
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
