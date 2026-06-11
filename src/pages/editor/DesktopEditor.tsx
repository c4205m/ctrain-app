import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  ClipboardList,
  Wrench,
  MoveDiagonal,
  Scale,
  UserRound,
  Download,
  FolderOpen,
  Sparkles,
  FilePlus2,
} from "lucide-react";
import {
  type EditorDataset,
  newDefaultDataset,
  newEmptyDataset,
  parseBackupFile,
  exportDataset,
} from "./editorData";
import ExercisesTab from "./tables/ExercisesTab";
import PlansTab from "./tables/PlansTab";
import TagListTab from "./tables/TagListTab";
import WeightLogsTab from "./tables/WeightLogsTab";
import ProfileTab from "./tables/ProfileTab";

const TABS = [
  { key: "exercises", label: "Exercises", icon: Dumbbell },
  { key: "plans", label: "Plans", icon: ClipboardList },
  { key: "equipment", label: "Equipment", icon: Wrench },
  { key: "movementTypes", label: "Moves", icon: MoveDiagonal },
  { key: "weightLogs", label: "Weight logs", icon: Scale },
  { key: "profile", label: "Profile", icon: UserRound },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DesktopEditor() {
  const [dataset, setDataset] = useState<EditorDataset | null>(null);
  const [tab, setTab] = useState<TabKey>("exercises");
  const [fileError, setFileError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function warn(e: BeforeUnloadEvent) {
      if (dirtyRef.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function update(fn: (ds: EditorDataset) => EditorDataset) {
    dirtyRef.current = true;
    setDataset((ds) => (ds ? fn(ds) : ds));
  }

  async function handleFile(file: File) {
    try {
      setDataset(parseBackupFile(await file.text()));
      setFileError(null);
    } catch {
      setFileError("Could not read that file. Pick a cTrain backup JSON.");
    }
  }

  function handleExport() {
    if (!dataset) return;
    exportDataset(dataset);
    dirtyRef.current = false;
  }

  return (
    <div className="hidden md:flex fixed inset-0 bg-zinc-50 select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {dataset === null ? (
        <StartScreen
          fileError={fileError}
          onOpenFile={() => fileInputRef.current?.click()}
          onDefaults={() => setDataset(newDefaultDataset())}
          onEmpty={() => setDataset(newEmptyDataset())}
        />
      ) : (
        <>
          {/* Sidebar */}
          <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-zinc-200 p-4">
            <span className="font-heading font-bold text-xl text-zinc-900 tracking-tight px-2 mb-1">
              cTrain
            </span>
            <span className="text-xs text-zinc-400 font-medium px-2 mb-6">Data editor</span>

            <nav className="flex flex-col gap-1">
              {TABS.map(({ key, label, icon: Icon }) => (
                <motion.button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  whileTap={{ scale: 0.97 }}
                  style={{ willChange: "transform" }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer text-left ${
                    tab === key ? "bg-orange-50 text-orange-600" : "text-zinc-500 hover:bg-zinc-50"
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                  {label}
                </motion.button>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-2">
              <motion.button
                type="button"
                onClick={handleExport}
                whileTap={{ scale: 0.97 }}
                style={{ willChange: "transform" }}
                className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold cursor-pointer"
              >
                <Download size={16} />
                Export backup
              </motion.button>
              <button
                type="button"
                onClick={() => {
                  if (!dirtyRef.current || window.confirm("Discard unsaved changes?")) {
                    dirtyRef.current = false;
                    setDataset(null);
                  }
                }}
                className="text-xs text-zinc-400 font-medium hover:text-zinc-600 cursor-pointer py-1"
              >
                Close dataset
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="h-full"
              >
                {tab === "exercises" && <ExercisesTab dataset={dataset} update={update} />}
                {tab === "plans" && <PlansTab dataset={dataset} update={update} />}
                {tab === "equipment" && <TagListTab kind="equipment" dataset={dataset} update={update} />}
                {tab === "movementTypes" && (
                  <TagListTab kind="movementTypes" dataset={dataset} update={update} />
                )}
                {tab === "weightLogs" && <WeightLogsTab dataset={dataset} update={update} />}
                {tab === "profile" && <ProfileTab dataset={dataset} update={update} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
}

function StartScreen({
  fileError,
  onOpenFile,
  onDefaults,
  onEmpty,
}: {
  fileError: string | null;
  onOpenFile: () => void;
  onDefaults: () => void;
  onEmpty: () => void;
}) {
  const options = [
    {
      icon: FolderOpen,
      title: "Open backup file",
      desc: "Edit a backup exported from your phone, then import it back.",
      onClick: onOpenFile,
    },
    {
      icon: Sparkles,
      title: "Start from defaults",
      desc: "Begin with the exercises, equipment and plans the app ships with.",
      onClick: onDefaults,
    },
    {
      icon: FilePlus2,
      title: "Start empty",
      desc: "Blank dataset. Build everything from scratch.",
      onClick: onEmpty,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="flex flex-col items-center gap-2 text-center"
      >
        <span className="font-heading font-bold text-3xl text-zinc-900 tracking-tight">
          Edit my data
        </span>
        <span className="text-base text-zinc-400 font-medium max-w-md">
          Changes stay in this window until you export. Import the exported file on your phone via
          Settings.
        </span>
      </motion.div>

      <div className="flex gap-4">
        {options.map(({ icon: Icon, title, desc, onClick }, i) => (
          <motion.button
            key={title}
            type="button"
            onClick={onClick}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.06, type: "spring", stiffness: 300, damping: 28 }}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -2 }}
            style={{ willChange: "transform" }}
            className="w-60 flex flex-col items-start gap-3 bg-white rounded-2xl p-5 shadow-sm border border-zinc-100 cursor-pointer text-left hover:shadow-md"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
              <Icon size={22} className="text-orange-500" strokeWidth={1.8} />
            </div>
            <span className="font-heading font-semibold text-base text-zinc-900">{title}</span>
            <span className="text-sm text-zinc-400 font-medium">{desc}</span>
          </motion.button>
        ))}
      </div>

      {fileError && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-500 font-medium"
        >
          {fileError}
        </motion.span>
      )}
    </div>
  );
}
