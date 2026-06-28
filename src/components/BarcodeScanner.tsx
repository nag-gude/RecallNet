"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidUpc, upcFromScan } from "@/lib/product-input";

interface Props {
  onScan: (upc: string) => void;
  onError?: (message: string) => void;
}

export default function BarcodeScanner({ onScan, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "unsupported" | "denied">("idle");
  const [manualUpc, setManualUpc] = useState("");
  const scannedRef = useRef(false);

  const handleDetected = useCallback(
    (raw: string) => {
      const upc = upcFromScan(raw);
      if (!isValidUpc(upc) || scannedRef.current) return;
      scannedRef.current = true;
      onScan(upc);
    },
    [onScan],
  );

  useEffect(() => {
    scannedRef.current = false;
    let active = true;
    let controls: { stop: () => void } | null = null;

    async function start() {
      setStatus("starting");

      // Prefer native BarcodeDetector when available (fast, no extra decode loop)
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          // @ts-expect-error BarcodeDetector is not in TS lib yet
          const detector = new BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          });
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (!active || !videoRef.current) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("scanning");

          let raf = 0;
          const tick = async () => {
            if (!active || !videoRef.current || scannedRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) handleDetected(codes[0].rawValue);
            } catch {
              /* frame not ready */
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          controls = {
            stop: () => {
              cancelAnimationFrame(raf);
              stream.getTracks().forEach((t) => t.stop());
            },
          };
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "NotAllowedError") {
            setStatus("denied");
            onError?.("Camera permission denied. Enter UPC manually below.");
            return;
          }
        }
      }

      // Fallback: ZXing continuous decode
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const camera =
          devices.find((d) => /back|rear|environment/i.test(d.label)) ?? devices[0];

        if (!camera || !videoRef.current) {
          setStatus("unsupported");
          onError?.("No camera found. Enter UPC manually below.");
          return;
        }

        setStatus("scanning");
        const scannerControls = await reader.decodeFromVideoDevice(
          camera.deviceId,
          videoRef.current,
          (result) => {
            if (result) handleDetected(result.getText());
          },
        );

        controls = { stop: () => scannerControls.stop() };
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setStatus("denied");
          onError?.("Camera permission denied. Enter UPC manually below.");
        } else {
          setStatus("unsupported");
          onError?.("Camera scanning unavailable in this browser. Enter UPC manually.");
        }
      }
    }

    start();

    return () => {
      active = false;
      controls?.stop();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [handleDetected, onError]);

  function submitManualUpc(e: React.FormEvent) {
    e.preventDefault();
    const upc = upcFromScan(manualUpc);
    if (!isValidUpc(upc)) {
      onError?.("Enter a valid 8–14 digit UPC/barcode.");
      return;
    }
    onScan(upc);
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] max-h-72 bg-slate-900 rounded-xl overflow-hidden border border-slate-300">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          aria-label="Camera viewfinder for barcode scanning"
        />
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
            Starting camera…
          </div>
        )}
        {status === "scanning" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-4/5 h-1/3 border-2 border-brand-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {(status === "unsupported" || status === "denied") && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-200 text-sm p-4 text-center">
            Camera unavailable — use manual UPC entry below
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Point your camera at the product barcode (UPC/EAN). Works on phone or laptop with a webcam.
      </p>

      <form onSubmit={submitManualUpc} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Or type UPC manually"
          value={manualUpc}
          onChange={(e) => setManualUpc(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900"
        >
          Use UPC
        </button>
      </form>
    </div>
  );
}
