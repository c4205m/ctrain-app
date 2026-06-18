import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { db, addWeightEntry, updateWeightEntry, deleteWeightEntry } from "../db/db";
import { formatDateDM } from "../utils/timeUtil";
import Button from "./Button";
import NumberInput from "./NumberInput";

interface WeightLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight?: number;
}

export default function WeightLogModal({ isOpen, onClose, currentWeight }: WeightLogModalProps) {
  const [weight, setWeight] = useState<number | undefined>(currentWeight);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number | "">("");

  const history = useLiveQuery(
    () => db.weightLogs.orderBy("date").reverse().limit(8).toArray(),
    [],
    []
  );

  useEffect(() => {
    if (isOpen) {
      setWeight(currentWeight);
      setEditingId(null);
    }
  }, [isOpen, currentWeight]);

  function handleSave() {
    if (weight == null || weight <= 0) return;
    onClose();
    addWeightEntry(weight)
      .then(() => toast.success("Weight logged"))
      .catch(() => toast.error("Failed to save weight"));
  }

  function startEdit(id: string, current: number) {
    setEditingId(id);
    setEditValue(current);
  }

  function commitEdit(id: string) {
    if (editValue === "" || editValue <= 0) {
      setEditingId(null);
      return;
    }
    updateWeightEntry(id, editValue)
      .then(() => toast.success("Entry updated"))
      .catch(() => toast.error("Failed to update entry"));
    setEditingId(null);
  }

  function handleDelete(id: string) {
    deleteWeightEntry(id)
      .then(() => toast.success("Entry deleted"))
      .catch(() => toast.error("Failed to delete entry"));
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            layout="size"
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            style={{ willChange: "transform" }}
          >
            <h2 className="text-lg font-bold text-zinc-900 mb-0.5">Log Weight</h2>
            <p className="text-xs text-zinc-400 mb-6">Track your bodyweight over time</p>

            <NumberInput
              label="Weight (kg)"
              inputMode="decimal"
              decimals={2}
              value={weight}
              emptyValue={undefined}
              min={0.01}
              max={500}
              step={0.1}
              onChange={setWeight}
            />

            <div className="flex gap-2 mt-6">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSave}>
                Save
              </Button>
            </div>

            {history.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-zinc-400 mb-2">History</p>
                <div className="flex flex-col">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0"
                    >
                      <span className="text-xs text-zinc-400">{formatDateDM(entry.date)}</span>
                      {editingId === entry.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0.01}
                            max={500}
                            step={0.1}
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value === "" ? "" : parseFloat(e.target.value))}
                            onKeyDown={(e) => e.key === "Enter" && commitEdit(entry.id!)}
                            className="w-16 text-sm text-right border-b border-orange-400 focus:outline-none"
                          />
                          <button type="button" onClick={() => commitEdit(entry.id!)} className="text-orange-500 cursor-pointer">
                            <Check size={16} />
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="text-zinc-400 cursor-pointer">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-zinc-900">
                            {entry.weight} <span className="text-xs font-normal text-zinc-400">kg</span>
                          </span>
                          <button type="button" onClick={() => startEdit(entry.id!, entry.weight)} className="text-zinc-400 cursor-pointer">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => handleDelete(entry.id!)} className="text-zinc-400 cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
