import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Filter from "./pages/Filter";
import List from "./pages/List";
import Random from "./pages/Random";
import DevComponents from "./pages/DevComponents";
import Stopwatch from "./pages/Stopwatch";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";
// import DebugFloatButton from "./components/DebugFloatButton";
import FloatTimerButton from "./components/FloatTimerButton";
import MobileGate from "./components/MobileGate";
import ProfileSetupModal from "./components/ProfileSetupModal";
import DesktopEditor from "./pages/editor/DesktopEditor";
import ShareReceiveModal from "./components/ShareReceiveModal";
import { useLocation } from "react-router-dom";

export default function App() {
  const isEditor = useLocation().pathname === "/editor";

  return (
    <>
    {isEditor ? (
      <Routes>
        <Route path="/editor" element={<DesktopEditor />} />
      </Routes>
    ) : (
      <>
        <MobileGate />
        <ProfileSetupModal />
        <ShareReceiveModal />
      </>
    )}
    <div className="h-full md:hidden">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/filter" element={<Filter />} />
        <Route path="/list" element={<List />} />
        <Route path="/random" element={<Random />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/dev/components" element={<DevComponents />} />
        <Route path="/dev/stopwatch" element={<Stopwatch />} />
      </Routes>
      <BottomNav />
      <FloatTimerButton />
      {/* <DebugFloatButton /> */}
    </div>
    </>
  );
}
