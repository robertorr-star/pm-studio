import { Label } from "../UIComponents";
import { toast } from "sonner";

const PhotosTab = () => {
  const sections = [
    { phase: "Framing", items: ["Rough frame", "Roof structure", "Shear walls"], filled: [0, 1] },
    { phase: "Drywall", items: ["Board install", "Mud coat", "Texture"], filled: [] },
  ];

  return (
    <div className="animate-fade-up">
      <Label>Required documentation per phase — tap to upload</Label>
      <div className="mt-[14px]">
        {sections.map((s) => (
          <div key={s.phase} className="mb-[18px]">
            <div className="font-raj text-[9px] tracking-[2px] text-mil-muted uppercase mb-2">{s.phase}</div>
            <div className="grid grid-cols-4 gap-[10px] max-md:grid-cols-2">
              {s.items.map((item, i) => {
                const filled = s.filled.includes(i);
                return (
                  <div
                    key={i}
                    onClick={() => toast.info(`Photo: ${item}`)}
                    className={`border p-3 text-center cursor-pointer transition-all bg-[rgba(0,0,0,0.2)] hover:border-gold/20 ${
                      filled ? "border-[rgba(106,170,72,0.3)] bg-[rgba(106,170,72,0.05)]" : i < 2 ? "border-[rgba(196,56,40,0.3)] bg-[rgba(196,56,40,0.04)]" : "border-[rgba(255,255,255,0.07)]"
                    }`}
                  >
                    <div className={`text-[22px] mb-[6px] ${filled ? "opacity-100" : "opacity-50"}`}>{filled ? "🖼️" : "📷"}</div>
                    <div className="text-[10px] text-mil-muted leading-[1.3]">
                      {item}
                      {!filled && i < 2 && <><br /><span className="text-danger text-[9px]">Required</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotosTab;
