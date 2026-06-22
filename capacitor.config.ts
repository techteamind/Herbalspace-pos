import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.herbaspace.pos",
  appName: "Herbaspace POS",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#fafaf7",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
      backgroundColor: "#fafaf7",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#fafaf7",
    },
  },
};

export default config;
