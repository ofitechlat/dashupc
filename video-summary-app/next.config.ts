import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  // NOTA: Se eliminaron los headers COEP/COOP porque bloqueaban los iframes de YouTube
  // Si necesitas SharedArrayBuffer para FFmpeg.wasm en el futuro, considera usar
  // credentialless en lugar de require-corp, o excluir rutas específicas
};

export default nextConfig;
