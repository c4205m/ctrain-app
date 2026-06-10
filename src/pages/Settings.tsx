import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  exportData,
  importData,
  eraseData,
  resetWeightData,
  resetAllLogs,
  isValidBackup,
  addEquipment,
  deleteEquipment,
  countExercisesUsingTool,
  resetEquipmentToDefaults,
  addMovementType,
  deleteMovementType,
  countExercisesUsingMovementType,
  resetMovementTypesToDefaults,
} from "../db/db";
import { useSettingsStore, STAT_KEYS, STAT_LABELS } from "../store/settingsStore";
import { useFilterStore } from "../store/filterStore";
import Button from "../components/Button";
import Toggle from "../components/Toggle";
import Input from "../components/Input";
import ConfirmModal from "../components/ConfirmModal";

interface PendingAction {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
}

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { visibleStats, setStatVisible } = useSettingsStore();
  const { filterMode, setFilterMode } = useFilterStore();

  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
  const [planCount, setPlanCount] = useState<number | null>(null);

  const equipment = useLiveQuery(() => db.equipment.orderBy("name").toArray(), []);
  const movementTypes = useLiveQuery(() => db.movementTypes.orderBy("name").toArray(), []);
  const [newTool, setNewTool] = useState("");
  const [newMovementType, setNewMovementType] = useState("");
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [movementExpanded, setMovementExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [resetActionsExpanded, setResetActionsExpanded] = useState(false);

  useEffect(() => {
    db.exercises.count().then(setExerciseCount);
    db.plans.count().then(setPlanCount);
  }, []);

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
        setPendingAction({
          title: "Replace all data?",
          description: "This will delete everything and restore from the backup file. This cannot be undone.",
          confirmLabel: "Restore",
          run: async () => {
            await importData(parsed);
            await refreshCounts();
            toast.success("Data restored");
          },
        });
      } catch {
        toast.error("Could not read file");
      }
    };
    reader.readAsText(file);
  }

  async function refreshCounts() {
    const [ec, pc] = await Promise.all([db.exercises.count(), db.plans.count()]);
    setExerciseCount(ec);
    setPlanCount(pc);
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      await pendingAction.run();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
      setPendingAction(null);
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

  async function handleAddTool() {
    const name = newTool.trim();
    if (!name) return;
    await addEquipment(name);
    setNewTool("");
  }

  async function handleDeleteTool(item: { id?: string; name: string }) {
    const count = await countExercisesUsingTool(item.name);
    setPendingAction({
      title: `Delete "${item.name}"?`,
      description: count > 0
        ? `Used by ${count} exercise${count === 1 ? "" : "s"}. It will be removed from ${count === 1 ? "that exercise" : "those exercises"}. Cannot be undone.`
        : "This cannot be undone.",
      confirmLabel: "Delete",
      run: async () => {
        await deleteEquipment(item.id!, item.name);
        toast.success("Tool deleted");
      },
    });
  }

  async function handleAddMovementType() {
    const name = newMovementType.trim();
    if (!name) return;
    await addMovementType(name);
    setNewMovementType("");
  }

  async function handleDeleteMovementType(item: { id?: string; name: string }) {
    const count = await countExercisesUsingMovementType(item.name);
    setPendingAction({
      title: `Delete "${item.name}"?`,
      description: count > 0
        ? `Used by ${count} exercise${count === 1 ? "" : "s"}. It will be removed from ${count === 1 ? "that exercise" : "those exercises"}. Cannot be undone.`
        : "This cannot be undone.",
      confirmLabel: "Delete",
      run: async () => {
        await deleteMovementType(item.id!, item.name);
        toast.success("Movement type deleted");
      },
    });
  }

  return (
    <div className="page-scroll p-4 pb-24">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-[32px] leading-none text-zinc-900 mb-1">Settings</h1>
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

          <button
            type="button"
            onClick={() => setResetActionsExpanded((e) => !e)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <p className="text-sm font-medium text-zinc-800">Reset & Erase</p>
            <motion.div
              animate={{ rotate: resetActionsExpanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <ChevronDown size={18} className="text-zinc-400" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {resetActionsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="pt-3 flex flex-col gap-3">
                  <div className="h-px bg-zinc-200" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">Reset Weight</p>
                      <p className="text-xs text-zinc-400">Clear weight history and current weight</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setPendingAction({
                          title: "Reset weight data?",
                          description: "Clears your weight history and current weight. This cannot be undone.",
                          confirmLabel: "Reset",
                          run: async () => {
                            await resetWeightData();
                            toast.success("Weight data reset");
                          },
                        })
                      }
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="h-px bg-zinc-200" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">Reset Logs</p>
                      <p className="text-xs text-zinc-400">Clear all exercise logs and PRs</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setPendingAction({
                          title: "Reset all logs?",
                          description: "Clears the latest log and PR for every exercise and recalculates plan durations. This cannot be undone.",
                          confirmLabel: "Reset",
                          run: async () => {
                            await resetAllLogs();
                            toast.success("Logs reset");
                          },
                        })
                      }
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="h-px bg-zinc-200" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">Reset Tools</p>
                      <p className="text-xs text-zinc-400">Restore default tool list</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setPendingAction({
                          title: "Reset tools to defaults?",
                          description: "Replaces your current tool list with the default set. This cannot be undone.",
                          confirmLabel: "Reset",
                          run: async () => {
                            await resetEquipmentToDefaults();
                            toast.success("Tools reset");
                          },
                        })
                      }
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="h-px bg-zinc-200" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">Reset Movement Types</p>
                      <p className="text-xs text-zinc-400">Restore default movement type list</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setPendingAction({
                          title: "Reset movement types to defaults?",
                          description: "Replaces your current movement type list with the default set. This cannot be undone.",
                          confirmLabel: "Reset",
                          run: async () => {
                            await resetMovementTypesToDefaults();
                            toast.success("Movement types reset");
                          },
                        })
                      }
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="h-px bg-zinc-200" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">Erase</p>
                      <p className="text-xs text-zinc-400">Delete exercise data permanently</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setPendingAction({
                          title: "Erase all data?",
                          description: "This will permanently delete all exercises, plans, logs, and equipment. Profile data is kept. Cannot be undone.",
                          confirmLabel: "Erase",
                          run: async () => {
                            await eraseData();
                            await refreshCounts();
                            toast.success("All data erased");
                          },
                        })
                      }
                    >
                      Erase
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
        <button
          type="button"
          onClick={() => setToolsExpanded((e) => !e)}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h2 className="font-heading font-semibold text-base text-zinc-900">Tools</h2>
          <motion.div
            animate={{ rotate: toolsExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <ChevronDown size={18} className="text-zinc-400" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {toolsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                <div className="flex flex-col gap-2 mb-3">
                  {equipment?.length === 0 && <p className="text-xs text-zinc-400">No tools yet.</p>}
                  {equipment?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                      <span className="text-sm text-zinc-800">{item.name}</span>
                      <Button variant="ghost" size="sm" iconOnly onClick={() => handleDeleteTool(item)}>
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      inputSize="sm"
                      placeholder="New tool"
                      value={newTool}
                      onChange={(e) => setNewTool(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTool()}
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleAddTool}>
                    Add
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <button
          type="button"
          onClick={() => setMovementExpanded((e) => !e)}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h2 className="font-heading font-semibold text-base text-zinc-900">Movement Types</h2>
          <motion.div
            animate={{ rotate: movementExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <ChevronDown size={18} className="text-zinc-400" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {movementExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                <div className="flex flex-col gap-2 mb-3">
                  {movementTypes?.length === 0 && <p className="text-xs text-zinc-400">No movement types yet.</p>}
                  {movementTypes?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                      <span className="text-sm text-zinc-800">{item.name}</span>
                      <Button variant="ghost" size="sm" iconOnly onClick={() => handleDeleteMovementType(item)}>
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      inputSize="sm"
                      placeholder="New movement type"
                      value={newMovementType}
                      onChange={(e) => setNewMovementType(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMovementType()}
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleAddMovementType}>
                    Add
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <button
          type="button"
          onClick={() => setStatsExpanded((e) => !e)}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h2 className="font-heading font-semibold text-base text-zinc-900">Stats</h2>
          <motion.div
            animate={{ rotate: statsExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <ChevronDown size={18} className="text-zinc-400" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {statsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="pt-4 flex flex-col gap-3">
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
            </motion.div>
          )}
        </AnimatePresence>
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

      <ConfirmModal
        isOpen={pendingAction !== null}
        title={pendingAction?.title ?? ""}
        description={pendingAction?.description ?? ""}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        loading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
