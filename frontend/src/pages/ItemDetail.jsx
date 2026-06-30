import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, BACKEND_URL } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

const PH = "https://images.unsplash.com/photo-1631125915732-b98f8774f675?w=900&q=80";
const resolve = (u) => !u ? PH : u.startsWith("http") ? u : u.startsWith("/api/") ? `${BACKEND_URL}${u}` : u;

export default function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [view, setView] = useState("studio");

  useEffect(() => {
    api.get("/items").then((r) => {
      const found = r.data.items.find((i) => i.id === id);
      setItem(found || false);
    });
  }, [id]);

  if (item === null) return <div className="min-h-screen grid place-items-center text-xs tracking-[0.3em] uppercase">Loading…</div>;
  if (item === false) return (
    <div className="min-h-screen grid place-items-center text-center p-6">
      <div>
        <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#0A0A0A]/60">404</p>
        <h2 className="font-display text-4xl font-black uppercase mt-2">Item not found</h2>
        <Link to="/" className="inline-block mt-6 text-xs tracking-[0.25em] uppercase font-bold border-b border-[#0A0A0A]">← Back to catalog</Link>
      </div>
    </div>
  );

  const colors = (item.colors || []).filter((c) => c.image_url && (c.stock === undefined || c.stock > 0));
  const studio = colors.length > 0 ? resolve(colors[activeIdx]?.image_url || item.image_url) : resolve(item.image_url);
  const lifestyle = resolve(item.lifestyle_image_url);
  const hasLifestyle = !!item.lifestyle_image_url;
  const mainImg = view === "lifestyle" && hasLifestyle ? lifestyle : studio;
  const activeStock = colors.length > 0 ? (colors[activeIdx]?.stock ?? 0) : item.stock;

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#0A0A0A]">
      <header className="border-b border-[#0A0A0A] px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link to="/" data-testid="back-link" className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase font-bold">
          <ArrowLeft className="w-4 h-4" /> Catalog
        </Link>
        <Logo size={40} withWordmark={false} />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        <div className="bg-[#EEEEEC] aspect-[4/5] lg:aspect-auto lg:min-h-[80vh] relative">
          <img data-testid="detail-main-image" src={mainImg} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
          {hasLifestyle && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex border border-[#0A0A0A] bg-[#FDFDFD]">
              {["studio","lifestyle"].map((v) => (
                <button key={v} data-testid={`view-${v}`} onClick={() => setView(v)}
                  className={`px-4 py-2 text-[10px] tracking-[0.25em] uppercase font-bold ${view===v?"bg-[#0A0A0A] text-white":"text-[#0A0A0A]"}`}>{v}</button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 sm:p-10 lg:p-16 flex flex-col gap-6">
          {item.category && <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#0A0A0A]/60">{item.category}</p>}
          <h1 data-testid="detail-name" className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.9]">{item.name}</h1>
          <p data-testid="detail-price" className="font-mono-px text-2xl tabular-nums">₹{Number(item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>

          {colors.length > 0 && (
            <div data-testid="detail-swatches">
              <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#0A0A0A]/60 mb-3">
                Color: <span className="text-[#0A0A0A]">{colors[activeIdx]?.name}</span>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {colors.map((c, i) => (
                  <button key={i} data-testid={`detail-swatch-${i}`} onClick={() => setActiveIdx(i)} title={c.name}
                    className={`w-9 h-9 rounded-full border-2 ${i===activeIdx?"border-[#0A0A0A] scale-110":"border-[#0A0A0A]/20"}`}
                    style={{ background: c.hex }} />
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[#0A0A0A]/20 pt-4 flex items-center justify-between">
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold">{activeStock} in stock</span>
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#FF2A2A]">Available now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
