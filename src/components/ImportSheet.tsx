import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import QrScanner from "qr-scanner";
import { toast } from "sonner";
import { ScanLine, ClipboardPaste } from "lucide-react";
import Button from "./Button";
import { parseShareCode, parseChunk, importShared } from "../utils/share";

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "scan" | "paste";

export default function ImportSheet({ open, onClose }: ImportSheetProps) {
  const [tab, setTab] = useState<Tab>("scan");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ got: number; total: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const handlingRef = useRef(false);
  const lastBadToast = useRef(0);
  // Collected QR frames for the code currently being scanned.
  const collectorRef = useRef<{ id: string; total: number; parts: Map<number, string> } | null>(null);

  function resetCollector() {
    collectorRef.current = null;
    setProgress(null);
  }

  async function doImport(code: string): Promise<boolean> {
    const payload = parseShareCode(code);
    if (!payload) return false;
    setLoading(true);
    try {
      await importShared(payload);
      const plans = payload.p == null ? [] : Array.isArray(payload.p) ? payload.p : [payload.p];
      if (plans.length === 1) toast.success(`Plan "${plans[0].n}" added`);
      else if (plans.length > 1) toast.success(`${plans.length} plans added`);
      else if (payload.x.length === 1) toast.success(`"${payload.x[0].n}" added`);
      else toast.success(`${payload.x.length} exercises added`);
      return true;
    } catch {
      toast.error("Import failed");
      return false;
    } finally {
      setLoading(false);
    }
  }

  function finishAndClose() {
    setTab("scan");
    setPasteText("");
    setError("");
    resetCollector();
    onClose();
  }

  // Camera scanner lifecycle — runs only while the scan tab is visible.
  useEffect(() => {
    if (!open || tab !== "scan") return;
    const video = videoRef.current;
    if (!video) return;
    handlingRef.current = false;

    const scanner = new QrScanner(
      video,
      async (result) => {
        if (handlingRef.current) return;
        const chunk = parseChunk(result.data);
        if (!chunk) {
          const now = Date.now();
          if (now - lastBadToast.current > 2000) {
            lastBadToast.current = now;
            toast.error("Not a CTrain code");
          }
          return;
        }
        // New code id (or first frame) → start a fresh collection.
        let c = collectorRef.current;
        if (!c || c.id !== chunk.id) {
          c = { id: chunk.id, total: chunk.total, parts: new Map() };
          collectorRef.current = c;
        }
        c.parts.set(chunk.idx, chunk.data);
        setProgress({ got: c.parts.size, total: c.total });
        if (c.parts.size < c.total) return;

        handlingRef.current = true;
        scanner.stop();
        const joined = Array.from({ length: c.total }, (_, i) => c!.parts.get(i)).join("");
        resetCollector();
        if (await doImport(joined)) finishAndClose();
        else {
          handlingRef.current = false;
          scanner.start().catch(() => {});
        }
      },
      { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 8 },
    );
    scannerRef.current = scanner;
    scanner.start().catch(() => {
      setTab("paste");
      setError("Camera unavailable — paste the code instead.");
    });

    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
      resetCollector();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  async function handlePaste() {
    setError("");
    if (!pasteText.trim()) {
      setError("Paste a code first.");
      return;
    }
    const ok = await doImport(pasteText);
    if (ok) finishAndClose();
    else setError("That doesn't look like a valid CTrain code.");
  }

  const tabBtn = (id: Tab, label: string, Icon: typeof ScanLine) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
        tab === id ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && finishAndClose()}
          />
          <motion.div
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            style={{ willChange: "transform" }}
          >
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Import shared</h2>

            <div className="flex gap-1 p-1 bg-zinc-100 rounded-2xl mb-5">
              {tabBtn("scan", "Scan QR", ScanLine)}
              {tabBtn("paste", "Paste code", ClipboardPaste)}
            </div>

            {tab === "scan" ? (
              <div>
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 mb-2">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                </div>
                <p className="text-center text-sm text-zinc-400">
                  {progress
                    ? `Scanned ${progress.got} / ${progress.total} — keep holding…`
                    : "Point at the QR on the other phone"}
                </p>
              </div>
            ) : (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste the shared code here"
                rows={5}
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none break-all"
              />
            )}

            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <div className="flex gap-2 mt-5">
              <Button variant="ghost" className="flex-1" disabled={loading} onClick={finishAndClose}>
                Close
              </Button>
              {tab === "paste" && (
                <Button variant="primary" className="flex-1" loading={loading} onClick={handlePaste}>
                  Add
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
