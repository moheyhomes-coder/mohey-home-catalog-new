import { useEffect, useRef, useState } from "react";
import { BACKEND_URL, getToken } from "@/lib/api";
import { toast } from "sonner";
import { Upload, Loader2, ImageIcon, Plus, X, Palette } from "lucide-react";

const PRODUCT_TYPES = ["bedsheet", "carpet", "doormat", "sofa cover", "quilt", "pouffee"];

function resolveImageUrl(u) {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("blob:") || u.startsWith("data:")) return u;
  if (u.startsWith("/api/")) return `${BACKEND_URL}${u}`;
  return u;
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BACKEND_URL}/api/admin/upload`, {
    method: "POST",
    body: fd,
    credentials: "include",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    let detail = "Upload failed";
    try { detail = (await res.json()).detail || detail; } catch (_) { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

function ImageDropzone({ preview, busy, dragOver, setDragOver, onPick, onDrop, testId, label }) {
  return (
    <div
      onClick={() => !preview && onPick()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(e.dataTransfer.files?.[0]); }}
      data-testid={testId}
      className={`aspect-[4/5] w-full border-2 border-dashed overflow-hidden relative transition-colors ${
        dragOver
          ? "border-[#FF2A2A] bg-[#FF2A2A]/5"
          : preview
            ? "border-white/15 bg-[#0A0A0A] cursor-default"
            : "border-white/20 bg-[#0A0A0A] hover:border-white/40 cursor-pointer"
      }`}
    >
      {preview ? (
        <img src={preview} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center text-white/40 p-4 text-center">
          <div>
            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-[10px] tracking-[0.25em] uppercase font-bold text-white/70">
              {dragOver ? "Drop here" : label}
            </p>
            <p className="text-[9px] text-white/40 mt-1.5 normal-case tracking-normal">
              JPG · PNG · WEBP · 12 MB
            </p>
          </div>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 bg-black/75 grid place-items-center">
          <Loader2 className="w-7 h-7 animate-spin text-white" />
        </div>
      )}
    </div>
  );
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
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingLifestyle, setUploadingLifestyle] = useState(false);
  const [dragOverMain, setDragOverMain] = useState(false);
  const [dragOverLife, setDragOverLife] = useState(false);
  const [colors, setColors] = useState([]);
  const [variantBusyIdx, setVariantBusyIdx] = useState(-1);
  const mainFileRef = useRef(null);
  const lifeFileRef = useRef(null);

  useEffect(() => {
    setName(initial?.name || "");
    setPrice(initial?.price ?? "");
    setStock(initial?.stock ?? "");
    setImageUrl(initial?.image_url || "");
    setLifestyleUrl(initial?.lifestyle_image_url || "");
    setCategory(initial?.category || "bedsheet");
    setCollectionId(initial?.collection_id || "");
    setManualSoldOut(initial?.manual_sold_out || false);
    setColors(Array.isArray(initial?.colors) ? initial.colors : []);
  }, [initial]);

  const handleMainFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please pick an image file"); return; }
    setUploadingMain(true);
    setImageUrl(URL.createObjectURL(f));
    try {
      const data = await uploadFile(f);
      setImageUrl(data.url);
      toast.success("Main photo uploaded");
    } catch (e) {
      toast.error(e.message);
      setImageUrl("");
    } finally {
      setUploadingMain(false);
    }
  };

  const handleLifestyleFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please pick an image file"); return; }
    setUploadingLifestyle(true);
    setLifestyleUrl(URL.createObjectURL(f));
    try {
      const data = await uploadFile(f);
      setLifestyleUrl(data.url);
      toast.success("Lifestyle photo uploaded");
    } catch (e) {
      toast.error(e.message);
      setLifestyleUrl("");
    } finally {
      setUploadingLifestyle(false);
    }
  };

  const onMainSelect = (e) => handleMainFile(e.target.files?.[0]);
  const onLifeSelect = (e) => handleLifestyleFile(e.target.files?.[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!imageUrl || imageUrl.startsWith("blob:")) {
      toast.error("Please upload the main image before saving");
      return;
    }
    const cleanColors = colors
      .filter((c) => c.name && c.name.trim() && c.image_url && !c.image_url.startsWith("blob:"))
      .map((c) => ({ name: c.name.trim(), hex: c.hex || "#000000", image_url: c.image_url, stock: parseInt(c.stock, 10) || 0 }));
    onSubmit({
      name: name.trim(),
      price: parseFloat(price) || 0,
      stock: parseInt(stock, 10) || 0,
      image_url: imageUrl,
      lifestyle_image_url: lifestyleUrl,
      category,
      collection_id: collectionId,
      manual_sold_out: manualSoldOut,
      colors: cleanColors,
    });
  };

  const addColor = () => setColors((cs) => [...cs, { name: "", hex: "#1E3A8A", image_url: "", stock: 0 }]);
  const removeColor = (i) => setColors((cs) => cs.filter((_, idx) => idx !== i));
  const updateColor = (i, patch) => setColors((cs) => cs.map((c, idx) => idx === i ? { ...c, ...patch } : c));

  const uploadColorImage = async (i, f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please pick an image file"); return; }
    setVariantBusyIdx(i);
    updateColor(i, { image_url: URL.createObjectURL(f) });
    try {
      const data = await uploadFile(f);
      updateColor(i, { image_url: data.url });
      toast.success("Color photo uploaded");
    } catch (e) {
      toast.error(e.message);
      updateColor(i, { image_url: "" });
    } finally {
      setVariantBusyIdx(-1);
    }
  };

  const mainPreview = resolveImageUrl(imageUrl);
  const lifePreview = resolveImageUrl(lifestyleUrl);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" data-testid="item-form">
      <div className="grid grid-cols-2 gap-4">
        {/* Main photo */}
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">
            Main Photo *
          </label>
          <input
            ref={mainFileRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={onMainSelect} className="hidden"
            data-testid="item-form-main-file-input"
          />
          <ImageDropzone
            preview={mainPreview}
            busy={uploadingMain}
            dragOver={dragOverMain}
            setDragOver={setDragOverMain}
            onPick={() => mainFileRef.current?.click()}
            onDrop={handleMainFile}
            testId="item-form-main-dropzone"
            label="Drop or click"
          />
          <button
            type="button" onClick={() => mainFileRef.current?.click()}
            disabled={uploadingMain}
            data-testid="item-form-main-upload"
            className="mt-2 w-full bg-white text-[#0A0A0A] px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/80 disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" /> {mainPreview ? "Replace" : "Upload Main"}
          </button>
        </div>

        {/* Lifestyle photo */}
        <div>
          <label className="block text-[10px] tracking-[0.3em] uppercase font-bold text-white/60 mb-2">
            Lifestyle Photo
          </label>
          <input
            ref={lifeFileRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={onLifeSelect} className="hidden"
            data-testid="item-form-life-file-input"
          />
          <ImageDropzone
            preview={lifePreview}
            busy={uploadingLifestyle}
            dragOver={dragOverLife}
            setDragOver={setDragOverLife}
            onPick={() => lifeFileRef.current?.click()}
            onDrop={handleLifestyleFile}
            testId="item-form-life-dropzone"
            label="Drop or click"
          />
          <button
            type="button" onClick={() => lifeFileRef.current?.click()}
            disabled={uploadingLifestyle}
            data-testid="item-form-life-upload"
            className="mt-2 w-full bg-white text-[#0A0A0A] px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/80 disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" /> {lifePreview ? "Replace" : "Upload Lifestyle"}
          </button>
        </div>
      </div>
      <p className="text-[10px] text-white/40 -mt-1">
        Tip: Main photo is required. Lifestyle photo is optional (shows a room/setting view).
      </p>

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
          <input data-testid="item-form-category" list="cat-list" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Type or pick" className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2.5 px-3 text-[11px] uppercase tracking-wider" />
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
            Same design in multiple colors? Add variants — upload a photo for each color, set stock. Viewers see swatches and tap to swap.
          </p>
        ) : (
          <div className="space-y-3">
            {colors.map((c, i) => (
              <ColorVariantRow
                key={i} index={i} variant={c}
                busy={variantBusyIdx === i}
                onChange={(patch) => updateColor(i, patch)}
                onUpload={(f) => uploadColorImage(i, f)}
                onRemove={() => removeColor(i)}
              />
            ))}
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

function ColorVariantRow({ index, variant, busy, onChange, onUpload, onRemove }) {
  const fileRef = useRef(null);
  const preview = variant.image_url
    ? (variant.image_url.startsWith("/api/") ? `${BACKEND_URL}${variant.image_url}` : variant.image_url)
    : "";
  return (
    <div data-testid={`color-variant-${index}`} className="border border-white/10 p-3 grid grid-cols-[44px_1fr_auto] gap-2 items-center">
      <div className="flex flex-col items-center gap-1">
        <input
          type="color"
          value={variant.hex || "#000000"}
          onChange={(e) => onChange({ hex: e.target.value })}
          data-testid={`color-hex-${index}`}
          className="w-10 h-10 bg-transparent border border-white/20 cursor-pointer"
        />
      </div>
      <div className="space-y-2">
        <input
          placeholder="Color name (e.g. Navy Blue)"
          value={variant.name}
          onChange={(e) => onChange({ name: e.target.value })}
          data-testid={`color-name-${index}`}
          className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2 px-2.5 text-xs"
        />
        <input
          type="number" min="0"
          placeholder="Stock for this color"
          value={variant.stock ?? 0}
          onChange={(e) => onChange({ stock: parseInt(e.target.value, 10) || 0 })}
          data-testid={`color-stock-${index}`}
          className="w-full bg-[#0A0A0A] border border-white/15 focus:border-white outline-none py-2 px-2.5 text-xs font-mono-px"
        />
        <input
          ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(e) => onUpload(e.target.files?.[0])} className="hidden"
          data-testid={`color-file-input-${index}`}
        />
        {preview ? (
          <div className="flex items-center gap-2">
            <div className="w-10 h-12 border border-white/10 overflow-hidden bg-[#0A0A0A] relative">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              {busy && (
                <div className="absolute inset-0 bg-black/70 grid place-items-center">
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              data-testid={`replace-color-${index}`}
              className="text-[10px] tracking-[0.2em] uppercase font-bold text-white/70 hover:text-white border border-white/20 px-2 py-1.5 inline-flex items-center gap-1 disabled:opacity-40"
            >
              <Upload className="w-3 h-3" /> Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            data-testid={`upload-color-${index}`}
            className="w-full bg-white text-[#0A0A0A] px-2 py-1.5 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/80 transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {busy ? "Uploading…" : "Upload photo"}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        data-testid={`remove-color-${index}`}
        className="self-start p-1.5 text-white/40 hover:text-[#FF2A2A]"
        aria-label="Remove color"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
