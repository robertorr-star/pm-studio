interface AlertItem {
  text: string;
  jid: string;
}

interface AlertStripsProps {
  warns: AlertItem[];
  cautions: AlertItem[];
  wins: AlertItem[];
  onJobClick: (id: string) => void;
}

const AlertStrips = ({ warns, cautions, wins, onJobClick }: AlertStripsProps) => (
  <div className="space-y-[10px] mb-[10px]">
    {warns.length > 0 && (
      <div className="flex items-center gap-[10px] p-[8px_16px] bg-[rgba(196,56,40,0.07)] border border-[rgba(196,56,40,0.22)] border-l-4 border-l-danger flex-wrap">
        <div className="font-raj text-[10px] tracking-[2px] font-bold text-danger whitespace-nowrap">⚠ CRITICAL</div>
        {warns.map((w, i) => (
          <button key={i} onClick={() => onJobClick(w.jid)} className="text-[11px] px-[10px] py-[3px] bg-[rgba(196,56,40,0.12)] border border-[rgba(196,56,40,0.25)] text-cream cursor-pointer hover:brightness-[1.3] transition-all whitespace-nowrap">
            {w.text}
          </button>
        ))}
      </div>
    )}
    {cautions.length > 0 && (
      <div className="flex items-center gap-[10px] p-[8px_16px] bg-[rgba(212,144,48,0.07)] border border-[rgba(212,144,48,0.22)] border-l-4 border-l-warn flex-wrap">
        <div className="font-raj text-[10px] tracking-[2px] font-bold text-warn whitespace-nowrap">⚡ WATCH</div>
        {cautions.map((c, i) => (
          <button key={i} onClick={() => onJobClick(c.jid)} className="text-[11px] px-[10px] py-[3px] bg-[rgba(212,144,48,0.12)] border border-[rgba(212,144,48,0.25)] text-cream cursor-pointer hover:brightness-[1.3] transition-all whitespace-nowrap">
            {c.text}
          </button>
        ))}
      </div>
    )}
    {wins.length > 0 && (
      <div className="flex items-center gap-[10px] p-[8px_16px] bg-[rgba(212,170,42,0.06)] border border-[rgba(212,170,42,0.18)] border-l-4 border-l-celeb flex-wrap">
        <div className="font-raj text-[10px] tracking-[2px] font-bold text-celeb whitespace-nowrap">★ WINS</div>
        {wins.map((w, i) => (
          <button key={i} onClick={() => onJobClick(w.jid)} className="text-[11px] px-[10px] py-[3px] bg-[rgba(212,170,42,0.1)] border border-[rgba(212,170,42,0.2)] text-celeb cursor-pointer hover:brightness-[1.3] transition-all whitespace-nowrap">
            {w.text}
          </button>
        ))}
      </div>
    )}
  </div>
);

export default AlertStrips;
export type { AlertItem };
