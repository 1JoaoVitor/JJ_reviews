import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
   resolve: {
      alias: {
         "@": path.resolve(__dirname, "./src"),
      },
   },
   test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/__tests__/setup.ts",
      css: { modules: { classNameStrategy: "non-scoped" } },
      include: ["src/**/*.test.{ts,tsx}"],
      exclude: ['node_modules', 'dist', 'dev-dist', '.idea', '.git', '.cache'],
   },
   plugins: [
      react(),
      VitePWA({
         registerType: "autoUpdate", // Atualiza o app automaticamente quando você faz deploy
         includeAssets: [
            "favicon.ico",
            "apple-touch-icon.png",
            "mask-icon.svg",
         ],
         manifest: {
            name: "JJ Review", // Nome completo
            short_name: "JJ Review", // Nome que aparece embaixo do ícone no celular
            description: "Minha lista de filmes e avaliações",
            theme_color: "#212529", // Cor da barra de status
            background_color: "#212529", // Cor de fundo enquanto carrega
            display: "standalone", // Faz sumir a barra do navegador
            orientation: "portrait", // Bloqueia em pé (opcional)
            icons: [
               {
                  src: "pwa-192x192.png",
                  sizes: "192x192",
                  type: "image/png",
               },
               {
                  src: "pwa-512x512.png",
                  sizes: "512x512",
                  type: "image/png",
               },
            ],
         },
         //  devOptions: {
         //     enabled: true, // Ativa o PWA no localhost
         //     type: "module", // Necessário para funcionar com Vite em dev
         //  },
      }),
   ],
});
