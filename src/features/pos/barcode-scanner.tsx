import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/shared";

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: Props): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function start(): Promise<void> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!("BarcodeDetector" in window)) {
          setError("Browser tidak mendukung barcode scanner. Gunakan Chrome terbaru.");
          return;
        }

        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
        });

        intervalId = setInterval(async () => {
          if (!videoRef.current || !scanning) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && !cancelled) {
              setScanning(false);
              if (intervalId) clearInterval(intervalId);
              onScan(barcodes[0].rawValue);
            }
          } catch { /* ignore detection errors */ }
        }, 300);
      } catch {
        if (!cancelled) setError("Tidak bisa mengakses kamera. Pastikan izin kamera diberikan.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, onScan]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-h2 text-h2 text-white">Scan Barcode</h2>
        <button onClick={() => { streamRef.current?.getTracks().forEach((t) => t.stop()); onClose(); }}
          className="text-white"><Icon name="close" /></button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-40 border-2 border-white/70 rounded-xl">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
          </div>
        </div>
        {!scanning && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <Icon name="check" className="text-on-primary text-[32px]" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4">
          <p className="text-white text-center font-body-md text-body-md">{error}</p>
        </div>
      )}

      <div className="p-4 text-center">
        <p className="font-body-md text-body-md text-white/70">Arahkan kamera ke barcode produk</p>
      </div>
    </div>
  );
}
