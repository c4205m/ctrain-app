import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { useStopwatchStore, type PlanSession } from "../store/stopwatchStore";
import LogModal from "../components/LogModal";
import type { Exercise } from "../db/db";

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

// Top padding while no laps recorded must clear the close button (top-4 + h-9 + gap)
const CLOSE_BTN_CLEARANCE = 64;

interface StopwatchProps {
  onClose?: () => void;
}

export default function Stopwatch({ onClose }: StopwatchProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    running, laps, currentLabel, isComplete, exIdx, currentSet,
    lapStartBase, session,
    getElapsed, start, pause, reset, recordLap, addExerciseDoneMarker,
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

  const [logTarget, setLogTarget] = useState<Exercise | null>(null);
  const [logPrefill, setLogPrefill] = useState<{ sets?: number; reps?: number; duration?: number } | undefined>(undefined);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  const setDurationsRef = useRef<number[]>([]);

  const topContentRef = useRef<HTMLDivElement>(null);
  const [centerPad, setCenterPad] = useState(() => Math.round(window.innerHeight * 0.35));

  useLayoutEffect(() => {
    if (!topContentRef.current) return;
    const h = topContentRef.current.scrollHeight + 16; // pb-4
    setCenterPad(Math.max(CLOSE_BTN_CLEARANCE, Math.round((window.innerHeight - h) / 2)));
  }, [isPlanMode, isComplete]);

  function handleReset() {
    reset();
    setDisplayElapsed(0);
    setDurationsRef.current = [];
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
    let exerciseDoneMarker: { label: string; exerciseId?: string; sets?: number; reps?: number; duration?: number } | null = null;

    if (isPlanMode && currentLabel === "Work") {
      const isLastSet = currentSet >= totalSets;
      const isLastExercise = exIdx + 1 >= (session?.plan.exercises.length ?? 0);
      const exerciseName = planExercise?.name ?? "Exercise";
      lapLabel = `${exerciseName} • Set ${currentSet}`;

      const thisSetMs = getElapsed() - lapStartBase;
      setDurationsRef.current.push(thisSetMs);

      if (isLastSet) {
        const allSetMs = setDurationsRef.current;
        const avgMs = allSetMs.reduce((a, b) => a + b, 0) / allSetMs.length;
        setDurationsRef.current = [];

        exerciseDoneMarker = {
          label: exerciseName,
          exerciseId: planEx?.exerciseId,
          sets: planEx?.sets,
          reps: planEx?.reps,
          duration: Math.round((avgMs / 1000) * 100) / 100,
        };
      }

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
    if (exerciseDoneMarker) addExerciseDoneMarker(exerciseDoneMarker);
    setCurrentLabel(type);
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
      <motion.div
        className="px-4 pb-4 shrink-0"
        animate={{ paddingTop: laps.length === 0 ? centerPad : CLOSE_BTN_CLEARANCE }}
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
          {(() => {
            let setNumber = laps.filter((l) => l.kind !== "exercise-done").length;
            return laps.map((lap, i) => {
              if (lap.kind === "exercise-done") {
                return (
                  <motion.div
                    key={laps.length - i}
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="flex items-center justify-between gap-3 my-2 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100"
                  >
                    <span className="text-sm font-semibold text-zinc-900 truncate">{lap.label} finished</span>
                    <button
                      type="button"
                      onClick={() => {
                        const exercise = session?.exercises.find((e) => e.id === lap.exerciseId);
                        if (!exercise) return;
                        setLogTarget(exercise);
                        setLogPrefill({ sets: lap.sets, reps: lap.reps, duration: lap.duration });
                      }}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-500 shrink-0 shadow-sm cursor-pointer"
                      aria-label="Log exercise"
                    >
                      <ClipboardList size={14} />
                    </button>
                  </motion.div>
                );
              }

              const lapNumber = setNumber--;
              return (
                <motion.div
                  key={laps.length - i}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex items-center justify-between py-3 border-b border-zinc-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${lap.label === "Rest" ? "bg-blue-500" : "bg-orange-500"}`} />
                    <span className="text-sm font-semibold text-zinc-900 truncate">{lap.label}</span>
                    <span className="text-xs text-zinc-400 shrink-0">Lap {lapNumber}</span>
                  </div>
                  <span className="font-mono text-sm text-zinc-700 tabular-nums">{formatLapTime(lap.ms ?? 0)}</span>
                </motion.div>
              );
            });
          })()}
        </AnimatePresence>
      </div>

      <LogModal
        exercise={logTarget}
        isOpen={logTarget !== null}
        onClose={() => { setLogTarget(null); setLogPrefill(undefined); }}
        prefill={logPrefill}
      />
    </div>
  );
}
