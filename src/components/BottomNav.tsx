import { NavLink, useLocation } from "react-router-dom";
import { Home, SlidersHorizontal, List, Shuffle, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFilterStore } from "../store/filterStore";

const NAV_ITEMS = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/filter", label: "Filter", Icon: SlidersHorizontal },
  { to: "/list", label: "List", Icon: List },
  { to: "/random", label: "Random", Icon: Shuffle },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export default function BottomNav() {
  const activeCount = useFilterStore(s => s.activeCount());
  const location = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/60 backdrop-blur-sm
        border-b-2 border-zinc-200/80 rounded-full shadow-lg flex items-center justify-around px-2"
    >
      {NAV_ITEMS.map(({ to, label, Icon }) => {
        const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

        return (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex flex-col items-center gap-0.5 px-3 py-2 justify-center relative"
          >
            <motion.div
              animate={{ y: isActive ? -2 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex flex-col items-center w-10 shrink-0"
            >
              <motion.div
                animate={{ color: isActive ? "#f97316" : "#a1a1aa" }}
                transition={{ duration: 0.15 }}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>

              <motion.span
                animate={{ color: isActive ? "#f97316" : "#a1a1aa" }}
                transition={{ duration: 0.15 }}
                className="text-[11px]"
              >
                {label}
              </motion.span>
            </motion.div>

            <AnimatePresence>
              {label === "Filter" && activeCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  data-testid="filter-badge"
                  className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] 
                    font-semibold rounded-full flex items-center justify-center px-1"
                >
                  {activeCount}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        );
      })}
    </nav>
  );
}
