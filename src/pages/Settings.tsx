import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { exportData, importData, isValidBackup, type BackupShape } from "../db/db";
import { useSettingsStore, STAT_KEYS, STAT_LABELS } from "../store/settingsStore";
import { useFilterStore } from "../store/filterStore";
import Button from "../components/Button";
import Toggle from "../components/Toggle";

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingData, setPendingData] = useState<BackupShape | null>(null);
  const [importing, setImporting] = useState(false);
  const { visibleStats, setStatVisible } = useSettingsStore();
  const { filterMode, setFilterMode } = useFilterStore();

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

  async function handleExport() {
    try {
      await exportData();
      toast.success("Backup saved");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-[32px] leading-none text-zinc-900 mb-1">Settings</h1>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-4">Data</h2>

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
            href="https://github.com/placeholder"
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
    </div>
  );
}
