import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WidgetWindow } from "./components/widget/WidgetWindow";
import { PanelWindow } from "./components/panel/PanelWindow";
import { AIChatWindow } from "./components/aichat/AIChatWindow";
import { useBlocksStore } from "./store/useBlocksStore";
import { useSettingsStore } from "./store/useSettingsStore";

function getWindowLabel(): string {
  // Try Tauri API first
  try {
    return getCurrentWindow().label;
  } catch {
    // ignore
  }
  // Fallback: check URL params
  const params = new URLSearchParams(window.location.search);
  return params.get("window") || "widget";
}

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);
  const fetchBlocks = useBlocksStore((s) => s.fetchBlocks);
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => {
    const label = getWindowLabel();
    console.log("Window label:", label);
    setWindowLabel(label);

    fetchBlocks();
    fetchSettings();
  }, []);

  if (!windowLabel) {
    return <div className="h-screen flex items-center justify-center bg-slate-900 text-slate-400 text-sm">Loading...</div>;
  }

  switch (windowLabel) {
    case "panel":
      return <PanelWindow />;
    case "aichat":
      return <AIChatWindow />;
    default:
      return <WidgetWindow />;
  }
}

export default App;
