interface MetricData {
  label: string;
  value: string | number;
  sub: string;
  cls: string;
  bar: number;
  barColor: string;
}

const MetricsStrip = ({ metrics }: { metrics: MetricData[] }) => (
  <div className="grid grid-cols-5 gap-[10px] mb-[14px] max-lg:grid-cols-3 max-md:grid-cols-2">
    {metrics.map((m, i) => {
      const borderColors: Record<string, string> = {
        "m-gold": "var(--gold)",
        "m-green": "var(--ok)",
        "m-amber": "var(--warn)",
        "m-red": "var(--danger)",
        "m-blue": "var(--info)",
      };
      const borderColor = borderColors[m.cls] || "var(--gold)";
      return (
        <div
          key={i}
          className="bg-[var(--panel)] border border-[rgba(190,180,154,0.1)] p-[14px_16px] relative overflow-hidden"
          style={{ borderTop: `3px solid ${borderColor}` }}
        >
          <div className="absolute top-0 left-0 right-0 h-9 bg-gradient-to-b from-[rgba(59,82,64,0.3)] to-transparent pointer-events-none" />
          <div className="font-raj text-[9px] tracking-[2px] uppercase text-mil-muted mb-[6px] relative z-10">{m.label}</div>
          <div className="font-mono text-[26px] font-bold leading-none relative z-10" style={{ color: borderColor }}>{m.value}</div>
          <div className="text-[10px] text-mil-muted mt-[5px] leading-[1.4] relative z-10">{m.sub}</div>
          <div className="h-[2px] bg-[rgba(255,255,255,0.06)] mt-[10px] overflow-hidden relative z-10">
            <div className="h-full transition-all duration-[800ms]" style={{ width: `${m.bar}%`, background: m.barColor }} />
          </div>
        </div>
      );
    })}
  </div>
);

export default MetricsStrip;
export type { MetricData };
