import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ethers } from "ethers";

export default defineConfig({
    plugins: [react()],
    json: {
        namedExports: true
    },
    server: {
        port: 5173, // Default Vite port
        strictPort: true, // Fail if port is already in use
        host: true        
    },
    define: {
        global: 'globalThis', // Ensure global is defined for browser environments
        },
        optimizeDeps: {
            include: ['ethers']
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    ethers: ['ethers']
                }
            }
    }
}
});