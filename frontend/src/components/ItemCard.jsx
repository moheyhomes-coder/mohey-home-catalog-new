import { useState } from "react";
import { Link } from "react-router-dom";

const PLACEHOLDER = "https://images.unsplash.com/photo-1631125915732-b98f8774f675?w=900&q=80";

function resolveUrl(u, backendUrl) {
  if (!u) return PLACEHOLDER;
  if (u.startsWith("http")) return u;
  if (u.startsWith("/api/")) return `${backendUrl}${u}`;
  return u;
}

export function ItemCard({ item, index = 0, backendUrl = "" }) {
  const [loaded, setLoaded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const colors = Array.isArray(item.colors) ? item.colors.filter((c) => c.image_url && (c.stock === undefined || c.stock > 0)) : [];
  const [activeIdx, setActiveIdx] = useState(0);

  const studio = colors.length > 0
    ? resolveUrl(colors[activeIdx]?.image_url || item.image_url, backendUrl)
    : resolveUrl(item.image_url, backendUrl);
  const lifestyle = resolveUrl(item.lifestyle_image_url, backendUrl);
  const hasLifestyle = !!item.lifestyle_image_url;
  const activeImg = hovering && hasLifestyle ? lifestyle : studio;

  return (
    <Link
      to={`/p/${item.id}`}
      data-testid={`catalog-item-${item.id}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative flex flex-col border-r border-b border-[#0A0A0A] p-6 lg:p-8 bg-[#FDFDFD] hover:bg-[#F4F4F2] transition-colors cursor-pointer"
      style={{ animation: "fadeUp .5s ease-out both", animationDelay: `${Math.min(index * 60, 600)}ms` }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#EEEEEC] mb-6">
        {!loaded && <div className="absolute inset-0 bg-[#EEEEEC] animate-pulse" />}
        <img
          key={activeImg}
          src={activeImg}
          alt={item.name}
          onLoad={() => setLoaded(true)}
          onError={(e) => { e.currentTarget.src = PLACEHOLDER; setLoaded(true); }}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 font-mono-px text-[10px] tracking-widest bg-[#FDFDFD] border border-[#0A0A0A] px-2 py-0.5">
          № {String(index + 1).padStart(3, "0")}
        </span>
        {hasLifestyle && (
          <span
            data-testid={`view-toggle-${item.id}`}
            className="absolute top-3 right-3 text-[9px] tracking-[0.25em] uppercase font-bold bg-[#0A0A0A] text-white px-2 py-1"
          >
            {hovering ? "Lifestyle" : "Studio"}
          </span>
        )}
        {item.category && (
          <span className="absolute bottom-3 left-3 text-[9px] tracking-[0.25em] uppercase font-bold bg-[#FDFDFD]/90 border border-[#0A0A0A]/30 px-2 py-1">
            {item.category}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-grow gap-3">
        <div className="flex items-start justify-between gap-4">
          <h3 data-testid={`item-name-${item.id}`} className="font-display text-xl lg:text-2xl font-bold uppercase tracking-tight leading-none">
            {item.name}
          </h3>
          <span data-testid={`item-price-${item.id}`} className="font-mono-px text-base tabular-nums whitespace-nowrap">
            ${Number(item.price).toFixed(2)}
          </span>
        </div>

        {colors.length > 0 && (
          <div className="flex items-center gap-3 pt-1" data-testid={`item-swatches-${item.id}`}>
            <span className="text-[9px] tracking-[0.3em] uppercase font-bold text-[#0A0A0A]/60">
              {colors[activeIdx]?.name || ""}
            </span>
            <div className="flex items-center gap-1.5">
              {colors.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveIdx(i); setLoaded(false); }}
                  data-testid={`swatch-${item.id}-${i}`}
                  aria-label={`Show ${c.name}`}
                  title={c.name}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    i === activeIdx ? "border-[#0A0A0A] scale-110" : "border-[#0A0A0A]/20 hover:border-[#0A0A0A]/60"
                  }`}
                  style={{ background: c.hex || "#000" }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#0A0A0A]/20">
          <span data-testid={`item-stock-${item.id}`} className="text-[10px] tracking-[0.25em] font-bold uppercase text-[#0A0A0A]/70">
            {colors.length > 0
              ? `${colors[activeIdx]?.stock ?? 0} in stock`
              : `${item.stock} in stock`}
          </span>
          <span className="text-[10px] tracking-[0.25em] font-bold uppercase text-[#FF2A2A]">
            Available
          </span>
        </div>
      </div>
    </Link>
  );
}
