import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Timer, X } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useStopwatchStore } from "../store/stopwatchStore";
import Stopwatch from "../pages/Stopwatch";

const SIZE = 44;
const PAD = 16;

function formatShort(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function FloatTimerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasDragging = useRef(false);
  const { running, getElapsed, requestOpen, clearRequestOpen } = useStopwatchStore();

  useEffect(() => {
    if (requestOpen) { setIsOpen(true); clearRequestOpen(); }
  }, [requestOpen]);
  const [displayElapsed, setDisplayElapsed] = useState(0);

  const x = useMotionValue(PAD);
  const y = useMotionValue(window.innerHeight - SIZE - 96);

  useEffect(() => {
    if (!running) { setDisplayElapsed(getElapsed()); return; }
    let rafId: number;
    const tick = () => { setDisplayElapsed(getElapsed()); rafId = requestAnimationFrame(tick); };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [running]);

  function handleDragEnd() {
    const targetX = x.get() < window.innerWidth / 2 ? PAD : window.innerWidth - SIZE - PAD;
    animate(x, targetX, { type: "spring", stiffness: 400, damping: 30 });
  }

  function handleClick() {
    if (wasDragging.current) { wasDragging.current = false; return; }
    setIsOpen((o) => !o);
  }

  return (
    <>
      <motion.div
        ref={containerRef}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={{
          left: PAD,
          right: window.innerWidth - SIZE - PAD,
          top: PAD,
          bottom: window.innerHeight - SIZE - PAD,
        }}
        style={{ x, y, position: "fixed", top: 0, left: 0, touchAction: "none" }}
        onDragStart={() => { wasDragging.current = true; }}
        onDragEnd={handleDragEnd}
        className="z-40 w-11 h-11"
      >
        <motion.button
          onClick={handleClick}
          animate={{ backgroundColor: running ? "#f97316" : "#ffffff" }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 w-11 h-11 rounded-full shadow-lg flex flex-col items-center justify-center cursor-pointer border border-zinc-100"
          style={{ willChange: "transform" }}
          whileTap={{ scale: 0.92 }}
        >
          {running && displayElapsed > 0 ? (
            <span className="font-mono text-[10px] font-bold text-white tabular-nums leading-none">
              {formatShort(displayElapsed)}
            </span>
          ) : (
            <Timer size={20} color={running ? "#ffffff" : "#71717a"} />
          )}
        </motion.button>
      </motion.div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                className="fixed inset-0 z-50 bg-white"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                style={{ willChange: "transform" }}
              >
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center cursor-pointer"
                >
                  <X size={18} className="text-zinc-500" />
                </button>
                <Stopwatch onClose={() => setIsOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
