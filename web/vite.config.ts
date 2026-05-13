import path from "node:path";



import tailwindcss from "@tailwindcss/vite";

import react from "@vitejs/plugin-react";

import { nodePolyfills } from "vite-plugin-node-polyfills";

import { defineConfig } from "vite";



export default defineConfig(({ mode }) => {

  const nodeEnv = mode === "production" ? "production" : "development";



  const processEnvDefines = {

    "process.env.NODE_ENV": JSON.stringify(nodeEnv),

    "process.env.TEST_NETWORK": JSON.stringify(""),

  } as const;



  return {

    plugins: [

      react(),

      tailwindcss(),

      nodePolyfills({

        include: [

          "buffer",

          "crypto",

          "stream",

          "util",

          "events",

          "process",

          "path",

        ],

        globals: {

          Buffer: true,

          global: true,

          process: true,

        },

        protocolImports: true,

      }),

    ],

    define: {

      global: "globalThis",

      "process.env": {},

      ...processEnvDefines,

    },

    resolve: {

      alias: {

        "@": path.resolve(__dirname, "./src"),

        react: path.resolve(__dirname, "node_modules/react"),

        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),

        buffer: path.resolve(__dirname, "node_modules/buffer"),

        stream: "stream-browserify",

        crypto: "crypto-browserify",

      },

    },

    optimizeDeps: {

      include: ["@mezo-org/passport", "buffer", "process"],

      esbuildOptions: {

        define: {

          global: "globalThis",

          ...processEnvDefines,

        },

      },

    },

    server: {

      port: 3000,

    },

  };

});


