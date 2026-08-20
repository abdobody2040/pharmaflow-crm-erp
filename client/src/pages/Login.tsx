import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertCircle, LoaderCircle, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const { t, toggleLanguage, tr, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const login = trpc.auth.localLogin.useMutation({
    onSuccess: async result => {
      sessionStorage.setItem("pharmaflow-local-token", result.token);
      utils.auth.me.setData(undefined, result.user);
      await utils.auth.me.invalidate();
      toast.success(tr("Secure session established."));
    },
    onError: error => {
      const friendly = error.data?.code === "UNAUTHORIZED" ? (language === "ar" ? "تعذر التحقق من البريد الإلكتروني أو كلمة المرور أو معرّف العميل. راجع البيانات ثم حاول مرة أخرى." : "We could not verify your email, password, or tenant identifier. Check the details and try again.") : (language === "ar" ? "تعذر إنشاء جلسة آمنة حالياً. أعد المحاولة، أو تواصل مع مسؤول المنصة إذا استمرت المشكلة." : "We could not create a secure session right now. Try again, or contact your platform administrator if the issue continues.");
      setAuthError(friendly); toast.error(friendly);
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    login.mutate({ email, password, ...(tenantSlug ? { tenantSlug } : {}) });
  };
  return <div className="grid min-h-screen bg-[#f3f6f8] lg:grid-cols-[1.15fr_.85fr]">
    <section className="hidden bg-[#0c162b] p-14 lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#50d8af]"><ShieldCheck className="h-6 w-6 text-[#0c162b]" /></div><div><p className="font-bold tracking-[0.15em] text-white">PHARMAFLOW</p><p className="text-xs text-slate-400">{tr("Compliance control plane")}</p></div></div>
      <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#50d8af]">{tr("Self-hosted by design")}</p><h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-[-0.045em] text-white">{tr("Trusted operations, engineered for proof.")}</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-400">{tr("A tenant-isolated workspace for regulated field operations, immutable records, and deliberate access control.")}</p></div>
      <p className="text-xs text-slate-500">{tr("JWT sessions · Tenant scoping · Immutable compliance evidence")}</p>
    </section>
    <section className="flex items-center justify-center p-6 lg:p-12"><form onSubmit={submit} aria-busy={login.isPending} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(19,35,58,.10)] sm:p-9"><button type="button" onClick={toggleLanguage} className="mb-6 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">{t("language")}</button>
      <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#1e9274]">{tr("Secure access")}</p><h2 className="mt-2 text-2xl font-bold tracking-[-.03em] text-[#172033]">{tr("Welcome back")}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{tr("Sign in to your platform or tenant workspace.")}</p></div>
      {authError && <div role="alert" aria-live="assertive" className="mb-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{authError}</p></div>}
      <div className="space-y-5"><div className="space-y-2"><Label htmlFor="tenant">{tr("Tenant slug")} <span className="text-slate-400">{tr("(optional for platform)")}</span></Label><Input id="tenant" aria-invalid={Boolean(authError)} value={tenantSlug} onChange={event => { setTenantSlug(event.target.value); setAuthError(null); }} placeholder="northstar-pharma" /></div><div className="space-y-2"><Label htmlFor="email">{tr("Email address")}</Label><Input id="email" aria-invalid={Boolean(authError)} type="email" required value={email} onChange={event => { setEmail(event.target.value); setAuthError(null); }} placeholder="you@company.com" /></div><div className="space-y-2"><Label htmlFor="password">{tr("Password")}</Label><Input id="password" aria-invalid={Boolean(authError)} type="password" required value={password} onChange={event => { setPassword(event.target.value); setAuthError(null); }} placeholder="••••••••••••••" /></div></div>
      <Button className="mt-8 h-11 w-full bg-[#147d66] font-semibold hover:bg-[#0f6956]" disabled={login.isPending}>{login.isPending ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />{tr("Establishing secure session…")}</> : tr("Sign in securely")}</Button>
      <p className="mt-5 text-center text-xs leading-5 text-slate-400">{tr("This self-hosted environment never stores browser passwords. Tenant accounts are provisioned by your platform administrator.")}</p>
    </form></section>
  </div>;
}
