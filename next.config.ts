import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // El repo vive en ~/dev/amser-global-tech; fija la raíz para que Turbopack no suba a C:\Users\USUARIO.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
