import { registerPlugin } from "@capacitor/core";

export interface BondedPrinter { name: string; address: string }

export interface ThermalPrinterPlugin {
  /** Daftar perangkat Bluetooth yang sudah dipasangkan (bonded). */
  list(): Promise<{ devices: BondedPrinter[] }>;
  /** Kirim byte ESC/POS (base64) ke printer beralamat `address`. */
  print(options: { address: string; data: string }): Promise<void>;
}

// Plugin native custom (android/.../ThermalPrinterPlugin.java), khusus Capacitor 8.
export const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>("ThermalPrinter");
