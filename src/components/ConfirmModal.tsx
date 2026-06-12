import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  // Optional second choice; when set, buttons stack vertically
  secondaryLabel?: string;
  secondaryLoading?: boolean;
  onSecondary?: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
  secondaryLabel,
  secondaryLoading = false,
  onSecondary,
}: ConfirmModalProps) {
  const busy = loading || secondaryLoading;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !busy && onCancel()}
          />
          <motion.div
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            style={{ willChange: "transform" }}
          >
            <h2 className="text-lg font-bold text-zinc-900 mb-1">{title}</h2>
            <p className="text-sm text-zinc-400 mb-6">{description}</p>
            {secondaryLabel ? (
              <div className="flex flex-col gap-2">
                <Button variant="danger" fullWidth loading={loading} disabled={secondaryLoading} onClick={onConfirm}>
                  {confirmLabel}
                </Button>
                <Button variant="danger" fullWidth loading={secondaryLoading} disabled={loading} onClick={onSecondary}>
                  {secondaryLabel}
                </Button>
                <Button variant="ghost" fullWidth disabled={busy} onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" disabled={loading} onClick={onCancel}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" loading={loading} onClick={onConfirm}>
                  {confirmLabel}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
