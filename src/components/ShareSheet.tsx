import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, Check, QrCode } from "lucide-react";
import Button from "./Button";
import { chunkShareCode } from "../utils/share";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  code: string;
  title: string;
}

const FRAME_MS = 200;

export default function ShareSheet({ open, onClose, code, title }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [frame, setFrame] = useState(0);
  const frames = useMemo(() => chunkShareCode(code), [code]);

  // Auto-cycle through frames while the sheet is open. Single-frame codes stay put.
  // frame is read modulo frames.length so a leftover index from a prior code is safe.
  useEffect(() => {
    if (!open || frames.length <= 1) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), FRAME_MS);
    return () => clearInterval(t);
  }, [open, frames.length]);

  const current = frame % frames.length;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  return createPortal(
    <AnimatePresence onExitComplete={() => setCopied(false)}>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            style={{ willChange: "transform" }}
          >
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
              <QrCode size={22} className="text-orange-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">Share "{title}"</h2>
            <p className="text-sm text-zinc-400 mb-6">
              {frames.length > 1
                ? "Point the other phone's camera here and hold steady until it finishes."
                : "Scan this in CTrain on the other phone, or copy the code."}
            </p>

            <div className="flex flex-col items-center mb-6">
              <div className="p-4 bg-white rounded-2xl border border-zinc-100">
                <QRCodeSVG value={frames[current]} size={224} level="L" />
              </div>
              {frames.length > 1 && (
                <div className="flex gap-1.5 mt-3">
                  {frames.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === current ? "w-4 bg-orange-500" : "w-1.5 bg-zinc-200"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy code"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
