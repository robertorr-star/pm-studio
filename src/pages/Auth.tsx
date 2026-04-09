import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type View = "login" | "signup" | "forgot";

const Auth = () => {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === "forgot") {
        if (!email) { toast.error("Email required"); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent — check your email");
        setView("login");
      } else if (view === "login") {
        if (!email || !password) { toast.error("Email and password required"); return; }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        if (!email || !password) { toast.error("Email and password required"); return; }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full mt-1 px-3 py-2 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.08)] text-cream text-xs font-mono focus:border-gold/40 focus:outline-none";
  const btnClass = "w-full py-2 bg-[rgba(201,168,76,0.15)] border border-gold/30 text-gold text-xs font-raj font-bold tracking-[2px] hover:bg-[rgba(201,168,76,0.25)] transition-all disabled:opacity-50 cursor-pointer";
  const linkClass = "w-full mt-3 text-[10px] text-mil-muted hover:text-cream transition-colors bg-transparent border-none cursor-pointer";

  return (
    <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-gold/20 bg-[rgba(0,0,0,0.3)] p-6">
        <div className="text-center mb-6">
          <div className="font-raj text-xl font-bold text-gold tracking-[2px]">OCD PM STUDIO</div>
          <div className="text-[10px] text-mil-muted tracking-[2px] mt-1">
            {view === "forgot" ? "PASSWORD RECOVERY" : "SECURE ACCESS REQUIRED"}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-mil-muted tracking-[1px] font-raj">EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" />
          </div>
          {view !== "forgot" && (
            <div>
              <label className="text-[10px] text-mil-muted tracking-[1px] font-raj">PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
          )}
          <button type="submit" disabled={loading} className={btnClass}>
            {loading ? "PROCESSING..." : view === "login" ? "SIGN IN" : view === "signup" ? "CREATE ACCOUNT" : "SEND RESET LINK"}
          </button>
        </form>
        {view === "login" && (
          <>
            <button onClick={() => setView("forgot")} className={linkClass}>Forgot your password?</button>
            <button onClick={() => setView("signup")} className={linkClass}>Need an account? Sign up</button>
          </>
        )}
        {view === "signup" && (
          <button onClick={() => setView("login")} className={linkClass}>Already have an account? Sign in</button>
        )}
        {view === "forgot" && (
          <button onClick={() => setView("login")} className={linkClass}>Back to sign in</button>
        )}
      </div>
    </div>
  );
};

export default Auth;
