import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { db, addWeightEntry, importData, isValidBackup, type BackupShape } from "../db/db";
import { useSettingsStore } from "../store/settingsStore";
import Button from "./Button";
import NumberInput from "./NumberInput";

export default function ProfileSetupModal() {
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);
  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);
  const user = useLiveQuery(() => db.user.toArray().then((u) => u[0] ?? null));
  const [weight, setWeight] = useState<number | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [restoring, setRestoring] = useState(false);
  const [pendingData, setPendingData] = useState<BackupShape | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Existing users who already set weight + height (e.g. via the old Settings form) skip onboarding
  useEffect(() => {
    if (!onboardingComplete && user?.weight && user?.height) setOnboardingComplete();
  }, [onboardingComplete, user, setOnboardingComplete]);

  const shouldShow = !onboardingComplete && user !== undefined && !(user?.weight && user?.height);
  const isValid = weight != null && weight > 0 && height != null && height > 0;

  async function handleSave() {
    if (!isValid || weight == null || height == null) return;
    await addWeightEntry(weight);
    const users = await db.user.toArray();
    if (users[0]?.id != null) await db.user.update(users[0].id, { height });
    setOnboardingComplete();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.target?.result as string);
      } catch {
        toast.error("Could not read file");
        return;
      }
      if (!isValidBackup(parsed)) {
        toast.error("Invalid backup file");
        return;
      }
      setPendingData(parsed);
    };
    reader.readAsText(file);
  }

  async function confirmRestore() {
    if (!pendingData) return;
    setRestoring(true);
    try {
      await importData(pendingData);
      toast.success("Data restored");
      setOnboardingComplete();
    } catch {
      toast.error("Import failed");
    } finally {
      setRestoring(false);
      setPendingData(null);
    }
  }

  return (
    <>
    {createPortal(
    <AnimatePresence>
      {shouldShow && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            layout="size"
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            style={{ willChange: "transform" }}
          >
            <h2 className="text-lg font-bold text-zinc-900 mb-0.5">Welcome to cTrain</h2>
            <p className="text-xs text-zinc-400 mb-6">Add your weight and height to track BMI and bodyweight exercises</p>

            <div className="flex gap-3">
              <NumberInput
                label="Weight (kg)"
                inputMode="decimal"
                decimals={1}
                value={weight}
                emptyValue={undefined}
                min={1}
                max={300}
                step={0.1}
                onChange={setWeight}
                wrapperClassName="flex-1"
              />
              <NumberInput
                label="Height (cm)"
                inputMode="decimal"
                decimals={1}
                value={height}
                emptyValue={undefined}
                min={50}
                max={250}
                step={0.1}
                onChange={setHeight}
                wrapperClassName="flex-1"
              />
            </div>

            <Button variant="primary" className="w-full mt-6" disabled={!isValid} onClick={handleSave}>
              Save
            </Button>

            <button
              type="button"
              className="w-full mt-3 text-xs text-zinc-400 underline"
              onClick={() => fileRef.current?.click()}
            >
              Already have a backup? Restore it
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
    )}

    {createPortal(
      <AnimatePresence>
        {pendingData && (
          <>
            <motion.div
              className="fixed inset-0 z-60 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !restoring && setPendingData(null)}
            />
            <motion.div
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-60 bg-white rounded-3xl px-6 py-8 shadow-2xl"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              style={{ willChange: "transform" }}
            >
              <h2 className="text-lg font-bold text-zinc-900 mb-1">Replace all data?</h2>
              <p className="text-sm text-zinc-400 mb-6">
                This will delete everything and restore from the backup file. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={restoring}
                  onClick={() => setPendingData(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  loading={restoring}
                  onClick={confirmRestore}
                >
                  Restore
                </Button>
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
