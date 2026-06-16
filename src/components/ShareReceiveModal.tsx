import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Download } from "lucide-react";
import Button from "./Button";
import { parseShareHash, importShared } from "../utils/share";

type Payload = ReturnType<typeof parseShareHash>;

export default function ShareReceiveModal() {
  const [payload, setPayload] = useState<Payload>(() =>
    location.hash.startsWith("#share=") ? parseShareHash(location.hash) : null
  );
  const [loading, setLoading] = useState(false);
  const hadShareHash = useRef(location.hash.startsWith("#share="));

  useEffect(() => {
    if (!hadShareHash.current) return;
    history.replaceState(null, "", location.pathname + location.search);
    if (payload === null) toast.error("This share link is invalid or damaged");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd() {
    if (!payload) return;
    setLoading(true);
    try {
      await importShared(payload);
      toast.success(payload.p ? `Plan "${payload.p.n}" added` : `"${payload.x[0].n}" added`);
      setPayload(null);
    } catch {
      toast.error("Import failed");
    } finally {
      setLoading(false);
    }
  }

  const title = payload?.p ? payload.p.n : payload?.x[0]?.n ?? "";
  const description = payload?.p
    ? `Shared plan with ${payload.x.length} exercise${payload.x.length === 1 ? "" : "s"}. Exercises you already have are reused, new ones are added.`
    : "Shared exercise. If you already have one with this name, nothing changes.";

  return createPortal(
    <AnimatePresence>
      {payload && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !loading && setPayload(null)}
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
              <Download size={22} className="text-orange-500" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">{title}</h2>
            <p className="text-sm text-zinc-400 mb-6">{description}</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={loading} onClick={() => setPayload(null)}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" loading={loading} onClick={handleAdd}>
                Add
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
