import { useEffect, useMemo, useRef, useState } from "react";
import { api, BACKEND_URL } from "@/lib/api";
import { ItemCard } from "@/components/ItemCard";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Logo, LogoMark } from "@/components/Logo";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Copy, ArrowUpRight, Search } from "lucide-react";

const POLL_FALLBACK_MS = 10000;
const CATEGORIES = ["all", "bedsheet", "carpet", "doormat", "sofa cover", "quilt", "pouffee"];
const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "name", label: "Name A-Z" },
];

function buildWsUrl() {
  const base = BACKEND_URL || window.location.origin;
  const u = new URL(base);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/api/ws";
  return u.toString();
}

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsLive, setWsLive] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [collectionId, setCollectionId] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const prevIds = useRef(new Set());
  const wsRef = useRef(null);

  const fetchAll = async (notify = true) => {
    try {
      const [itemsRes, colRes] = await Promise.all([
        api.get("/items"),
        api.get("/collections").catch(() => ({ data: [] })),
      ]);
      const newIds = new Set(itemsRes.data.items.map((i) => i.id));
      if (notify && prevIds.current.size > 0) {
        const added = [...newIds].filter((id) => !prevIds.current.has(id));
        const removed = [...prevIds.current].filter((id) => !newIds.has(id));
        if (added.length) toast.success(`${added.length} new item${added.length > 1 ? "s" : ""} added`);
        if (removed.length) toast(`${removed.length} item${removed.length > 1 ? "s" : ""} sold out`);
      }
      prevIds.current = newIds;
      setItems(itemsRes.data.items);
      setCollections(colRes.data || []);
      setUpdatedAt(itemsRes.data.updated_at);
    } catch (_) { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll(false);
    const pollId = setInterval(() => fetchAll(true), POLL_FALLBACK_MS);
    let retryTimer = null;
    const connect = () => {
      try {
        const ws = new WebSocket(buildWsUrl());
        wsRef.current = ws;
        ws.onopen = () => setWsLive(true);
        ws.onclose = () => { setWsLive(false); retryTimer = setTimeout(connect, 3000); };
        ws.onerror = () => { try { ws.close(); } catch (_) { /* ignore */ } };
        ws.onmessage = (evt) => {
          try {
            const m = JSON.parse(evt.data);
            if (m.type === "ping" || m.type === "hello") return;
            if (m.type && m.type.startsWith("item.")) fetchAll(true);
          } catch (_) { /* ignore */ }
        };
      } catch (_) { retryTimer = setTimeout(connect, 3000); }
    };
    connect();
    return () => {
      clearInterval(pollId);
      if (retryTimer) clearTimeout(retryTimer);
      try { wsRef.current && wsRef.current.close(); } catch (_) { /* ignore */ }
    };
  }, []);

  const dynamicCategories = useMemo(() => ["all", ...Array.from(new Set(items.map((i) => (i.category || "").toLowerCase().trim()).filter(Boolean))).sort()], [items]);

  const filteredItems = useMemo(() => {
    let arr = [...items];
    if (category !== "all") arr = arr.filter((i) => (i.category || "").toLowerCase() === category);
    if (collectionId !== "all") arr = arr.filter((i) => i.collection_id === collectionId);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      arr = arr.filter((i) => i.name.toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q));
    }
    if (sortBy === "price_asc") arr.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") arr.sort((a, b) => b.price - a.price);
    else if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [items, category, collectionId, search, sortBy]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Catalog link copied"); }
    catch { toast.error("Couldn't copy link"); }
  };

  const timeStr = updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--";

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#0A0A0A]">
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>

      <div className="border-b border-[#0A0A0A] overflow-hidden bg-[#0A0A0A] text-[#FDFDFD]">
        <div className="flex marquee-inner whitespace-nowrap py-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center">
              {Array.from({ length: 6 }).map((_, j) => (
                <span key={j} className="px-6 text-[10px] tracking-[0.4em] font-bold inline-flex items-center gap-3">
                  <LogoMark size={14} className="invert" />
                  MOHEY HOME · PREMIUM TEXTILES · LIVE CATALOG ·
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="border-b border-[#0A0A0A] px-6 lg:px-12 py-6 lg:py-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5">
          <Logo size={56} />
          <div className="hidden lg:block pl-5 border-l border-[#0A0A0A]/20">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#0A0A0A]/60">
              {wsLive ? "Push connected" : "Polling fallback"} · last update {timeStr}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <LiveIndicator />
          <button data-testid="share-catalog-button" onClick={copyLink} className="inline-flex items-center gap-2 border border-[#0A0A0A] px-4 py-2 text-[11px] tracking-[0.25em] uppercase font-bold hover:bg-[#0A0A0A] hover:text-[#FDFDFD] transition-colors">
            <Copy className="w-3.5 h-3.5" /> Share
          </button>
          <Link to="/admin" data-testid="goto-admin-link" className="inline-flex items-center gap-1 text-[11px] tracking-[0.25em] uppercase font-bold border-b border-[#0A0A0A] hover:text-[#FF2A2A] hover:border-[#FF2A2A]">
            Admin <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <section className="border-b border-[#0A0A0A] px-6 lg:px-12 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 items-end relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 opacity-[0.04] pointer-events-none hidden lg:block">
          <LogoMark size={420} />
        </div>
        <div className="lg:col-span-2 relative">
          <p className="text-[10px] tracking-[0.3em] uppercase font-bold mb-6">№ 001 — Live Inventory</p>
          <h2 className="font-display text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.85]">
            Available<br /><span className="text-[#FF2A2A]">Now.</span>
          </h2>
        </div>
        <div className="flex flex-col gap-2 border-l-2 border-[#0A0A0A] pl-6 relative">
          <span className="text-[10px] tracking-[0.3em] uppercase font-bold">In Stock</span>
          <span data-testid="total-items-count" className="font-display text-7xl lg:text-8xl font-black tabular-nums leading-none">
            {String(filteredItems.length).padStart(2, "0")}
          </span>
          <span className="text-xs tracking-[0.2em] uppercase text-[#0A0A0A]/60">
            {filteredItems.length === items.length ? "Showing all" : `Filtered from ${items.length}`}
          </span>
        </div>
      </section>

      {/* Filters bar */}
      <section className="border-b border-[#0A0A0A] px-6 lg:px-12 py-4 flex items-center gap-3 flex-wrap" data-testid="filters-bar">
        <div className="relative flex-grow min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#0A0A0A]/40" />
          <input
            data-testid="filter-search"
            placeholder="Search by name or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border border-[#0A0A0A] pl-10 pr-3 py-2.5 text-sm outline-none focus:bg-[#F4F4F2]"
          />
        </div>
        <select data-testid="filter-category" value={category} onChange={(e) => setCategory(e.target.value)} className="bg-transparent border border-[#0A0A0A] py-2.5 px-3 text-[11px] uppercase tracking-wider font-bold">
          {dynamicCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select data-testid="filter-collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="bg-transparent border border-[#0A0A0A] py-2.5 px-3 text-[11px] uppercase tracking-wider font-bold">
          <option value="all">All Collections</option>
          {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select data-testid="filter-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent border border-[#0A0A0A] py-2.5 px-3 text-[11px] uppercase tracking-wider font-bold">
          {SORTS.map((s) => <option key={s.id} value={s.id}>Sort: {s.label}</option>)}
        </select>
      </section>

      <section data-testid="catalog-grid">
        {loading ? (
          <div className="p-20 text-center text-sm tracking-[0.25em] uppercase">Loading inventory…</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-20 lg:p-32 text-center border-b border-[#0A0A0A]">
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-[#0A0A0A]/60">No results</p>
            <h3 className="font-display text-4xl lg:text-5xl font-black uppercase mt-4">
              {items.length === 0 ? "Nothing in stock" : "No items match your filter"}
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-l border-t border-[#0A0A0A]">
            {filteredItems.map((item, idx) => (
              <ItemCard key={item.id} item={item} index={idx} backendUrl={BACKEND_URL} />
            ))}
          </div>
        )}
      </section>

      <footer className="px-6 lg:px-12 py-10 flex items-center justify-between gap-4 flex-wrap border-t border-[#0A0A0A]/10">
        <Logo size={36} tagline="Premium textiles · Live shared catalog" />
        <p className="font-mono-px text-[10px] tracking-widest text-[#0A0A0A]/50">v2.1</p>
      </footer>
    </div>
  );
}
