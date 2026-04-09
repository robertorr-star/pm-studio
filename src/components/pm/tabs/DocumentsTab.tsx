import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Job, JobData } from "@/lib/types";
import { Btn, Label } from "../UIComponents";
import { toast } from "sonner";

interface JobDocument {
  id: string;
  created_at: string;
  job_id: string;
  storage_path: string;
  public_url: string | null;
  file_name: string;
  file_size_bytes: number | null;
  category: string;
  uploaded_by: string | null;
  notes: string | null;
}

const CATEGORIES = [
  { value: "contract", label: "Contract Documents" },
  { value: "plans", label: "Plans & Permits" },
  { value: "sub_contracts", label: "Sub Contracts / Scopes" },
  { value: "lien_releases", label: "Lien Releases" },
  { value: "inspections", label: "Inspection Reports" },
  { value: "photos_docs", label: "Site Documentation" },
  { value: "other", label: "Other" },
];

const FILE_ICONS: Record<string, string> = {
  pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊",
  jpg: "🖼", jpeg: "🖼", png: "🖼", heic: "🖼", gif: "🖼",
  zip: "📦", dwg: "📐", dxf: "📐", default: "📁",
};

function getIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "default";
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function fmtBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const DocumentsTab = ({ job, data }: { job: Job; data: JobData }) => {
  const [docs, setDocs] = useState<JobDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [category, setCategory] = useState("contract");
  const [uploadedBy, setUploadedBy] = useState("Sonny");
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadDocs = async () => {
    const { data: rows } = await supabase
      .from("job_documents")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: false });
    setDocs((rows || []) as JobDocument[]);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, [job.id]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const dateStr = new Date().toISOString().split("T")[0];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${job.id}/${category}/${dateStr}_${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("job-documents")
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }

      const { data: urlData } = supabase.storage.from("job-documents").getPublicUrl(storagePath);

      await supabase.from("job_documents").insert({
        job_id: job.id,
        job_name: job.name,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        category,
        uploaded_by: uploadedBy,
        notes: notes || null,
      } as any);
    }
    await loadDocs();
    setUploading(false);
    setNotes("");
    if (fileRef.current) fileRef.current.value = "";
    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
  };

  const deleteDoc = async (doc: JobDocument) => {
    await supabase.storage.from("job-documents").remove([doc.storage_path]);
    await supabase.from("job_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    toast.success("Document removed");
  };

  const openDoc = (doc: JobDocument) => {
    if (doc.public_url) {
      window.open(doc.public_url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("No URL available for this document");
    }
  };

  // Group by category
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    docs: docs.filter(d => d.category === cat.value),
  })).filter(g => g.docs.length > 0);

  // Also include static references from JobData
  const staticItems: { cat: string; items: { icon: string; name: string; meta: string }[] }[] = [];
  if (data.lienReleases.length > 0) {
    staticItems.push({
      cat: "Lien Releases (from data)",
      items: data.lienReleases.map(l => ({
        icon: l.status === "received" ? "✅" : "⏳",
        name: `${l.sub_name} — ${l.release_type}`,
        meta: l.status === "received" ? "Received" : "PENDING",
      })),
    });
  }

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div className="animate-fade-up">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-cream">{docs.length}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Total Files</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-cream">
            {[...new Set(docs.map(d => d.category))].length}
          </div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Categories</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-gold">
            {docs.filter(d => d.category === "contract").length}
          </div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Contracts</div>
        </div>
      </div>

      {/* Upload toggle */}
      <div className="flex items-center justify-between mb-3">
        <Label>Job Documents</Label>
        <Btn variant="green" size="sm" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? "CANCEL" : "📎 UPLOAD DOCUMENT"}
        </Btn>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3 max-md:grid-cols-1">
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Uploaded By</label>
              <select value={uploadedBy} onChange={e => setUploadedBy(e.target.value)}
                className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40">
                {["Sonny", "Leo", "Andy", "Alberto", "Sigfried"].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="col-span-2 max-md:col-span-1">
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Signed original, Rev 2, City-stamped..."
                className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" multiple onChange={e => handleUpload(e.target.files)} className="hidden" />
            <Btn variant="green" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "UPLOADING..." : "SELECT FILES"}
            </Btn>
            <span className="text-[10px] text-mil-muted">PDF, images, Word, Excel, DWG — multiple files OK.</span>
          </div>
        </div>
      )}

      {/* Grouped document list */}
      {grouped.length === 0 && staticItems.length === 0 && (
        <div className="text-mil-muted text-xs p-4 text-center">No documents uploaded yet. Tap UPLOAD DOCUMENT to start.</div>
      )}

      {grouped.map(g => (
        <div key={g.value} className="mb-5">
          <div className="font-raj text-[10px] tracking-[2px] text-mil-muted uppercase mb-2">{g.label}</div>
          <div className="space-y-1">
            {g.docs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2 bg-[rgba(0,0,0,0.15)] hover:bg-[rgba(255,255,255,0.02)] group">
                <div className="text-xl flex-shrink-0">{getIcon(doc.file_name)}</div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openDoc(doc)}>
                  <div className="text-xs text-cream truncate hover:text-gold transition-colors">{doc.file_name}</div>
                  <div className="text-[10px] text-mil-muted">
                    {fmtBytes(doc.file_size_bytes)}
                    {doc.uploaded_by && <span className="ml-2">· {doc.uploaded_by}</span>}
                    {doc.notes && <span className="ml-2">· {doc.notes}</span>}
                    <span className="ml-2">· {doc.created_at.split("T")[0]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openDoc(doc)}
                    className="text-[9px] font-raj text-gold border border-gold/20 px-2 py-0.5 cursor-pointer bg-transparent hover:bg-[rgba(201,168,76,0.1)]">
                    OPEN
                  </button>
                  <button onClick={() => deleteDoc(doc)}
                    className="text-[9px] font-raj text-danger border border-danger/20 px-2 py-0.5 cursor-pointer bg-transparent hover:bg-[rgba(196,56,40,0.1)]">
                    DEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Static lien release references from JobData */}
      {staticItems.map(s => (
        <div key={s.cat} className="mb-5">
          <div className="font-raj text-[10px] tracking-[2px] text-mil-muted uppercase mb-2">{s.cat}</div>
          <div className="grid grid-cols-3 gap-2 max-md:grid-cols-2">
            {s.items.map((d, i) => (
              <div key={i} className="flex items-center gap-[10px] p-3 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] cursor-pointer hover:border-gold/20 transition-all">
                <div className="text-xl flex-shrink-0">{d.icon}</div>
                <div>
                  <div className="text-xs font-medium">{d.name}</div>
                  <div className="text-[10px] text-mil-muted mt-[2px]">{d.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DocumentsTab;
