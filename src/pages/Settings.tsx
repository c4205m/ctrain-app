import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { db, exportData, importData, eraseData, isValidBackup, type BackupShape } from "../db/db";
import { useSettingsStore, STAT_KEYS, STAT_LABELS } from "../store/settingsStore";
import { useFilterStore } from "../store/filterStore";
import Button from "../components/Button";
import Toggle from "../components/Toggle";
import Input from "../components/Input";

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingData, setPendingData] = useState<BackupShape | null>(null);
  const [importing, setImporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const { visibleStats, setStatVisible } = useSettingsStore();
  const { filterMode, setFilterMode } = useFilterStore();

  const [userWeight, setUserWeight] = useState<number | "">("");
  const [userHeight, setUserHeight] = useState<number | "">("");
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
  const [planCount, setPlanCount] = useState<number | null>(null);

  useEffect(() => {
    db.user.toArray().then((users) => {
      if (users[0]) {
        setUserWeight(users[0].weight);
        if (users[0].height) setUserHeight(users[0].height);
      }
    });
    db.exercises.count().then(setExerciseCount);
    db.plans.count().then(setPlanCount);
  }, []);

  const bmiPreview = userWeight && userHeight
    ? (Number(userWeight) / Math.pow(Number(userHeight) / 100, 2)).toFixed(1)
    : null;

  async function handleProfileSave() {
    if (userWeight === "" || userWeight <= 0) return;
    const data: { weight: number; height?: number } = { weight: userWeight };
    if (userHeight !== "" && userHeight > 0) data.height = userHeight;
    const users = await db.user.toArray();
    if (users[0]?.id != null) {
      await db.user.update(users[0].id, data);
    } else {
      await db.user.add(data);
    }
    toast.success("Profile saved");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!isValidBackup(parsed)) {
          toast.error("Invalid backup file");
          return;
        }
        setPendingData(parsed);
      } catch {
        toast.error("Could not read file");
      }
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!pendingData) return;
    setImporting(true);
    try {
      await importData(pendingData);
      toast.success("Data restored");
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
      setPendingData(null);
    }
  }

  async function handleErase() {
    setErasing(true);
    try {
      await eraseData();
      const [ec, pc] = await Promise.all([db.exercises.count(), db.plans.count()]);
      setExerciseCount(ec);
      setPlanCount(pc);
      toast.success("All data erased");
    } catch {
      toast.error("Erase failed");
    } finally {
      setErasing(false);
      setConfirmErase(false);
    }
  }

  async function handleExport() {
    try {
      await exportData();
      toast.success("Backup saved");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="page-scroll p-4 pb-24">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-[32px] leading-none text-zinc-900 mb-1">Settings</h1>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mb-3">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-4">Profile</h2>
        <div className="flex gap-3 mb-3">
          <Input
            label="Weight (kg)"
            type="number"
            inputMode="decimal"
            value={userWeight}
            min={1}
            max={300}
            step={0.1}
            onChange={(e) => setUserWeight(e.target.value === "" ? "" : parseFloat(e.target.value))}
            wrapperClassName="flex-1"
          />
          <Input
            label="Height (cm)"
            type="number"
            inputMode="decimal"
            value={userHeight}
            min={50}
            max={250}
            step={0.1}
            onChange={(e) => setUserHeight(e.target.value === "" ? "" : parseFloat(e.target.value))}
            wrapperClassName="flex-1"
          />
        </div>
        <div className="flex items-center justify-between">
          {bmiPreview ? (
            <span className="text-sm text-zinc-500">
              BMI <span className="font-semibold text-zinc-900">{bmiPreview}</span>
            </span>
          ) : (
            <span />
          )}
          <Button variant="secondary" size="sm" onClick={handleProfileSave}>
            Save
          </Button>
        </div>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-4">Data</h2>

        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-white rounded-xl px-3 py-2">
            <p className="text-xs text-zinc-400">Exercises</p>
            <p className="text-lg font-bold text-zinc-900 leading-tight">{exerciseCount ?? "—"}</p>
          </div>
          <div className="flex-1 bg-white rounded-xl px-3 py-2">
            <p className="text-xs text-zinc-400">Plans</p>
            <p className="text-lg font-bold text-zinc-900 leading-tight">{planCount ?? "—"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Export</p>
              <p className="text-xs text-zinc-400">Download all data as JSON</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              Export
            </Button>
          </div>

          <div className="h-px bg-zinc-200" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Import</p>
              <p className="text-xs text-zinc-400">Replaces all current data</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              Import
            </Button>
          </div>

          <div className="h-px bg-zinc-200" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Erase</p>
              <p className="text-xs text-zinc-400">Delete everything permanently</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmErase(true)}>
              Erase
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-1">Filters</h2>
        <p className="text-xs text-zinc-400 mb-4">Controls how muscle and equipment filters combine when you select multiple options.</p>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-zinc-800">Match Any</p>
            <p className="text-xs text-zinc-400">
              {filterMode === "additive"
                ? "Showing exercises that match at least one selected filter"
                : "Showing exercises that match all selected filters"}
            </p>
          </div>
          <Toggle
            checked={filterMode === "additive"}
            onChange={(v) => setFilterMode(v ? "additive" : "intersection")}
          />
        </label>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-4">Stats</h2>
        <div className="flex flex-col gap-3">
          {STAT_KEYS.map((key, i) => (
            <div key={key}>
              {i > 0 && <div className="h-px bg-zinc-200 mb-3" />}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-zinc-800">{STAT_LABELS[key]}</span>
                <Toggle
                  checked={visibleStats[key]}
                  onChange={(v) => setStatVisible(key, v)}
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-4">About</h2>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">cTrain</p>
              <p className="text-xs text-zinc-400">Version 1.0.0</p>
            </div>
          </div>

          <div className="h-px bg-zinc-200" />

          <a
            href="https://github.com/c4205m/ctrain-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-zinc-800"
          >
            GitHub
          </a>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {createPortal(
        <AnimatePresence>
          {pendingData && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !importing && setPendingData(null)}
              />
              <motion.div
                className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl"
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
                    disabled={importing}
                    onClick={() => setPendingData(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    loading={importing}
                    onClick={confirmImport}
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

      {createPortal(
        <AnimatePresence>
          {confirmErase && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !erasing && setConfirmErase(false)}
              />
              <motion.div
                className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-51 bg-white rounded-3xl px-6 py-8 shadow-2xl"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                style={{ willChange: "transform" }}
              >
                <h2 className="text-lg font-bold text-zinc-900 mb-1">Erase all data?</h2>
                <p className="text-sm text-zinc-400 mb-6">
                  This will permanently delete all exercises, plans, logs, and profile data. Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    disabled={erasing}
                    onClick={() => setConfirmErase(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    loading={erasing}
                    onClick={handleErase}
                  >
                    Erase
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
