import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

// https://vite.dev/config/
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     proxy: {
//       "/api": {
//         target: "https://donna-chatbot-backend-1052173861678.us-east1.run.app",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""), // ✅ remove `/api` before forwarding
//       },
//     },
//   },
// });
