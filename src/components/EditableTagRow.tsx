import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Trash2, ChevronDown } from "lucide-react";
import Button from "./Button";
import Input from "./Input";

interface TagItem {
  id?: string;
  name: string;
  description?: string;
}

interface EditableTagRowProps {
  item: TagItem;
  withDescription?: boolean;
  takenNames: string[];
  onDelete: (item: TagItem) => void;
  onSave: (item: TagItem, name: string, description: string) => Promise<void>;
}

export default function EditableTagRow({
  item,
  withDescription = false,
  takenNames,
  onDelete,
  onSave,
}: EditableTagRowProps) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  // Mirrors `editing` synchronously: Enter triggers save, then inputs
  // unmount and their blur fires save again before state has re-rendered.
  const editingRef = useRef(false);

  function open() {
    setNameDraft(item.name);
    setDescDraft(item.description ?? "");
    editingRef.current = true;
    setEditing(true);
  }

  async function save() {
    if (!editingRef.current) return;
    const name = nameDraft.trim();
    if (name !== item.name && takenNames.includes(name)) {
      toast.error(`"${name}" already exists`);
      return;
    }
    editingRef.current = false;
    setEditing(false);
    if (!name) return;
    const description = descDraft.trim();
    if (name !== item.name || description !== (item.description ?? "")) {
      await onSave(item, name, description);
    }
  }

  function handleWrapperBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) save();
  }

  return (
    <div className="bg-white rounded-xl px-3 py-2" onBlur={handleWrapperBlur}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (editing ? save() : open())}
          className="flex-1 min-w-0 flex items-center justify-between gap-2 text-left cursor-pointer"
        >
          <span className="flex flex-col min-w-0">
            <span className="text-sm text-zinc-800">{item.name}</span>
            {!editing && item.description && (
              <span className="text-xs text-zinc-400">{item.description}</span>
            )}
          </span>
        </button>
        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <motion.div
              key="delete"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", duration: 0.2, bounce: 0.2 }}
              style={{ willChange: "transform" }}
            >
              <Button variant="ghost" size="sm" iconOnly onClick={() => onDelete(item)}>
                <Trash2 size={16} />
              </Button>
            </motion.div>
          ) : (
            <motion.button
              key="chevron"
              type="button"
              onClick={open}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", duration: 0.2, bounce: 0.2 }}
              style={{ willChange: "transform" }}
              className="w-8 h-8 flex items-center justify-center cursor-pointer"
            >
              <ChevronDown size={16} className="text-zinc-300" />
            </motion.button>
          )}
        </AnimatePresence>
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
            <div className="pt-2 px-0.5 pb-0.5 flex flex-col gap-2">
              <Input
                inputSize="sm"
                placeholder="Name"
                value={nameDraft}
                autoFocus
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
              {withDescription && (
                <Input
                  inputSize="sm"
                  placeholder="Description (optional)"
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
