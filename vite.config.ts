import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import legacy from "@vitejs/plugin-legacy"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), legacy({ targets: ["chrome 66", "not IE 11"] })],
})
