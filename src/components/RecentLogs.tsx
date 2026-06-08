import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Exercise } from "../db/db";
import { clearLog } from "../db/db";
import { MUSCLE_COLOR, slugToTitle } from "../utils/displayUtil";
import { timeAgo, formatDateDM } from "../utils/timeUtil";
import Chip from "./Chip";

interface RecentLogsProps {
  exercises: Exercise[];
  limit?: number;
}

const UNIT: Record<string, string> = { rep: "reps", distance: "m", duration: "s" };
const DELETE_THRESHOLD = -100;

function SwipeRow({ ex, onDeleted }: { ex: Exercise; onDeleted: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const xPos = useMotionValue(0);
  const deleteOpacity = useTransform(xPos, [0, DELETE_THRESHOLD], [0, 1]);
  const log = ex.latestLog!;
  const unit = UNIT[log.setType] ?? "reps";
  const label = `${log.sets}×${log.effortPerSet} ${unit}`;
  const color = MUSCLE_COLOR[ex.muscles[0]];
  const isOpen = selectedId === ex.id;

  function handleDragEnd() {
    if (xPos.get() <= DELETE_THRESHOLD) {
      clearLog(ex.id!)
        .then(onDeleted)
        .catch(() => toast.error("Failed to remove log"));
    } else {
      animate(xPos, 0, { type: "spring", stiffness: 400, damping: 35 });
    }
  }

  return (
    <div className="border-b border-zinc-100 last:border-0 relative overflow-hidden">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4"
      >
        <Trash2 size={16} className="text-white" />
      </motion.div>

      <motion.div
        style={{ x: xPos }}
        drag="x"
        dragConstraints={{ left: DELETE_THRESHOLD * 1.2, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="relative bg-white"
      >
        <button
          type="button"
          onClick={() => setSelectedId(isOpen ? null : ex.id!)}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color ?? "#d4d4d8" }} />
          <span className="text-sm font-semibold text-zinc-900 flex-1 truncate">{ex.name}</span>
          <Chip variant="secondary">{label}</Chip>
          <span className="text-xs text-zinc-400 text-right min-w-14">{timeAgo(log.date)}</span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {ex.muscles.map((m) => (
                    <Chip key={m} variant="custom" customClass="text-white border-none" style={{ backgroundColor: MUSCLE_COLOR[m] }}>
                      {slugToTitle(m)}
                    </Chip>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Last session</div>
                    <div className="font-heading font-bold text-zinc-900 text-sm">{log.sets}×{log.effortPerSet} {unit}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {log.bodyweight ? "Bodyweight" : `${log.weight} kg`} · {formatDateDM(log.date)}
                    </div>
                  </div>
                  {ex.highestLog && (
                    <div className="bg-zinc-50 rounded-xl p-3">
                      <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Personal best</div>
                      <div className="font-heading font-bold text-zinc-900 text-sm">
                        {ex.highestLog.sets}×{ex.highestLog.effortPerSet} {UNIT[ex.highestLog.setType] ?? "reps"}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {ex.highestLog.bodyweight ? "Bodyweight" : `${ex.highestLog.weight} kg`} · {formatDateDM(ex.highestLog.date)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function RecentLogs({ exercises, limit = 8 }: RecentLogsProps) {
  const [showAll, setShowAll] = useState(false);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const sorted = exercises
    .filter((e) => !!e.latestLog && !deleted.has(e.id!))
    .sort((a, b) => new Date(b.latestLog!.date).getTime() - new Date(a.latestLog!.date).getTime());

  const recent = sorted.slice(0, limit);

  function handleDeleted(id: string) {
    setDeleted((prev) => new Set(prev).add(id));
    toast.success("Log removed");
  }

  const rows = (list: Exercise[]) =>
    list.map((ex) => (
      <SwipeRow key={ex.id} ex={ex} onDeleted={() => handleDeleted(ex.id!)} />
    ));

  return (
    <>
      {recent.length === 0 ? (
        <p className="text-sm text-zinc-400">No logs yet</p>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            {rows(recent)}
          </div>
          {sorted.length > limit && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 text-xs text-orange-500 font-medium cursor-pointer"
            >
              Show all ({sorted.length})
            </button>
          )}
        </>
      )}

      {createPortal(
        <AnimatePresence>
          {showAll && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAll(false)}
              />
              <motion.div
                className="fixed inset-x-4 top-16 bottom-24 z-50 bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                style={{ willChange: "transform" }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
                  <h2 className="text-lg font-bold text-zinc-900">All Logs</h2>
                  <button type="button" onClick={() => setShowAll(false)} className="text-zinc-400 cursor-pointer">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-xs text-zinc-400 px-5 py-2 shrink-0">Swipe left to remove a log</p>
                <div className="overflow-y-auto flex-1">
                  {rows(sorted)}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
