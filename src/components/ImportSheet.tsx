import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import QrScanner from "qr-scanner";
import { toast } from "sonner";
import { ScanLine, ClipboardPaste, ChevronDown } from "lucide-react";
import Button from "./Button";
import {
  parseShareCode,
  parseChunk,
  importShared,
  analyzeImport,
  type SharePayload,
  type ExResolution,
  type ImportCollision,
  type SharedExercise,
} from "../utils/share";
import { slugToTitle } from "../utils/displayUtil";

type Pending = {
  payload: SharePayload;
  collisions: ImportCollision[];
  res: Record<number, ExResolution>;
};

// Fields that differ between your row and the incoming copy, as "yours → theirs".
function diffFields(c: ImportCollision, incoming: SharedExercise) {
  const join = (a: string[]) => (a.length ? a.join(", ") : "—");
  const rows: { label: string; mine: string; theirs: string }[] = [
    { label: "Difficulty", mine: c.existing.difficulty, theirs: incoming.d },
    { label: "Muscles", mine: join(c.existing.muscles.map(slugToTitle)), theirs: join(incoming.m.map(slugToTitle)) },
    { label: "Tools", mine: join(c.existing.tools), theirs: join(incoming.t) },
    { label: "Move", mine: join(c.existing.movementType), theirs: join(incoming.mt) },
    { label: "URL", mine: c.existing.url ?? "—", theirs: incoming.u ?? "—" },
  ];
  return rows.filter((r) => r.mine !== r.theirs);
}

const RES_OPTIONS: { value: ExResolution; label: string }[] = [
  { value: "keep", label: "Keep mine" },
  { value: "copy", label: "Copy" },
  { value: "overwrite", label: "Overwrite" },
];

function importToast(payload: SharePayload, renamedPlans: { from: string; to: string }[]) {
  const plans = payload.p == null ? [] : Array.isArray(payload.p) ? payload.p : [payload.p];
  if (plans.length === 1) toast.success(`Plan "${plans[0].n}" added`);
  else if (plans.length > 1) toast.success(`${plans.length} plans added`);
  else if (payload.x.length === 1) toast.success(`"${payload.x[0].n}" added`);
  else toast.success(`${payload.x.length} exercises added`);

  if (renamedPlans.length === 1) toast(`Plan renamed to "${renamedPlans[0].to}"`);
  else if (renamedPlans.length > 1) toast(`${renamedPlans.length} plans renamed to avoid duplicates`);
}

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
  const [pending, setPending] = useState<Pending | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
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

  // Run the merge and toast. Returns false on failure (caller decides recovery).
  async function runImport(
    payload: SharePayload,
    res?: Record<number, ExResolution>,
  ): Promise<boolean> {
    setLoading(true);
    try {
      const { renamedPlans } = await importShared(payload, res);
      importToast(payload, renamedPlans);
      return true;
    } catch {
      toast.error("Import failed");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // "invalid" → not a code; "pending" → name clashes need a choice; "done" → merged.
  async function doImport(code: string): Promise<"invalid" | "pending" | "done"> {
    const payload = parseShareCode(code);
    if (!payload) return "invalid";
    const collisions = await analyzeImport(payload);
    if (collisions.length > 0) {
      setPending({
        payload,
        collisions,
        res: Object.fromEntries(collisions.map((c) => [c.index, "keep" as ExResolution])),
      });
      return "pending";
    }
    return (await runImport(payload)) ? "done" : "invalid";
  }

  async function confirmResolution() {
    if (!pending) return;
    if (await runImport(pending.payload, pending.res)) {
      setPending(null);
      finishAndClose();
    }
  }

  function finishAndClose() {
    setTab("scan");
    setPasteText("");
    setError("");
    setPending(null);
    setExpanded(new Set());
    resetCollector();
    onClose();
  }

  // Camera scanner lifecycle — runs only while the scan tab is visible.
  useEffect(() => {
    if (!open || tab !== "scan" || pending) return;
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
        const outcome = await doImport(joined);
        if (outcome === "done") finishAndClose();
        else if (outcome === "pending") {
          // Leave scanner stopped; the resolution view takes over.
        } else {
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
  }, [open, tab, pending]);

  async function handlePaste() {
    setError("");
    if (!pasteText.trim()) {
      setError("Paste a code first.");
      return;
    }
    const result = await doImport(pasteText);
    if (result === "done") finishAndClose();
    else if (result === "invalid") setError("That doesn't look like a valid CTrain code.");
    // "pending" → resolution view shows, modal stays open.
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
            {pending ? (
              <>
                <h2 className="text-lg font-bold text-zinc-900 mb-1">Duplicate names</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  These exercises share a name with ones you already have. Pick what to do for each.
                </p>

                <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
                  {pending.collisions.map((c) => {
                    const diff = diffFields(c, pending.payload.x[c.index]);
                    const isOpen = expanded.has(c.index);
                    return (
                      <div key={c.index} className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((s) => {
                              const next = new Set(s);
                              if (next.has(c.index)) next.delete(c.index);
                              else next.add(c.index);
                              return next;
                            })
                          }
                          className="flex items-center justify-between gap-2 cursor-pointer text-left"
                        >
                          <span className="text-sm font-medium text-zinc-800 truncate">{c.name}</span>
                          <span className="flex items-center gap-1 shrink-0 text-xs text-zinc-400">
                            {diff.length === 0
                              ? "Same data"
                              : `${diff.length} change${diff.length === 1 ? "" : "s"}`}
                            <motion.span animate={{ rotate: isOpen ? 180 : 0 }}>
                              <ChevronDown size={14} />
                            </motion.span>
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-1 rounded-xl bg-zinc-50 px-3 py-2 text-xs">
                                {diff.length === 0 ? (
                                  <span className="text-zinc-400">Incoming copy is identical.</span>
                                ) : (
                                  diff.map((r) => (
                                    <div key={r.label} className="flex flex-col gap-0.5">
                                      <span className="font-semibold text-zinc-500">{r.label}</span>
                                      <span className="text-zinc-700">
                                        <span className="text-zinc-400 line-through">{r.mine}</span>
                                        {" → "}
                                        <span className="text-orange-600 font-medium">{r.theirs}</span>
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
                          {RES_OPTIONS.map((o) => (
                            <button
                              key={o.value}
                              type="button"
                              onClick={() =>
                                setPending((p) =>
                                  p ? { ...p, res: { ...p.res, [c.index]: o.value } } : p,
                                )
                              }
                              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                pending.res[c.index] === o.value
                                  ? "bg-white text-zinc-900 shadow-sm"
                                  : "text-zinc-400"
                              }`}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 mt-5">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    disabled={loading}
                    onClick={finishAndClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    loading={loading}
                    onClick={confirmResolution}
                  >
                    Import
                  </Button>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
