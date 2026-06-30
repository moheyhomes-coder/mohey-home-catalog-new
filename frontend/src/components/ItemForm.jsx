import { useEffect, useRef, useState } from "react";
import { BACKEND_URL, getToken } from "@/lib/api";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2, ImageIcon, RotateCw, Plus, X, Palette } from "lucide-react";

const PRODUCT_TYPES = ["bedsheet", "carpet", "doormat", "sofa cover", "quilt", "pouffee"];
const SCENES = [
  { id: "studio", label: "White Studio", desc: "Seamless white BG" },
  { id: "lifestyle", label: "Lifestyle Room", desc: "Styled interior" },
  { id: "flatlay", label: "Flat Lay", desc: "Top-down view" },
];

function resolveImageUrl(u) {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("blob:") || u.startsWith("data:")) return u;
  if (u.startsWith("/api/")) return `${BACKEND_URL}${u}`;
  return u;
}

export function ItemForm({ initial, onCancel, onSubmit, submitting, collections = [], onCollectionCreate }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [lifestyleUrl, setLifestyleUrl] = useState("");
  const [category, setCategory] = useState("bedsheet");
  const [collectionId, setCollectionId] = useState("");
  const [manualSoldOut, setManualSoldOut] = useState(false);
  const [productType, setProductType] = useState("bedsheet");
  const [scene, setScene] = useState("studio");
  const [uploading, setUploading] = useState(false);
  const [stylizing, setStylizing] = useState(false);
  const [rawFile, setRawFile] = useState(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [colors, setColors] = useState([]);
  const [variantBusyIdx, setVariantBusyIdx] = useState(-1);
  const fileRef = useRef(null);

  useEffect(() => {
    setName(initial?.name || "");
    setPrice(initial?.price ?? "");
    setStock(initial?.stock ?? "");
    setImageUrl(initial?.image_url || "");
    setLifestyleUrl(initial?.lifestyle_image_url || "");
    setCategory(initial?.category || "bedsheet");
    setCollectionId(initial?.collection_id || "");
    setManualSoldOut(initial?.manual_sold_out || false);
    setRawFile(null);
    setAiGenerated(false);
    setColors(Array.isArray(initial?.colors) ? initial.colors : []);
  }, [initial]);

  const acceptFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }
    setRawFile(f);
    setAiGenerated(false);
    setImageUrl(URL.createObjectURL(f));
  };

  const handleFileSelect = (e) => acceptFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const doUpload = async () => {
    if (!rawFile) { fileRef.current?.click(); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", rawFile);
      const res = await fetch(`${BACKEND_URL}/api/admin/upload`, {
        method: "POST", body: fd, credentials: "include",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        let detail = "Upload failed";
        try { detail = (await res.json()).detail || detail; } catch (_) { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setImageUrl(data.url);
      setAiGenerated(false);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const doStylize = async () => {
    if (!rawFile) { toast.error("Please select a photo first"); return; }
    setStylizing(true);
    const tid = toast.loading(aiGenerated ? "Re-rolling AI variation…" : "AI is restyling your photo… (10-25s)");
    try {
      const fd = new FormData();
      fd.append("file", rawFile);
      fd.append("product_type", productType);
      fd.append("scene", scene);
      const res = await fetch(`${BACKEND_URL}/api/admin/ai-stylize`, {
        method: "POST", body: fd, credentials: "include",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        let detail = "AI stylize failed";
        try { detail = (await res.json()).detail || detail; } catch (_) { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setImageUrl(data.url);
      setAiGenerated(true);
      toast.success(aiGenerated ? "New variation ready ✨" : "Studio photo generated ✨", { id: tid });
    } catch (e) {
      toast.error(e.message, { id: tid });
    } finally {
      setStylizing(false);
    }
  };

  const generateLifestyle = async () => {
    if (!rawFile) { toast.error("Pick the base photo first"); return; }
    setStylizing(true);
    const tid = toast.loading("Generating lifestyle photo…");
    try {
      const fd = new FormData();
      fd.append("file", rawFile);
      fd.append("product_type", productType);
      fd.append("scene", "lifestyle");
      const res = await fetch(`${BACKEND_URL}/api/admin/ai-stylize`, {
        method: "POST", body: fd, credentials: "include",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        let detail = "Lifestyle generation failed";
        try { detail = (await res.json()).detail || detail; } catch (_) { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      setLifestyleUrl(data.url);
      toast.success("Lifestyle photo ready ✨", { id: tid });
    } catch (e) { toast.error(e.message, { id: tid }); }
    finally { setStylizing(false); }
  };

  const generateAll = async () => {
    if (!rawFile) { toast.error("Pick a base photo first"); return; }
    const tid = toast.loading("Generating Studio + Lifestyle…");
    setStylizing(true);
    try {
      const stylize = async (extraFields) => {
        const fd = new FormData();
        fd.append("file", rawFile);
        fd.append("product_type", productType);
        Object.entries(extraFields).forEach(([k, v]) => fd.append(k, v));
        const res = await fetch(`${BACKEND_URL}/api/admin/ai-stylize`, {
          method: "POST", body: fd, credentials: "include",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("AI generation failed");
        return (await res.json()).url;
      };
      toast.loading("Generating Studio photo (1/2)…", { id: tid });
      const studioUrl = await stylize({ scene: "studio" });
      setImageUrl(studioUrl); setAiGenerated(true);
      toast.loading("Generating Lifestyle photo (2/2)…", { id: tid });
      const lifeUrl = await stylize({ scene: "lifestyle" });
      setLifestyleUrl(lifeUrl);
      toast.success("Studio + Lifestyle ready ✨", { id: tid });
    } catch (e) {
      toast.error(e.message || "Generation failed", { id: tid });
    } finally { setStylizing(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!imageUrl || imageUrl.startsWith("blob:")) {
      toast.error("Please upload the main image (or click AI Studio) before saving");
      return;
    }
    const cleanColors = colors
      .filter((c) => c.name && c.name.trim() && c.image_url && !c.image_url.startsWith("blob:"))
      .map((c) => ({ name: c.name.trim(), hex: c.hex || "#000000", image_url: c.image_url, stock: parseInt(c.stock, 10) || 0 }));
    onSubmit({
      name: name.trim(), price: parseFloat(price) || 0, stock: parseInt(stock, 10) || 0,
      image_url: imageUrl, lifestyle_image_url: lifestyleUrl,
      category, collection_id: collectionId,
      manual_sold_out: manualSoldOut, colors: cleanColors,
    });
  };

  const addColor = () => setColors((cs) => [...cs, { name: "", hex: "#1E3A8A", image_url: "", stock: 0 }]);
  const removeColor = (i) => setColors((cs) => cs.filter((_, idx) => idx !== i));
  const updateColor = (i, patch) => setColors((cs) => cs.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  const generateColorVariant = async (i) => {
    const c = colors[i];
    if (!rawFile) { toast.error("Pick the base photo first"); return; }
    if (!c?.name?.trim()) { toast.error("Add a color name first"); return; }
    setVariantBusyIdx(i);
    const tid = toast.loading(`Generating ${c.name} variant…`);
    try {
      const fd = new FormData();
      fd.append("file", rawFile);
      fd.append("product_type", productType);
      fd.append("scene", scene);
      fd.append("target_color", c.name);
      const res = await fetch(`${BACKEND_URL}/api/admin/ai-stylize`, {
        method: "POST", body: fd, credentials: "include",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        let detail = "Variant generation failed";
        try { detail = (await res.json()).detail || detail; } catch (_) { /* ignore */ }
        throw new Error(detail);
      }
      const data = await res.json();
      updateColor(i, { image_url: data.url });
      toast.success(`${c.name} variant ready ✨`, { id: tid });
    } catch (e) {
      toast.error(e.message, { id: tid });
    } finally {
      setVariantBusyIdx(-1);
    }
  };

  const previewSrc = resolveImageUrl(imageUrl);
  const busy = uploading || stylizing;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="item-form">
      {/* Image picker with drag-and-drop */}
      <div>
        <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">
          Product Photo
        </label>
        <input
          ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect} className="hidden"
          data-testid="item-form-file-input"
        />

        <div
          onClick={() => !previewSrc && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          data-testid="item-form-dropzone"
          className={`aspect-[4/5] w-full border-2 border-dashed mb-3 overflow-hidden relative transition-colors cursor-pointer ${
            dragOver
              ? "border-[#FF2A2A] bg-[#FF2A2A]/5"
              : previewSrc
                ? "border-white/15 bg-[#0A0A0A] cursor-default"
                : "border-white/20 bg-[#0A0A0A] hover:border-white/40"
          }`}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-white/40 p-6 text-center">
              <div>
                <ImageIcon className="w-10 h-10 mx-auto mb-3" />
                <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-white/70">
                  {dragOver ? "Drop image here" : "Drop photo or click"}
                </p>
                <p className="text-[10px] text-white/40 mt-2 normal-case tracking-normal">
                  JPG · PNG · WEBP · up to 12 MB
                </p>
              </div>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 bg-black/75 grid place-items-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}
          {aiGenerated && !busy && (
            <span className="absolute top-3 left-3 bg-[#FF2A2A] text-white text-[9px] tracking-[0.25em] uppercase font-bold px-2 py-1 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Studio
            </span>
          )}
        </div>

        {rawFile && (
          <p className="text-[10px] text-white/50 mb-2 truncate" data-testid="selected-filename">
            {rawFile.name} · {(rawFile.size / 1024).toFixed(0)} KB
          </p>
        )}

        {/* Product type + scene selectors */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase font-bold text-white/50 mb-1">Product</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              data-testid="item-form-product-type"
              className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2 px-2 text-[11px] uppercase tracking-wider"
            >
              {PRODUCT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase font-bold text-white/50 mb-1">Scene</label>
            <select
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              data-testid="item-form-scene"
              className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2 px-2 text-[11px] uppercase tracking-wider"
            >
              {SCENES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <p className="text-[10px] text-white/40 mb-3">
          {SCENES.find((s) => s.id === scene)?.desc}
        </p>

        {/* AI + Upload + Regenerate buttons */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            type="button" onClick={doStylize}
            disabled={!rawFile || busy}
            data-testid="item-form-ai-stylize"
            className="bg-[#FF2A2A] text-white px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white hover:text-[#FF2A2A] transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Studio
          </button>
          <button
            type="button" onClick={doStylize}
            disabled={!rawFile || !aiGenerated || busy}
            data-testid="item-form-regenerate"
            className="border border-white/30 text-white px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/5 transition-colors disabled:opacity-30 inline-flex items-center justify-center gap-2"
          >
            <RotateCw className="w-3.5 h-3.5" /> Regenerate
          </button>
        </div>

        <button
          type="button"
          onClick={generateAll}
          disabled={!rawFile || stylizing || uploading}
          data-testid="item-form-generate-all"
          className="w-full bg-[#0A0A0A] border-2 border-[#FF2A2A] text-[#FF2A2A] px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-[#FF2A2A] hover:text-white transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2 mb-2"
        >
          <Sparkles className="w-3.5 h-3.5" /> Generate Studio + Lifestyle (1 click)
        </button>

        <button
          type="button" onClick={doUpload}
          disabled={!rawFile || busy}
          data-testid="item-form-upload"
          className="w-full bg-white text-[#0A0A0A] px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/80 disabled:opacity-40 inline-flex items-center justify-center gap-2"
        >
          <Upload className="w-3.5 h-3.5" /> Use Original (no AI)
        </button>
        <p className="mt-2 text-[10px] text-white/40 leading-relaxed">
          Tip: Click <span className="text-[#FF2A2A] font-bold">AI Studio</span> for a clean catalog photo. Don&apos;t love it? Hit <span className="font-bold">Regenerate</span> for a new variation (or switch the scene first).
        </p>
      </div>

      <div>
        <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">Name</label>
        <input
          data-testid="item-form-name" required
          value={name} onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2.5 px-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">Price ($)</label>
          <input
            data-testid="item-form-price" type="number" step="0.01" min="0" required
            value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2.5 px-3 text-sm font-mono-px"
          />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">Stock</label>
          <input
            data-testid="item-form-stock" type="number" min="0" required
            value={stock} onChange={(e) => setStock(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2.5 px-3 text-sm font-mono-px"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">Category</label>
          <input data-testid="item-form-category" list="cat-list" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Type or pick (e.g. table runner)" className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2.5 px-3 text-[11px] uppercase tracking-wider" />
          <datalist id="cat-list">{PRODUCT_TYPES.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">Collection</label>
          <div className="flex gap-1">
            <select data-testid="item-form-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="flex-grow bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2.5 px-2 text-[11px] uppercase tracking-wider">
              <option value="">— none —</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {onCollectionCreate && (
              <button type="button" onClick={async () => {
                const n = prompt("New collection name?");
                if (!n?.trim()) return;
                const created = await onCollectionCreate(n.trim());
                if (created?.id) setCollectionId(created.id);
              }} data-testid="new-collection-button" className="border border-white/20 px-3 hover:bg-white/5 text-lg">+</button>
            )}
          </div>
        </div>
      </div>

      {/* Lifestyle photo */}
      <div className="border-t border-white/10 pt-5">
        <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">
          Lifestyle Photo (room setting)
        </label>
        <div className="grid grid-cols-[80px_1fr] gap-3 items-start">
          <div className="aspect-[4/5] border border-white/15 bg-[#0A0A0A] overflow-hidden">
            {lifestyleUrl ? (
              <img src={lifestyleUrl.startsWith("/api/") ? `${BACKEND_URL}${lifestyleUrl}` : lifestyleUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-white/30 text-[8px] tracking-widest uppercase">Not set</div>
            )}
          </div>
          <div className="space-y-2">
            <button type="button" onClick={generateLifestyle} disabled={!rawFile || stylizing || uploading} data-testid="item-form-gen-lifestyle" className="w-full bg-[#FF2A2A] text-white px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white hover:text-[#FF2A2A] transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> {lifestyleUrl ? "Regenerate Lifestyle" : "Generate Lifestyle Photo"}
            </button>
            <p className="text-[10px] text-white/40">Uses the base photo + &quot;Lifestyle Room&quot; scene.</p>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          data-testid="item-form-sold-out" type="checkbox"
          checked={manualSoldOut} onChange={(e) => setManualSoldOut(e.target.checked)}
          className="w-4 h-4 accent-[#FF2A2A]"
        />
        <span className="text-[11px] tracking-[0.2em] uppercase font-bold">Mark as Sold Out (manual)</span>
      </label>

      {/* Color variants */}
      <div className="border-t border-white/10 pt-5" data-testid="color-variants-section">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-white/60" />
            <label className="text-[10px] tracking-[0.3em] uppercase font-bold text-white/60">
              Color Variants ({colors.length})
            </label>
          </div>
          <button
            type="button"
            onClick={addColor}
            data-testid="add-color-variant"
            className="border border-white/20 px-3 py-1.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/5 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> Add Color
          </button>
        </div>

        {colors.length === 0 ? (
          <p className="text-[10px] text-white/40 leading-relaxed">
          Same design in multiple colors? Add variants &mdash; each gets its own AI-generated image. Viewers see swatches and tap to swap.
          </p>
        ) : (
          <div className="space-y-3">
            {colors.map((c, i) => (
              <div key={i} data-testid={`color-variant-${i}`} className="border border-white/10 p-3 grid grid-cols-[44px_1fr_auto] gap-2 items-center">
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="color"
                    value={c.hex || "#000000"}
                    onChange={(e) => updateColor(i, { hex: e.target.value })}
                    data-testid={`color-hex-${i}`}
                    className="w-10 h-10 bg-transparent border border-white/20 cursor-pointer"
                  />
                  {c.image_url && !c.image_url.startsWith("blob:") && (
                    <span className="text-[8px] tracking-widest text-[#FF2A2A] font-bold uppercase">AI ✓</span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    placeholder="Color name (e.g. Navy Blue)"
                    value={c.name}
                    onChange={(e) => updateColor(i, { name: e.target.value })}
                    data-testid={`color-name-${i}`}
                    className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2 px-2.5 text-xs"
                  />
                  <input
                    type="number" min="0"
                    placeholder="Stock for this color"
                    value={c.stock ?? 0}
                    onChange={(e) => updateColor(i, { stock: parseInt(e.target.value, 10) || 0 })}
                    data-testid={`color-stock-${i}`}
                    className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2 px-2.5 text-xs font-mono-px"
                  />
                  {c.image_url ? (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-12 border border-white/10 overflow-hidden bg-[#0A0A0A]">
                        <img
                          src={c.image_url.startsWith("/api/") ? `${BACKEND_URL}${c.image_url}` : c.image_url}
                          alt="" className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => generateColorVariant(i)}
                        disabled={variantBusyIdx === i || !rawFile}
                        data-testid={`regen-color-${i}`}
                        className="text-[10px] tracking-[0.2em] uppercase font-bold text-white/70 hover:text-white border border-white/20 px-2 py-1.5 inline-flex items-center gap-1 disabled:opacity-40"
                      >
                        <RotateCw className="w-3 h-3" /> Regen
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => generateColorVariant(i)}
                      disabled={variantBusyIdx === i || !rawFile || !c.name.trim()}
                      data-testid={`generate-color-${i}`}
                      className="w-full bg-[#FF2A2A] text-white px-2 py-1.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white hover:text-[#FF2A2A] transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                    >
                      {variantBusyIdx === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {variantBusyIdx === i ? "Generating…" : "Generate this color"}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeColor(i)}
                  data-testid={`remove-color-${i}`}
                  className="self-start p-1.5 text-white/40 hover:text-[#FF2A2A]"
                  aria-label="Remove color"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <p className="text-[10px] text-white/40 leading-relaxed">
              Tip: pick the base photo above first → name each color (e.g. &quot;Maroon&quot;, &quot;Olive&quot;) → hit Generate. AI keeps the design but recolors the fabric.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          data-testid="item-form-submit" type="submit" disabled={submitting}
          className="bg-white text-[#0A0A0A] px-5 py-3 uppercase tracking-[0.25em] text-[11px] font-bold hover:bg-[#FF2A2A] hover:text-white transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving…" : initial?.id ? "Update Item" : "Add Item"}
        </button>
        <button
          data-testid="item-form-cancel" type="button" onClick={onCancel}
          className="border border-white/20 px-5 py-3 uppercase tracking-[0.25em] text-[11px] font-bold hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
