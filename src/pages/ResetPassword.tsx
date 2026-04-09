import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setReady(true);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — redirecting to dashboard");
      setTimeout(() => navigate("/"), 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full mt-1 px-3 py-2 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.08)] text-cream text-xs font-mono focus:border-gold/40 focus:outline-none";
  const btnClass = "w-full py-2 bg-[rgba(201,168,76,0.15)] border border-gold/30 text-gold text-xs font-raj font-bold tracking-[2px] hover:bg-[rgba(201,168,76,0.25)] transition-all disabled:opacity-50 cursor-pointer";

  return (
    <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-gold/20 bg-[rgba(0,0,0,0.3)] p-6">
        <div className="text-center mb-6">
          <div className="font-raj text-xl font-bold text-gold tracking-[2px]">OCD PM STUDIO</div>
          <div className="text-[10px] text-mil-muted tracking-[2px] mt-1">SET NEW PASSWORD</div>
        </div>
        {ready ? (
          <form onSubmit={handleReset} className="space-y-3">
            <div>
              <label className="text-[10px] text-mil-muted tracking-[1px] font-raj">NEW PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" autoFocus />
            </div>
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin mx-auto mb-3" />
            <div className="text-[10px] text-mil-muted tracking-[1px]">VERIFYING RESET TOKEN...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
