import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Reverse-DNS application id. The publisher must change this to the bundle id
  // registered in their Apple/Google developer accounts if it differs.
  appId: "com.suzichat.app",
  appName: "Suzi Chat",
  // Static export output directory produced by `next build` (output: "export").
  webDir: "out",
  server: {
    // https on Android gives a secure-context origin (https://localhost), which
    // is required for getUserMedia / WebRTC (camera, mic, calls, go-live).
    androidScheme: "https",
  },
};

export default config;
