import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

export const thCls =
  "text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3 sticky top-0 bg-zinc-50";
export const tdCls = "px-4 py-3 text-sm text-zinc-700";

export function TabLayout({
  title,
  count,
  onAdd,
  addLabel,
  toolbar,
  table,
  panel,
}: {
  title: string;
  count: number;
  onAdd?: () => void;
  addLabel?: string;
  toolbar?: ReactNode;
  table: ReactNode;
  panel: ReactNode | null;
}) {
  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 flex flex-col p-6 gap-4">
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
            className="w-96 shrink-0 border-l border-zinc-200 bg-white overflow-y-auto"
          >
            {panel}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-zinc-400 font-medium">
      {children}
    </div>
  );
}
