import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import OCDLogo from "./OCDLogo";

interface HeaderProps {
  activeView: string;
  onViewChange: (view: string) => void;
  taskBadge: number;
}

const Header = ({ activeView, onViewChange, taskBadge }: HeaderProps) => {
  const [clock, setClock] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString("en-US", { hour12: false }));
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, []);

  const navItems = [
    { id: "dashboard", label: "DASHBOARD" },
    { id: "tasks-global", label: "TASKS", badge: taskBadge },
    { id: "materials-global", label: "MATERIALS" },
    { id: "manhours-global", label: "MAN HRS" },
    { id: "inspections-global", label: "INSPECTIONS" },
    { id: "weekly-schedule", label: "WEEKLY SCHEDULE" },
    { id: "scorecard", label: "SCORECARD" },
    { id: "calendar-global", label: "OCD CALENDAR" },
    { id: "settings", label: "SETTINGS" },
  ];

  return (
    <div className="sticky top-0 z-[200] min-h-[64px] bg-[rgba(13,27,42,0.97)] border-b border-gold/20 backdrop-blur-[20px] px-6 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex-wrap" style={{ borderTop: "3px solid var(--gold)" }}>
      <div className="flex items-center gap-4">
        <OCDLogo />
        <div className="flex flex-col gap-[1px]">
          <div className="font-raj text-[17px] font-bold tracking-[3px] text-gold leading-tight uppercase">
            ORR CONSTRUCTION <span className="text-cream">& DEVELOPMENT</span>
          </div>
          <div className="font-raj text-[9px] tracking-[3.5px] text-[rgba(190,180,154,0.65)] uppercase max-sm:hidden">
            Project Management Command Center — CSLB #1028720
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 pl-4 ml-2 border-l border-[rgba(190,180,154,0.25)]">
          <span className="font-mono text-[8px] tracking-[1.5px] text-gold bg-[rgba(190,180,154,0.1)] border border-[rgba(190,180,154,0.25)] px-2 py-[3px]">* DVBE</span>
          <span className="font-mono text-[8px] tracking-[1.5px] text-gold bg-[rgba(190,180,154,0.1)] border border-[rgba(190,180,154,0.25)] px-2 py-[3px]">SDVOSB</span>
          <span className="font-mono text-[8px] tracking-[1.5px] text-gold bg-[rgba(190,180,154,0.1)] border border-[rgba(190,180,154,0.25)] px-2 py-[3px]">184 INF . IRAQ x2</span>
        </div>
      </div>

      {/* Desktop nav */}
      <nav className="hidden lg:flex gap-[2px]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`px-[14px] py-[5px] font-raj text-[11px] font-semibold tracking-[1.5px] uppercase border-b-2 transition-all cursor-pointer bg-transparent ${
              activeView === item.id
                ? "text-gold border-gold"
                : "text-[rgba(190,180,154,0.6)] border-transparent hover:text-gold"
            }`}
          >
            {item.label}
            {item.badge && item.badge > 0 ? (
              <span className="ml-1 bg-danger text-white font-raj text-[10px] font-bold px-[5px] py-[1px] min-w-[18px] text-center animate-blink">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Mobile hamburger */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="bg-transparent border border-gold/20 text-gold px-3 py-2 cursor-pointer font-raj text-sm tracking-[1px] min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-[14px]">
        <div className="w-[7px] h-[7px] rounded-full bg-ok animate-blink shadow-[0_0_8px_var(--ok)]" />
        <div className="font-mono text-xs text-[rgba(190,180,154,0.6)]">{clock}</div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="ml-2 px-3 py-1 font-raj text-[10px] font-bold tracking-[1.5px] text-mil-muted hover:text-gold border border-[rgba(255,255,255,0.08)] hover:border-gold/30 bg-transparent cursor-pointer transition-all"
        >
          SIGN OUT
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <div className="w-full lg:hidden border-t border-gold/10 py-2 flex flex-wrap gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onViewChange(item.id); setMenuOpen(false); }}
              className={`px-3 py-3 font-raj text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer bg-transparent transition-all min-h-[44px] ${
                activeView === item.id ? "text-gold" : "text-[rgba(190,180,154,0.6)]"
              }`}
            >
              {item.label}
              {item.badge && item.badge > 0 ? (
                <span className="ml-1 bg-danger text-white font-raj text-[10px] font-bold px-[5px] py-[1px]">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-3 font-raj text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer bg-transparent text-red-400 hover:text-red-300 transition-all min-h-[44px]"
          >
            SIGN OUT
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
