import { Capacitor } from "@capacitor/core";

/**
 * Simpan konten teks ke file lalu buka share-sheet (Android/APK), atau unduh blob (web).
 * Menggantikan `a.download`/`window.open` yang diam-diam gagal di WebView.
 * Plugin di-import dinamis supaya tak masuk bundle web.
 */
export async function shareTextFile(filename: string, content: string, mimeType: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: filename, url: uri, dialogTitle: "Bagikan / simpan laporan" });
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
