import { useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Share2, Trash2, X } from "lucide-react";
import type { SortDir } from "./useTableSort";

const PANEL_WIDTH_KEY = "ctrain-editor-panel-width";
const PANEL_MIN = 320;
const PANEL_MAX = 800;

function loadPanelWidth(): number {
  try {
    const v = Number(localStorage.getItem(PANEL_WIDTH_KEY));
    return v >= PANEL_MIN && v <= PANEL_MAX ? v : 384;
  } catch {
    return 384;
  }
}

export const thCls =
  "text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3 sticky top-0 bg-zinc-50";
export const tdCls = "px-4 py-3 text-sm text-zinc-700";

export function TabLayout({
  title,
  count,
  onAdd,
  addLabel,
  toolbar,
  filters,
  table,
  panel,
}: {
  title: string;
  count: number;
  onAdd?: () => void;
  addLabel?: string;
  toolbar?: ReactNode;
  filters?: ReactNode;
  table: ReactNode;
  panel: ReactNode | null;
}) {
  const [panelWidth, setPanelWidth] = useState(loadPanelWidth);
  const widthRef = useRef(panelWidth);

  function startResize(e: ReactPointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const w = Math.min(PANEL_MAX, Math.max(PANEL_MIN, window.innerWidth - ev.clientX));
      widthRef.current = w;
      setPanelWidth(w);
    };
    const onEnd = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onEnd);
      el.removeEventListener("pointercancel", onEnd);
      try {
        localStorage.setItem(PANEL_WIDTH_KEY, String(widthRef.current));
      } catch {
        // unavailable storage just skips persistence
      }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onEnd);
    el.addEventListener("pointercancel", onEnd);
  }

  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 flex flex-col p-6 gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="font-heading font-semibold text-2xl text-zinc-900">
              {title}
              <span className="ml-2 text-sm font-medium text-zinc-400">{count}</span>
            </h1>
            {toolbar}
            {onAdd && (
              <motion.button
                type="button"
                onClick={onAdd}
                whileTap={{ scale: 0.96 }}
                style={{ willChange: "transform" }}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold cursor-pointer"
              >
                <Plus size={16} />
                {addLabel ?? "Add"}
              </motion.button>
            )}
          </div>
          {filters}
        </div>
        <div className="flex-1 overflow-auto bg-white rounded-2xl border border-zinc-100 shadow-sm">
          {table}
        </div>
      </div>

      <AnimatePresence>
        {panel != null && (
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            style={{ width: panelWidth }}
            className="relative shrink-0 border-l border-zinc-200 bg-white"
          >
            <div
              onPointerDown={startResize}
              title="Drag to resize"
              className="absolute left-0 inset-y-0 w-1.5 z-10 cursor-col-resize hover:bg-zinc-200 active:bg-zinc-300"
            />
            <div className="h-full overflow-y-auto">{panel}</div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RowCheckbox({
  checked,
  indeterminate,
  onClick,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onClick: (e: MouseEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked;
      }}
      checked={checked}
      onChange={() => {}}
      onClick={onClick}
      className="size-4 accent-zinc-700 cursor-pointer align-middle"
    />
  );
}

export function BatchActions({
  count,
  onDelete,
  onClear,
  onShare,
}: {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  onShare?: () => void;
}) {
  if (count === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      <span className="text-sm font-medium text-zinc-500 whitespace-nowrap">{count} selected</span>
      {onShare && (
        <motion.button
          type="button"
          onClick={onShare}
          whileTap={{ scale: 0.96 }}
          style={{ willChange: "transform" }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 text-orange-600 text-sm font-semibold cursor-pointer"
        >
          <Share2 size={14} />
          Share
        </motion.button>
      )}
      <motion.button
        type="button"
        onClick={onDelete}
        whileTap={{ scale: 0.96 }}
        style={{ willChange: "transform" }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold cursor-pointer"
      >
        <Trash2 size={14} />
        Delete
      </motion.button>
      <button
        type="button"
        onClick={onClear}
        title="Clear selection"
        className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function SortableTh({
  label,
  dir,
  onClick,
  className = "",
}: {
  label: string;
  dir?: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th className={`${thCls} ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 uppercase tracking-wide cursor-pointer hover:text-zinc-600"
      >
        {label}
        {dir === "asc" ? (
          <ArrowUp size={12} />
        ) : dir === "desc" ? (
          <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

// Number input that tolerates an empty field while typing. Commits every
// parseable value; on blur snaps back to the last committed one.
export function DraftNumberInput({
  value,
  min = 0,
  step,
  onCommit,
  className,
}: {
  value: number;
  min?: number;
  step?: number | string;
  onCommit: (v: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={focused ? text : String(value)}
      onFocus={() => {
        setText(String(value));
        setFocused(true);
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n)) onCommit(Math.max(min, n));
      }}
      onBlur={() => setFocused(false)}
      className={className}
    />
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-zinc-400 font-medium">
      {children}
    </div>
  );
}
