import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Label } from "../UIComponents";
import { toast } from "sonner";

interface JobPhoto {
  id: string;
  created_at: string;
  job_id: string;
  storage_path: string;
  public_url: string | null;
  file_name: string | null;
  phase_name: string | null;
  photo_type: string | null;
  caption: string | null;
  uploaded_by: string | null;
  taken_date: string | null;
  marketing_approved: boolean | null;
  liability_flag: boolean | null;
}

const PHOTO_TYPES = [
  { value: "field_log", label: "Daily log" },
  { value: "pre_work", label: "Pre-work / existing" },
  { value: "in_progress", label: "In progress" },
  { value: "completion", label: "Phase complete" },
  { value: "issue", label: "Issue / defect" },
];

const PhotosTab = ({ jobId, jobName }: { jobId: string; jobName?: string }) => {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState("");
  const [photoType, setPhotoType] = useState("field_log");
  const [caption, setCaption] = useState("");
  const [uploadedBy, setUploadedBy] = useState("Leo");
  const [showUpload, setShowUpload] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    setPhotos(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPhotos(); }, [jobId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storagePath = `${jobId}/${dateStr}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("job-photos").upload(storagePath, file, { contentType: file.type });
      if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(storagePath);
      await supabase.from("job_photos").insert({
        job_id: jobId, job_name: jobName || jobId, storage_path: storagePath,
        public_url: urlData.publicUrl, file_name: file.name, file_size_bytes: file.size,
        phase_name: selectedPhase || null, photo_type: photoType, caption: caption || null,
        uploaded_by: uploadedBy, taken_date: dateStr, marketing_approved: false, liability_flag: false,
      } as any);
    }
    await loadPhotos();
    setUploading(false);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
    toast.success(`${files.length} photo${files.length > 1 ? "s" : ""} uploaded`);
  };

  const toggleMarketing = async (photo: JobPhoto) => {
    const newVal = !photo.marketing_approved;
    await supabase.from("job_photos").update({ marketing_approved: newVal }).eq("id", photo.id);
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, marketing_approved: newVal } : p));
    toast.success(newVal ? "Marked for marketing" : "Removed from marketing");
  };

  const toggleLiability = async (photo: JobPhoto) => {
    const newVal = !photo.liability_flag;
    await supabase.from("job_photos").update({ liability_flag: newVal }).eq("id", photo.id);
    setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, liability_flag: newVal } : p));
    toast.success(newVal ? "Flagged as evidence" : "Evidence flag removed");
  };

  const byDate = photos.reduce((acc, p) => {
    const d = p.taken_date || p.created_at.split("T")[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(p);
    return acc;
  }, {} as Record<string, JobPhoto[]>);

  const marketingCount = photos.filter((p) => p.marketing_approved).length;
  const todayCount = photos.filter((p) => (p.taken_date || p.created_at.split("T")[0]) === new Date().toISOString().split("T")[0]).length;

  if (loading) return <div className="flex items-center justify-center p-10"><div className="w-8 h-8 rounded-full border-[3px] border-[rgba(201,168,76,0.2)] border-t-gold animate-spin-custom" /></div>;

  return (
    <div className="animate-fade-up">
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-w-[90vw] max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} alt="fullsize" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-6 text-white text-3xl cursor-pointer bg-transparent border-none">×</button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-cream">{photos.length}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Total Photos</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-ok">{todayCount}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Today</div>
        </div>
        <div className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] px-3 py-2 text-center">
          <div className="font-mono text-lg font-bold text-gold">{marketingCount}</div>
          <div className="text-[9px] text-mil-muted font-raj tracking-wider uppercase">Marketing Queue</div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <Label>Field Photos</Label>
        <Btn variant="green" size="sm" onClick={() => setShowUpload(!showUpload)}>{showUpload ? "CANCEL" : "📷 UPLOAD PHOTOS"}</Btn>
      </div>
      {showUpload && (
        <div className="bg-[rgba(0,0,0,0.2)] border border-gold/10 p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3 max-md:grid-cols-1">
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Photo Type</label>
              <select value={photoType} onChange={(e) => setPhotoType(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40">
                {PHOTO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Phase / Trade (optional)</label>
              <input value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)} placeholder="e.g. Framing, Plumbing Rough" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Caption (optional)</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What does this show?" className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40" />
            </div>
            <div>
              <label className="text-[9px] text-mil-muted font-raj tracking-wider uppercase block mb-1">Uploaded By</label>
              <select value={uploadedBy} onChange={(e) => setUploadedBy(e.target.value)} className="w-full bg-ink border border-[rgba(255,255,255,0.1)] text-cream text-xs px-2 py-[6px] outline-none focus:border-gold/40">
                {["Leo", "Alberto", "Arnel", "Andy", "Field Crew"].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => handleUpload(e.target.files)} className="hidden" />
            <Btn variant="green" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "UPLOADING..." : "SELECT / TAKE PHOTOS"}</Btn>
            <span className="text-[10px] text-mil-muted">Multiple files OK. Camera opens on mobile.</span>
          </div>
        </div>
      )}
      {Object.keys(byDate).length === 0 && (
        <div className="text-mil-muted text-xs p-4 text-center">No photos yet. Tap UPLOAD PHOTOS to start documenting.</div>
      )}
      {Object.entries(byDate).map(([date, dayPhotos]) => (
        <div key={date} className="mb-5">
          <div className="font-raj text-[10px] tracking-[2px] text-mil-muted uppercase mb-2 flex items-center gap-2">
            <span>{new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
            <span>— {dayPhotos.length} photo{dayPhotos.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 max-md:grid-cols-3 max-sm:grid-cols-2">
            {dayPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] overflow-hidden cursor-pointer" onClick={() => setLightbox(photo.public_url || "")}>
                  {photo.public_url && <img src={photo.public_url} alt={photo.caption || photo.file_name || "photo"} className="w-full h-full object-cover hover:opacity-90 transition-opacity" loading="lazy" />}
                  {photo.phase_name && <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 text-[8px] text-gold font-raj truncate max-w-[80%]">{photo.phase_name}</div>}
                  {photo.marketing_approved && <div className="absolute top-1 right-1 bg-gold/80 text-ink text-[7px] font-raj font-bold px-1">MKT</div>}
                  {photo.liability_flag && <div className="absolute bottom-1 right-1 bg-danger/80 text-white text-[7px] font-raj font-bold px-1">EVID</div>}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1 p-1">
                  <button onClick={(e) => { e.stopPropagation(); toggleMarketing(photo); }} className={`text-[9px] px-1.5 py-1 font-raj cursor-pointer border-none ${photo.marketing_approved ? "bg-gold text-ink" : "bg-[rgba(201,168,76,0.3)] text-gold"}`}>MKT</button>
                  <button onClick={(e) => { e.stopPropagation(); toggleLiability(photo); }} className={`text-[9px] px-1.5 py-1 font-raj cursor-pointer border-none ${photo.liability_flag ? "bg-danger text-white" : "bg-[rgba(196,56,40,0.3)] text-danger"}`}>EVID</button>
                </div>
                {photo.caption && <div className="text-[9px] text-mil-muted mt-1 truncate">{photo.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotosTab;
