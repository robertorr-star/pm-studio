export const Pill = ({ variant, children }: { variant: string; children: React.ReactNode }) => {
  const styles: Record<string, string> = {
    complete: "bg-[rgba(106,170,72,0.1)] text-ok border border-[rgba(106,170,72,0.2)]",
    active: "bg-[rgba(190,180,154,0.1)] text-gold border border-[rgba(190,180,154,0.2)] animate-blink",
    pending: "bg-[rgba(122,140,104,0.1)] text-mil-muted border border-[rgba(122,140,104,0.15)]",
    blocked: "bg-[rgba(196,56,40,0.1)] text-danger border border-[rgba(196,56,40,0.2)]",
    ordered: "bg-[rgba(74,138,170,0.1)] text-info border border-[rgba(74,138,170,0.2)]",
    overdue: "bg-[rgba(196,56,40,0.12)] text-danger border border-[rgba(196,56,40,0.3)] animate-blink",
    pass: "bg-[rgba(106,170,72,0.1)] text-ok border border-[rgba(106,170,72,0.2)]",
    fail: "bg-[rgba(196,56,40,0.1)] text-danger border border-[rgba(196,56,40,0.2)]",
    warn: "bg-[rgba(212,144,48,0.1)] text-warn border border-[rgba(212,144,48,0.2)]",
    celeb: "bg-[rgba(212,170,42,0.1)] text-celeb border border-[rgba(212,170,42,0.2)]",
    info: "bg-[rgba(74,138,170,0.1)] text-info border border-[rgba(74,138,170,0.2)]",
    gold: "bg-[rgba(201,168,76,0.12)] text-gold border border-[rgba(201,168,76,0.25)]",
    teal: "bg-[rgba(56,178,172,0.1)] text-[#38b2ac] border border-[rgba(56,178,172,0.2)]",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-[9px] py-[3px] font-raj text-[9px] font-bold tracking-[1px] uppercase ${styles[variant] || styles.pending}`}>
      {children}
    </span>
  );
};

export const Btn = ({ variant = "gold", size = "default", children, onClick, disabled, className = "" }: {
  variant?: "gold" | "ghost" | "green" | "red";
  size?: "default" | "sm";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  const styles: Record<string, string> = {
    gold: "bg-gold text-[#1A1208] hover:bg-gold-light",
    ghost: "bg-transparent border border-gold/20 text-mil-muted hover:text-cream hover:border-gold",
    green: "bg-[rgba(106,170,72,0.15)] border border-[rgba(106,170,72,0.3)] text-ok hover:bg-[rgba(106,170,72,0.25)]",
    red: "bg-[rgba(196,56,40,0.15)] border border-[rgba(196,56,40,0.3)] text-danger hover:bg-[rgba(196,56,40,0.25)]",
  };
  const sizes: Record<string, string> = {
    default: "px-4 py-[10px] text-xs min-h-[44px]",
    sm: "px-3 py-[8px] text-[10px] min-h-[44px]",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-[6px] cursor-pointer font-raj font-bold tracking-[1px] transition-all border-none ${styles[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};

export const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] p-4 mb-[14px] ${className}`}>
    {children}
  </div>
);

export const SectionHeader = ({ label, children }: { label: string; children?: React.ReactNode }) => (
  <div className="flex items-center justify-between mb-[14px]">
    <div className="font-raj text-[11px] tracking-[3px] text-mil-muted uppercase">
      <span className="text-gold mr-2">//</span> {label}
    </div>
    {children}
  </div>
);

export const FormInput = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
  <input
    {...props}
    className={`bg-[rgba(0,0,0,0.35)] border border-[rgba(190,180,154,0.1)] text-cream px-3 py-3 font-dm text-sm outline-none w-full transition-colors focus:border-[rgba(190,180,154,0.35)] placeholder:text-mil-muted min-h-[44px] ${className}`}
  />
);

export const FormSelect = ({ children, className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) => (
  <select
    {...props}
    className={`bg-[rgba(0,0,0,0.35)] border border-[rgba(190,180,154,0.1)] text-cream px-3 py-3 font-dm text-sm outline-none w-full transition-colors focus:border-[rgba(190,180,154,0.35)] min-h-[44px] ${className}`}
  >
    {children}
  </select>
);

export const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase">{children}</span>
);

export const StatCard = ({ label, value, color = "text-gold" }: { label: string; value: string | number; color?: string }) => (
  <div className="bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.05)] p-[14px]">
    <Label>{label}</Label>
    <div className={`font-mono text-xl font-bold leading-none mt-[6px] ${color}`}>{value}</div>
  </div>
);

export const BudgetMeter = ({ pct }: { pct: number | null }) => {
  const budgetFill = pct ? Math.min(pct, 100) : 0;
  const overAmt = pct ? Math.max(0, pct - 100) : 0;
  const overFill = Math.min(overAmt / 50 * 100, 100);
  const col = !pct || pct <= 90 ? "var(--ok)" : pct <= 100 ? "var(--warn)" : "var(--danger)";

  return (
    <>
      <div className="flex h-[14px] gap-[2px] relative">
        <div className="flex-[3] relative bg-[rgba(0,0,0,0.35)] border border-[rgba(255,255,255,0.07)] border-r-2 border-r-[rgba(255,255,255,0.22)] overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 transition-all duration-[900ms]" style={{ width: `${budgetFill}%`, background: col }} />
          <div className="absolute -top-[15px] right-[-1px] font-mono text-[8px] text-[rgba(255,255,255,0.3)] translate-x-1/2 whitespace-nowrap">EST</div>
        </div>
        <div className="flex-1 relative bg-[rgba(231,76,60,0.06)] border border-[rgba(231,76,60,0.12)] overflow-hidden">
          <div className="absolute top-0 bottom-0 left-0 bg-danger transition-all duration-[900ms] opacity-85" style={{ width: `${overFill}%` }} />
          {overAmt > 0 && <div className="absolute -top-[15px] left-[2px] font-mono text-[8px] text-danger whitespace-nowrap font-bold">+{Math.round(overAmt)}% OVER</div>}
        </div>
      </div>
      <div className="flex mt-[3px]">
        <div className="flex-[3] flex justify-between px-[2px]">
          <span className="font-mono text-[8px] text-[rgba(136,153,170,0.5)]">0%</span>
          <span className="font-mono text-[8px] text-[rgba(136,153,170,0.5)]">50%</span>
          <span className="font-mono text-[8px] text-[rgba(255,255,255,0.3)]">100%</span>
        </div>
        <div className="flex-1 pl-1">
          <span className="font-mono text-[8px] text-[rgba(231,76,60,0.4)]">150%+</span>
        </div>
      </div>
    </>
  );
};
