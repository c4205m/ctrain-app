import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { type MovementTypeEntry, updateMovementTypeDescription } from "../db/db";
import Button from "./Button";
import Input from "./Input";

interface MovementTypeRowProps {
  item: MovementTypeEntry;
  onDelete: (item: MovementTypeEntry) => void;
}

export default function MovementTypeRow({ item, onDelete }: MovementTypeRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Mirrors `editing` synchronously: Enter triggers save, then the input
  // unmounts and its blur fires save again before state has re-rendered.
  const editingRef = useRef(false);

  function open() {
    setDraft(item.description ?? "");
    editingRef.current = true;
    setEditing(true);
  }

  async function save() {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (item.description ?? "")) {
      await updateMovementTypeDescription(item.id!, trimmed);
    }
  }

  return (
    <div className="bg-white rounded-xl px-3 py-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (editing ? save() : open())}
          className="flex-1 min-w-0 flex flex-col items-start text-left cursor-pointer"
        >
          <span className="text-sm text-zinc-800">{item.name}</span>
          {!editing && item.description && (
            <span className="text-xs text-zinc-400">{item.description}</span>
          )}
        </button>
        <Button variant="ghost" size="sm" iconOnly onClick={() => onDelete(item)}>
          <X size={16} />
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <Input
                inputSize="sm"
                placeholder="Description (optional)"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
