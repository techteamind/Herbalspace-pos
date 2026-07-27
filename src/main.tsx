import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./index.css";

// SW hanya untuk web/PWA. Di dalam APK aset sudah lokal — SW justru membuat
// bundle APK baru tidak pernah termuat (precache lama terus disajikan).
if (Capacitor.isNativePlatform()) {
  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then((res) => { if (res.some(Boolean)) window.location.reload(); });
  }
} else {
  void import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Elemen #root tidak ditemukan");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
