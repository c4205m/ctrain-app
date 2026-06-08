import { useRef, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Bug, Package, Timer, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";

type LinkItem = { type: "link"; to: string; label: string; Icon: LucideIcon };
type ActionItem = { type: "action"; label: string; Icon: LucideIcon; onPress: () => void; isActive?: boolean };
type MenuItem = LinkItem | ActionItem;

const SIZE = 44;
const PAD = 16;

function getArcCenter(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const nx = (rect.left + rect.width / 2) / window.innerWidth;
  const ny = (rect.top + rect.height / 2) / window.innerHeight;
  if (nx > 0.5 && ny > 0.5) return 225;
  if (nx <= 0.5 && ny > 0.5) return 315;
  if (nx > 0.5 && ny <= 0.5) return 135;
  return 45;
}

function itemOffset(arcCenter: number, index: number, total: number, radius = 80) {
  const spread = (total - 1) * 45;
  const startAngle = arcCenter - spread / 2;
  const angleRad = (startAngle + index * 45) * (Math.PI / 180);
  return { dx: radius * Math.cos(angleRad), dy: radius * Math.sin(angleRad) };
}

export default function DebugFloatButton() {
  const NAV_ITEMS: MenuItem[] = [
    { type: "link", to: "/dev/components", label: "Design", Icon: Package },
    { type: "link", to: "/dev/stopwatch", label: "Stopwatch", Icon: Timer },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const [arcCenter, setArcCenter] = useState(225);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasDragging = useRef(false);
  const location = useLocation();

  const x = useMotionValue(window.innerWidth - SIZE - PAD);
  const y = useMotionValue(window.innerHeight - SIZE - 96);

  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [isOpen]);

  function handleDragEnd() {
    const targetX = x.get() < window.innerWidth / 2 ? PAD : window.innerWidth - SIZE - PAD;
    animate(x, targetX, { type: "spring", stiffness: 400, damping: 30 });
  }

  function handleTriggerClick() {
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    if (containerRef.current) setArcCenter(getArcCenter(containerRef.current));
    setIsOpen((o) => !o);
  }

  return (
    <motion.div
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={{
        left: PAD,
        right: window.innerWidth - SIZE - PAD,
        top: PAD,
        bottom: window.innerHeight - SIZE - PAD,
      }}
      style={{ x, y, position: "fixed", top: 0, left: 0, touchAction: "none" }}
      onDragStart={() => {
        wasDragging.current = true;
      }}
      onDragEnd={handleDragEnd}
      className="z-100 w-11 h-11"
    >
      <AnimatePresence>
        {isOpen &&
          NAV_ITEMS.map((item, i) => {
            const { dx, dy } = itemOffset(arcCenter, i, NAV_ITEMS.length);
            const isActive = item.type === "link"
              ? (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to))
              : (item.isActive ?? false);
            const sharedClass = "w-10 h-10 cursor-pointer rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center pointer-events-auto";
            const activeStyle = { outline: isActive ? "2px solid #f97316" : "none", outlineOffset: 2 };
            return (
              <motion.div
                key={item.label}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                animate={{ scale: 1, x: dx, y: dy, opacity: 1 }}
                exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28, delay: i * 0.05 }}
              >
                {item.type === "link" ? (
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => setIsOpen(false)}
                    title={item.label}
                    className={sharedClass}
                    style={activeStyle}
                  >
                    <item.Icon size={18} color={isActive ? "#f97316" : "#71717a"} />
                  </NavLink>
                ) : (
                  <button
                    onClick={() => { item.onPress(); setIsOpen(false); }}
                    title={item.label}
                    className={sharedClass}
                    style={activeStyle}
                  >
                    <item.Icon size={18} color="#71717a" />
                  </button>
                )}
              </motion.div>
            );
          })}
      </AnimatePresence>

      <button
        onClick={handleTriggerClick}
        className="absolute inset-0 w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center shadow-lg text-white cursor-grab"
      >
        <Bug size={20} />
      </button>
    </motion.div>
  );
}
