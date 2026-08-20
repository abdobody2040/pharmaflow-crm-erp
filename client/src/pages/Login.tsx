import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const { t, toggleLanguage, tr } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.auth.localLogin.useMutation({
    onSuccess: async result => {
      sessionStorage.setItem("pharmaflow-local-token", result.token);
      utils.auth.me.setData(undefined, result.user);
      await utils.auth.me.invalidate();
      toast.success(tr("Secure session established."));
    },
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ email, password, ...(tenantSlug ? { tenantSlug } : {}) });
  };
  return <div className="grid min-h-screen bg-[#f3f6f8] lg:grid-cols-[1.15fr_.85fr]">
    <section className="hidden bg-[#0c162b] p-14 lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#50d8af]"><ShieldCheck className="h-6 w-6 text-[#0c162b]" /></div><div><p className="font-bold tracking-[0.15em] text-white">PHARMAFLOW</p><p className="text-xs text-slate-400">{tr("Compliance control plane")}</p></div></div>
      <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#50d8af]">{tr("Self-hosted by design")}</p><h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.045em] text-white">{tr("Trusted operations, engineered for proof.")}</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-400">{tr("A tenant-isolated workspace for regulated field operations, immutable records, and deliberate access control.")}</p></div>
      <p className="text-xs text-slate-500">{tr("JWT sessions · Tenant scoping · Immutable compliance evidence")}</p>
    </section>
    <section className="flex items-center justify-center p-6 lg:p-12"><form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(19,35,58,.10)] sm:p-9"><button type="button" onClick={toggleLanguage} className="mb-6 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">{t("language")}</button>
      <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#1e9274]">{tr("Secure access")}</p><h2 className="mt-2 text-2xl font-bold tracking-[-.03em] text-[#172033]">{tr("Welcome back")}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{tr("Sign in to your platform or tenant workspace.")}</p></div>
      <div className="space-y-5"><div className="space-y-2"><Label htmlFor="tenant">{tr("Tenant slug")} <span className="text-slate-400">{tr("(optional for platform)")}</span></Label><Input id="tenant" value={tenantSlug} onChange={event => setTenantSlug(event.target.value)} placeholder="northstar-pharma" /></div><div className="space-y-2"><Label htmlFor="email">{tr("Email address")}</Label><Input id="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" /></div><div className="space-y-2"><Label htmlFor="password">{tr("Password")}</Label><Input id="password" type="password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••••••••" /></div></div>
      <Button className="mt-8 h-11 w-full bg-[#147d66] font-semibold hover:bg-[#0f6956]" disabled={login.isPending}>{login.isPending ? tr("Establishing secure session…") : tr("Sign in securely")}</Button>
      <p className="mt-5 text-center text-xs leading-5 text-slate-400">{tr("This self-hosted environment never stores browser passwords. Tenant accounts are provisioned by your platform administrator.")}</p>
    </form></section>
  </div>;
}
