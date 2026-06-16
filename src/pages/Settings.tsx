import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  exportData,
  importData,
  eraseData,
  resetApp,
  resetWeightData,
  resetAllLogs,
  isValidBackup,
  addEquipment,
  deleteEquipment,
  renameEquipment,
  countExercisesUsingTool,
  resetEquipmentToDefaults,
  addMovementType,
  deleteMovementType,
  renameMovementType,
  updateMovementTypeDescription,
  countExercisesUsingMovementType,
  resetMovementTypesToDefaults,
  type Equipment,
  type MovementTypeEntry,
} from "../db/db";
import { useSettingsStore, STAT_KEYS, STAT_LABELS } from "../store/settingsStore";
import { useFilterStore } from "../store/filterStore";
import Button from "../components/Button";
import Toggle from "../components/Toggle";
import Input from "../components/Input";
import ConfirmModal from "../components/ConfirmModal";
import ImportSheet from "../components/ImportSheet";
import EditableTagRow from "../components/EditableTagRow";
import { checkForUpdates } from "../utils/pwaUpdate";

const BUILD_LABEL = new Date(__BUILD_DATE__).toLocaleString(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface PendingAction {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => Promise<void>;
}

type SectionKey = "reset" | "tools" | "moves" | "stats";

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const { visibleStats, setStatVisible, chipSearchEnabled, setChipSearchEnabled } = useSettingsStore();
  const { filterMode, setFilterMode } = useFilterStore();

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [resetAppOpen, setResetAppOpen] = useState(false);
  const [resetAppRunning, setResetAppRunning] = useState<"defaults" | "empty" | null>(null);
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [emptyPlanCount, setEmptyPlanCount] = useState(0);

  const equipment = useLiveQuery(() => db.equipment.orderBy("name").toArray(), []);
  const movementTypes = useLiveQuery(() => db.movementTypes.orderBy("name").toArray(), []);
  const [newTool, setNewTool] = useState("");
  const [newMovementType, setNewMovementType] = useState("");
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const sectionRefs = useRef<Record<SectionKey, HTMLDivElement | null>>({
    reset: null,
    tools: null,
    moves: null,
    stats: null,
  });
  // Modals render outside the section element; their clicks must not collapse the section
  const modalOpenRef = useRef(false);
  modalOpenRef.current = pendingAction !== null || resetAppOpen || receiveOpen;

  const toggleSection = (key: SectionKey) => setOpenSection((s) => (s === key ? null : key));

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (modalOpenRef.current) return;
      setOpenSection((open) => {
        if (!open) return open;
        const el = sectionRefs.current[open];
        return el && !el.contains(e.target as Node) ? null : open;
      });
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    refreshCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const [ec, pc, epc] = await Promise.all([
      db.exercises.count(),
      db.plans.count(),
      db.plans.filter((p) => p.exercises.length === 0).count(),
    ]);
    setExerciseCount(ec);
    setPlanCount(pc);
    setEmptyPlanCount(epc);
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

  async function runResetApp(seedDefaults: boolean) {
    setResetAppRunning(seedDefaults ? "defaults" : "empty");
    try {
      await resetApp(seedDefaults);
      localStorage.removeItem("ctrain-settings");
      window.location.reload();
    } catch {
      toast.error("Reset failed");
      setResetAppRunning(null);
      setResetAppOpen(false);
    }
  }

  async function handleCheckUpdates() {
    setCheckingUpdate(true);
    try {
      const updating = await checkForUpdates();
      // A found update activates and reloads the page on its own (autoUpdate)
      if (updating) toast.info("Update found, restarting…");
      else toast.success("Up to date");
    } catch {
      toast.error("Update check failed");
    } finally {
      setCheckingUpdate(false);
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

  async function handleSaveTool(item: Equipment, name: string) {
    if (name !== item.name) await renameEquipment(item.id!, item.name, name);
  }

  async function handleAddMovementType() {
    const name = newMovementType.trim();
    if (!name) return;
    await addMovementType(name);
    setNewMovementType("");
  }

  async function handleSaveMovementType(item: MovementTypeEntry, name: string, description: string) {
    if (name !== item.name) await renameMovementType(item.id!, item.name, name);
    if (description !== (item.description ?? "")) await updateMovementTypeDescription(item.id!, description);
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
        toast.success("Move deleted");
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
            {emptyPlanCount > 0 && (
              <p className="text-[10px] font-medium text-amber-600">
                {emptyPlanCount} empty plan{emptyPlanCount === 1 ? "" : "s"}
              </p>
            )}
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

          <div ref={(el) => { sectionRefs.current.reset = el; }}>
          <button
            type="button"
            onClick={() => toggleSection("reset")}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <p className="text-sm font-medium text-zinc-800">Reset & Erase</p>
            <motion.div
              animate={{ rotate: openSection === "reset" ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <ChevronDown size={18} className="text-zinc-400" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {openSection === "reset" && (
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
                      <p className="text-sm font-medium text-zinc-800">Reset Moves</p>
                      <p className="text-xs text-zinc-400">Restore default move list</p>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setPendingAction({
                          title: "Reset moves to defaults?",
                          description: "Replaces your current move list with the default set. This cannot be undone.",
                          confirmLabel: "Reset",
                          run: async () => {
                            await resetMovementTypesToDefaults();
                            toast.success("Moves reset");
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
                          description: "This will permanently delete all exercises and plans. Tools, moves, weight logs and profile are kept. Cannot be undone.",
                          confirmLabel: "Erase",
                          run: async () => {
                            await eraseData();
                            await refreshCounts();
                            toast.success("Exercises and plans erased");
                          },
                        })
                      }
                    >
                      Erase
                    </Button>
                  </div>

                  <div className="h-px bg-zinc-200" />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">Reset App</p>
                      <p className="text-xs text-zinc-400">Erase everything and start over</p>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => setResetAppOpen(true)}>
                      Reset
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-1">Sharing</h2>
        <p className="text-xs text-zinc-400 mb-4">
          Add an exercise or plan someone shared with you. Scan the animated QR on their
          phone, or paste a copied code.
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-800">Receive shared</p>
            <p className="text-xs text-zinc-400">Scan a QR or paste a code</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setReceiveOpen(true)}>
            Receive
          </Button>
        </div>
      </div>

      <div className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <h2 className="font-heading font-semibold text-base text-zinc-900 mb-4">Filters</h2>
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

        <div className="h-px bg-zinc-200 my-3" />

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-medium text-zinc-800">Chip Search</p>
            <p className="text-xs text-zinc-400">Show a search box above tool and move chips</p>
          </div>
          <Toggle
            checked={chipSearchEnabled}
            onChange={setChipSearchEnabled}
          />
        </label>
      </div>

      <div ref={(el) => { sectionRefs.current.tools = el; }} className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <button
          type="button"
          onClick={() => toggleSection("tools")}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h2 className="font-heading font-semibold text-base text-zinc-900">Tools</h2>
          <motion.div
            animate={{ rotate: openSection === "tools" ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <ChevronDown size={18} className="text-zinc-400" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {openSection === "tools" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="pt-4 px-0.5 pb-0.5">
                <div className="flex flex-col gap-2 mb-3">
                  {equipment?.length === 0 && <p className="text-xs text-zinc-400">No tools yet.</p>}
                  {equipment?.map((item) => (
                    <EditableTagRow
                      key={item.id}
                      item={item}
                      takenNames={equipment.map((e) => e.name)}
                      onDelete={handleDeleteTool}
                      onSave={(it, name) => handleSaveTool(it as Equipment, name)}
                    />
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

      <div ref={(el) => { sectionRefs.current.moves = el; }} className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <button
          type="button"
          onClick={() => toggleSection("moves")}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h2 className="font-heading font-semibold text-base text-zinc-900">Moves</h2>
          <motion.div
            animate={{ rotate: openSection === "moves" ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <ChevronDown size={18} className="text-zinc-400" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {openSection === "moves" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="pt-4 px-0.5 pb-0.5">
                <div className="flex flex-col gap-2 mb-3">
                  {movementTypes?.length === 0 && <p className="text-xs text-zinc-400">No moves yet.</p>}
                  {movementTypes?.map((item) => (
                    <EditableTagRow
                      key={item.id}
                      item={item}
                      withDescription
                      takenNames={movementTypes.map((m) => m.name)}
                      onDelete={handleDeleteMovementType}
                      onSave={(it, name, description) =>
                        handleSaveMovementType(it as MovementTypeEntry, name, description)
                      }
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      inputSize="sm"
                      placeholder="New move"
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

      <div ref={(el) => { sectionRefs.current.stats = el; }} className="bg-zinc-100 rounded-2xl p-4 shadow-sm mt-3">
        <button
          type="button"
          onClick={() => toggleSection("stats")}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h2 className="font-heading font-semibold text-base text-zinc-900">Stats</h2>
          <motion.div
            animate={{ rotate: openSection === "stats" ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <ChevronDown size={18} className="text-zinc-400" />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {openSection === "stats" && (
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
              <p className="text-xs text-zinc-400">Build {BUILD_LABEL}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={checkingUpdate}
              onClick={handleCheckUpdates}
            >
              Check for updates
            </Button>
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
        isOpen={resetAppOpen}
        title="Reset app?"
        description="Deletes ALL data — exercises, plans, logs, tools, moves, weight and profile. Onboarding will run again. This cannot be undone."
        confirmLabel="Start from Defaults"
        secondaryLabel="Start Empty"
        loading={resetAppRunning === "defaults"}
        secondaryLoading={resetAppRunning === "empty"}
        onConfirm={() => runResetApp(true)}
        onSecondary={() => runResetApp(false)}
        onCancel={() => setResetAppOpen(false)}
      />

      <ImportSheet open={receiveOpen} onClose={() => setReceiveOpen(false)} />

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
