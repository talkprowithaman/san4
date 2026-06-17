import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Vite's dev server doesn't run the /api serverless functions, so forward
    // them to the deployed Vercel deployment. Lets `npm run dev` exercise the
    // Gemini proxy without running `vercel dev`.
    proxy: {
      '/api': {
        target: 'https://san4-delta.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
