import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useStopwatchStore, type PlanSession } from "../store/stopwatchStore";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function formatLapTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${mins > 0 ? `${mins}:` : ""}${String(secs).padStart(mins > 0 ? 2 : 1, "0")}.${String(centis).padStart(2, "0")}`;
}

interface StopwatchProps {
  onClose?: () => void;
}

export default function Stopwatch({ onClose }: StopwatchProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    running, laps, currentLabel, isComplete, exIdx, currentSet,
    lapStartBase, session,
    getElapsed, start, pause, reset, recordLap,
    setCurrentLabel, setIsComplete, setExIdx, setCurrentSet, setSession,
  } = useStopwatchStore();

  // Sync session from location.state on mount only
  useEffect(() => {
    const locSession = (location.state as { session?: PlanSession } | null)?.session ?? null;
    if (locSession) setSession(locSession);
  }, []);

  const isPlanMode = !!session;

  // Local display state — RAF updates this while mounted; store holds truth
  const [displayElapsed, setDisplayElapsed] = useState(() => getElapsed());

  useEffect(() => {
    if (!running) {
      setDisplayElapsed(getElapsed());
      return;
    }
    let rafId: number;
    const tick = () => {
      setDisplayElapsed(getElapsed());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [running]);

  const currentLapElapsed = displayElapsed - lapStartBase;

  const planEx = session?.plan.exercises[exIdx];
  const planExercise = session?.exercises.find((e) => e.id === planEx?.exerciseId);
  const totalSets = planEx?.sets ?? 1;

  const isRest = currentLabel === "Rest";
  const clockColor = displayElapsed > 0
    ? (isRest ? "text-blue-500" : "text-orange-500")
    : "text-zinc-900";

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const topContentRef = useRef<HTMLDivElement>(null);
  const [centerPad, setCenterPad] = useState(() => Math.round(window.innerHeight * 0.35));

  useLayoutEffect(() => {
    if (!topContentRef.current) return;
    const h = topContentRef.current.scrollHeight + 16; // pb-4
    setCenterPad(Math.max(16, Math.round((window.innerHeight - h) / 2)));
  }, [isPlanMode, isComplete]);

  function handleReset() {
    reset();
    setDisplayElapsed(0);
    if (isPlanMode) {
      if (onClose) onClose();
      else navigate("/dev/stopwatch", { replace: true, state: null });
    }
  }

  function handleLap(type: "Work" | "Rest") {
    if (!running) {
      start(type);
      return;
    }

    let lapLabel = currentLabel;

    if (isPlanMode && currentLabel === "Work") {
      const isLastSet = currentSet >= totalSets;
      const isLastExercise = exIdx + 1 >= (session?.plan.exercises.length ?? 0);
      lapLabel = `${planExercise?.name ?? "Exercise"} • Set ${currentSet}`;

      if (isLastSet && isLastExercise) {
        pause();
        setIsComplete(true);
      } else if (isLastSet) {
        setExIdx((i) => i + 1);
        setCurrentSet(() => 1);
      } else {
        setCurrentSet((s) => s + 1);
      }
    }

    recordLap(lapLabel);
    setCurrentLabel(type);
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
      <motion.div
        className="px-4 pb-4 shrink-0"
        animate={{ paddingTop: laps.length === 0 ? centerPad : 16 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div ref={topContentRef}>
          {/* Plan context */}
          {isPlanMode && !isComplete && (
            <div className="flex flex-col items-center mb-3">
              <span className="text-base font-semibold text-zinc-900">
                {planExercise?.name ?? "Exercise"}
              </span>
              <span className="text-xs text-zinc-400">
                Set {currentSet} of {totalSets}
              </span>
            </div>
          )}

          {isComplete && (
            <div className="flex flex-col items-center mb-3">
              <span className="text-base font-semibold text-zinc-900">Workout Complete</span>
              <span className="text-xs text-zinc-400">{formatTime(displayElapsed)} total</span>
            </div>
          )}

          {/* Timer display */}
          <motion.div
            className="flex flex-col items-center gap-1 mb-8 cursor-pointer"
            onClick={() => {
              if (didLongPressRef.current) { didLongPressRef.current = false; return; }
              if (displayElapsed === 0) return;
              if (running) pause(); else start();
            }}
            onPointerDown={() => {
              didLongPressRef.current = false;
              longPressRef.current = setTimeout(() => { didLongPressRef.current = true; handleReset(); }, 600);
            }}
            onPointerUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
            onPointerLeave={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
            whileTap={{ scale: 0.97 }}
            style={{ willChange: "transform" }}
          >
            <span className={`font-mono text-6xl font-semibold tabular-nums tracking-tight ${clockColor}`}>
              {displayElapsed > 0 ? formatTime(currentLapElapsed) : formatTime(0)}
            </span>
            {displayElapsed > 0 && (
              <span className="text-sm font-mono tabular-nums text-zinc-400">
                {currentLabel} • {formatTime(displayElapsed)}
              </span>
            )}
          </motion.div>

          {/* Controls */}
          {!isComplete && (
            <div className="flex gap-3 mb-6">
              <motion.button
                type="button"
                onClick={() => handleLap("Work")}
                whileTap={{ scale: 0.95 }}
                style={{ willChange: "transform" }}
                className="flex-1 bg-orange-500 text-white font-semibold py-4 rounded-2xl text-base"
              >
                Work
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleLap("Rest")}
                whileTap={{ scale: 0.95 }}
                style={{ willChange: "transform" }}
                className="flex-1 bg-blue-500 text-white font-semibold py-4 rounded-2xl text-base"
              >
                Rest
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Lap list — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24">
        <AnimatePresence initial={false}>
          {laps.map((lap, i) => (
            <motion.div
              key={laps.length - i}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex items-center justify-between py-3 border-b border-zinc-100"
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${lap.label === "Rest" ? "bg-blue-500" : "bg-orange-500"}`} />
                <span className="text-sm font-semibold text-zinc-900">{lap.label}</span>
                <span className="text-xs text-zinc-400">Lap {laps.length - i}</span>
              </div>
              <span className="font-mono text-sm text-zinc-700 tabular-nums">{formatLapTime(lap.ms)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
