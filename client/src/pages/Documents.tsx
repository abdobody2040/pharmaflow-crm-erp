import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/locale";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  CheckCircle2,
  FileClock,
  FilePlus2,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const classifications = [
  "general",
  "quality",
  "hr",
  "commercial",
  "compliance",
] as const;
const dateInput = () =>
  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
type Form = {
  documentNumber: string;
  title: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  classification: (typeof classifications)[number];
  retentionDate: string;
};
const blank = (): Form => ({
  documentNumber: "",
  title: "",
  fileKey: "",
  fileName: "",
  mimeType: "application/pdf",
  classification: "general",
  retentionDate: dateInput(),
});

export default function DocumentsPage() {
  const { user } = useAuth();
  const canEdit = ["admin", "manager", "hr"].includes(user?.role ?? "");
  const docs = trpc.documents.list.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<Form>(blank);
  const [versionOf, setVersionOf] = useState<{
    id: string;
    documentNumber: string;
    nextVersion: number;
  } | null>(null);
  const refresh = () => utils.documents.list.invalidate();
  const register = trpc.documents.register.useMutation({
    onSuccess: () => {
      setForm(blank());
      refresh();
    },
  });
  const createVersion = trpc.documents.createVersion.useMutation({
    onSuccess: () => {
      setForm(blank());
      setVersionOf(null);
      refresh();
    },
  });
  const activate = trpc.documents.activate.useMutation({ onSuccess: refresh });
  const archive = trpc.documents.archive.useMutation({ onSuccess: refresh });
  const submit = () => {
    const payload = {
      ...form,
      retentionDate: new Date(`${form.retentionDate}T00:00:00Z`),
    };
    if (versionOf)
      createVersion.mutate({ ...payload, previousVersionId: versionOf.id });
    else register.mutate(payload);
  };
  const valid =
    form.title.trim().length >= 2 &&
    form.fileKey.trim().length >= 3 &&
    form.fileName.trim().length >= 1 &&
    (!versionOf ? form.documentNumber.trim().length >= 2 : true);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#178066]">
            Governed records
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#172033]">
            Document register
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            A tenant-owned register for operational documents, independent of
            presentation content. Each replacement becomes a new version while
            older evidence remains retained.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Retention tracked
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Registered versions
              </p>
              <p className="mt-1 text-2xl font-bold">
                {docs.data?.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Active records
              </p>
              <p className="mt-1 text-2xl font-bold">
                {docs.data?.filter(item => item.status === "active").length ??
                  0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Historical versions
              </p>
              <p className="mt-1 text-2xl font-bold">
                {docs.data?.filter(item => item.status === "superseded")
                  .length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FilePlus2 className="h-5 w-5 text-emerald-600" />
              {versionOf
                ? `Register version ${versionOf.nextVersion} for ${versionOf.documentNumber}`
                : "Register a document"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {!versionOf && (
              <div className="space-y-1.5">
                <Label>Document number</Label>
                <Input
                  placeholder="QMS-001"
                  value={form.documentNumber}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      documentNumber: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="Policy or procedure title"
                value={form.title}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Storage key</Label>
              <Input
                placeholder="tenant/docs/file.pdf"
                value={form.fileKey}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    fileKey: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>File name</Label>
              <Input
                placeholder="policy.pdf"
                value={form.fileName}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    fileName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>MIME type</Label>
              <Input
                value={form.mimeType}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    mimeType: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Classification</Label>
              <Select
                value={form.classification}
                onValueChange={classification =>
                  setForm(current => ({
                    ...current,
                    classification: classification as Form["classification"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classifications.map(value => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Retention date</Label>
              <Input
                type="date"
                value={form.retentionDate}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    retentionDate: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                className="flex-1"
                disabled={
                  !valid || register.isPending || createVersion.isPending
                }
                onClick={submit}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                {versionOf ? "Create version" : "Register"}
              </Button>
              {versionOf && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setVersionOf(null);
                    setForm(blank());
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileClock className="h-5 w-5 text-emerald-600" />
            Versioned document evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-3">Document</th>
                <th className="pb-3">Version</th>
                <th className="pb-3">Classification</th>
                <th className="pb-3">Retention</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(docs.data ?? []).map(item => (
                <tr className="border-b last:border-0" key={item.id}>
                  <td className="py-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.documentNumber} · {item.fileName}
                    </p>
                  </td>
                  <td className="py-4">
                    v{item.version}
                    {item.previousVersionId && (
                      <span className="ml-2 text-xs text-slate-400">
                        versioned
                      </span>
                    )}
                  </td>
                  <td className="py-4 capitalize">{item.classification}</td>
                  <td className="py-4 text-slate-500">
                    {formatDate(item.retentionDate)}
                  </td>
                  <td className="py-4">
                    <Badge
                      variant={
                        item.status === "active"
                          ? "secondary"
                          : item.status === "archived"
                            ? "outline"
                            : "default"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      {canEdit && item.status !== "archived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVersionOf({
                              id: item.id,
                              documentNumber: item.documentNumber,
                              nextVersion: item.version + 1,
                            });
                            setForm(current => ({
                              ...current,
                              documentNumber: item.documentNumber,
                              title: item.title,
                              classification: item.classification,
                              retentionDate: new Date(item.retentionDate)
                                .toISOString()
                                .slice(0, 10),
                            }));
                          }}
                        >
                          New version
                        </Button>
                      )}
                      {canEdit &&
                        item.status !== "active" &&
                        item.status !== "archived" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              activate.mutate({
                                id: item.id,
                                reason: "Approved version activated",
                              })
                            }
                          >
                            Activate
                          </Button>
                        )}
                      {canEdit && item.status !== "archived" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            archive.mutate({
                              id: item.id,
                              reason: "Record archived by document controller",
                            })
                          }
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!docs.data?.length && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No managed documents are registered for this tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
