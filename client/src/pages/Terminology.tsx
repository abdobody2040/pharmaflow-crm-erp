import { useState } from "react";
import { Archive, Languages, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AccessDenied } from "./Tenants";

const editors = ["admin", "manager"];
export default function TerminologyPage() {
  const { user } = useAuth(); const utils = trpc.useUtils();
  const [form, setForm] = useState({ termKey: "", englishTerm: "", arabicTerm: "", context: "" });
  const terms = trpc.terminology.list.useQuery(undefined, { enabled: Boolean(user) });
  const save = trpc.terminology.save.useMutation({ onSuccess: async () => { toast.success("Terminology saved for this tenant."); setForm({ termKey: "", englishTerm: "", arabicTerm: "", context: "" }); await utils.terminology.list.invalidate(); }, onError: error => toast.error(error.message) });
  const archive = trpc.terminology.archive.useMutation({ onSuccess: () => { toast.success("Terminology entry archived."); utils.terminology.list.invalidate(); }, onError: error => toast.error(error.message) });
  if (!user || !editors.includes(user.role)) return <AccessDenied />;
  const submit = (event: React.FormEvent) => { event.preventDefault(); save.mutate({ termKey: form.termKey, englishTerm: form.englishTerm, arabicTerm: form.arabicTerm, ...(form.context ? { context: form.context } : {}) }); };
  return <div className="space-y-6"><section className="rounded-3xl bg-[#10203d] p-7 text-white"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#63e1ba]">Tenant language governance</p><h2 className="mt-2 text-3xl font-bold">Specialized terminology</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Maintain approved English and Arabic terms for this tenant’s field, clinical, commercial, and compliance vocabulary. Each change is tenant-scoped and audited.</p></div><Languages className="h-9 w-9 text-[#63e1ba]" /></div></section>
    <Card><CardContent className="p-6"><div className="flex items-center gap-2"><Plus className="h-5 w-5 text-[#147d66]" /><h3 className="font-bold">Add or update a term</h3></div><form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={submit}><Input required placeholder="Stable key, e.g. hcp" value={form.termKey} onChange={event => setForm({ ...form, termKey: event.target.value.toLowerCase().replace(/\s+/g, "-") })} /><Input required placeholder="English term" value={form.englishTerm} onChange={event => setForm({ ...form, englishTerm: event.target.value })} /><Input required dir="rtl" placeholder="المصطلح العربي" value={form.arabicTerm} onChange={event => setForm({ ...form, arabicTerm: event.target.value })} /><Input placeholder="Context (optional)" value={form.context} onChange={event => setForm({ ...form, context: event.target.value })} /><Textarea className="md:col-span-2" readOnly value="Saving an existing key updates its active tenant-specific translation. Deactivation is an audited archive action, not a hard delete." /><Button className="md:col-span-2" disabled={save.isPending}><Save className="mr-2 h-4 w-4" />{save.isPending ? "Saving terminology…" : "Save terminology"}</Button></form></CardContent></Card>
    <Card><CardContent className="p-6"><h3 className="font-bold">Active tenant terms</h3>{terms.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading terminology…</p> : terms.data?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-2">Key</th><th className="p-2">English</th><th className="p-2">العربية</th><th className="p-2">Context</th><th className="p-2" /></tr></thead><tbody>{terms.data.map(term => <tr key={term.id} className="border-t border-slate-100"><td className="p-2 font-mono text-xs">{term.termKey}</td><td className="p-2">{term.englishTerm}</td><td className="p-2" dir="rtl">{term.arabicTerm}</td><td className="p-2 text-slate-500">{term.context ?? "—"}</td><td className="p-2 text-right"><Button size="sm" variant="outline" disabled={archive.isPending} onClick={() => archive.mutate({ id: term.id })}><Archive className="mr-1 h-3.5 w-3.5" />Archive</Button></td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No specialized terms have been configured for this tenant.</p>}</CardContent></Card>
  </div>;
}
