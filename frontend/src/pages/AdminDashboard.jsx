import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LiveIndicator } from "@/components/LiveIndicator";
import { Logo } from "@/components/Logo";
import { ItemForm } from "@/components/ItemForm";
import { toast } from "sonner";
import { Plus, LogOut, Pencil, Trash2, ExternalLink, X, Copy } from "lucide-react";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [itemsRes, colRes] = await Promise.all([
        api.get("/admin/items"),
        api.get("/collections").catch(() => ({ data: [] })),
      ]);
      setItems(itemsRes.data);
      setCollections(colRes.data || []);
    } catch (e) {
      if (e.response?.status === 401) navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async (name) => {
    try {
      const { data } = await api.post("/admin/collections", { name });
      setCollections((c) => [...c, data]);
      toast.success(`Collection "${data.name}" created`);
      return data;
    } catch (_) { toast.error("Failed to create collection"); return null; }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const soldOut = items.filter((i) => i.manual_sold_out || (i.stock || 0) <= 0).length;
    const available = total - soldOut;
    const totalStock = items.reduce((s, i) => s + (i.stock || 0), 0);
    return { total, available, soldOut, totalStock };
  }, [items]);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (item) => {
    setEditing(item);
    setShowForm(true);
  };

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/admin/items/${editing.id}`, payload);
        toast.success("Item updated");
      } else {
        await api.post("/admin/items", payload);
        toast.success("Item added — live now");
      }
      setShowForm(false);
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This is permanent.`)) return;
    try {
      await api.delete(`/admin/items/${item.id}`);
      toast.success("Item deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const toggleSoldOut = async (item) => {
    try {
      await api.patch(`/admin/items/${item.id}`, { manual_sold_out: !item.manual_sold_out });
      load();
    } catch (e) {
      toast.error("Failed to toggle");
    }
  };

  const copyShareLink = async () => {
    const url = `${window.location.origin}/`;
    await navigator.clipboard.writeText(url);
    toast.success("Public catalog link copied");
  };

  return (
    <div className="dark min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 lg:px-10 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Logo size={42} dark />
          <div className="hidden md:block pl-4 border-l border-white/10">
            <h1 className="font-display text-base font-black uppercase tracking-tight leading-none">
              Admin Console
            </h1>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/50 mt-1">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LiveIndicator dark label="SYNCED" />
          <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(window.location.origin + '/')}`} download="mohey-home-catalog-qr.png" target="_blank" rel="noreferrer" data-testid="admin-qr-download" className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/5">QR PNG</a>
          <button
            onClick={copyShareLink}
            data-testid="copy-public-link"
            className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/5"
          >
            <Copy className="w-3.5 h-3.5" /> Public Link
          </button>
          <Link
            to="/"
            target="_blank"
            data-testid="open-public-catalog"
            className="inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-white/5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View
          </Link>
          <button
            onClick={async () => { await logout(); navigate("/admin/login"); }}
            data-testid="admin-logout-button"
            className="inline-flex items-center gap-2 border border-[#FF2A2A]/50 text-[#FF2A2A] px-3 py-2 text-[10px] tracking-[0.25em] uppercase font-bold hover:bg-[#FF2A2A] hover:text-white"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border-b border-white/10">
        {[
          { label: "Total Items", value: stats.total, testId: "stat-total" },
          { label: "Available", value: stats.available, testId: "stat-available", accent: true },
          { label: "Sold Out", value: stats.soldOut, testId: "stat-sold-out", red: true },
          { label: "Total Stock", value: stats.totalStock, testId: "stat-stock" },
        ].map((s, i) => (
          <div
            key={s.label}
            data-testid={s.testId}
            className={`p-6 lg:p-8 ${i < 3 ? "border-r border-white/10" : ""} ${i % 2 === 0 ? "border-b lg:border-b-0 border-white/10" : ""}`}
          >
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-white/50 mb-3">{s.label}</p>
            <p className={`font-display text-5xl lg:text-6xl font-black tabular-nums leading-none ${s.red ? "text-[#FF2A2A]" : ""}`}>
              {String(s.value).padStart(2, "0")}
            </p>
          </div>
        ))}
      </section>

      {/* Add button row */}
      <div className="px-6 lg:px-10 py-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-black uppercase tracking-tighter">Inventory</h2>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/50 mt-1">
            Changes appear on the public catalog within 3 seconds
          </p>
        </div>
        <button
          data-testid="add-item-button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-white text-[#0A0A0A] px-5 py-3 uppercase tracking-[0.25em] text-[11px] font-bold hover:bg-[#FF2A2A] hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Items table */}
      <section className="px-6 lg:px-10 pb-12">
        {loading ? (
          <div className="text-center py-20 text-sm tracking-[0.25em] uppercase text-white/50">Loading…</div>
        ) : items.length === 0 ? (
          <div className="border border-white/10 p-16 text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-white/50">Empty</p>
            <h3 className="font-display text-3xl uppercase font-black mt-3">No items yet</h3>
            <p className="text-white/60 text-sm mt-2">Add your first item to populate the live catalog.</p>
          </div>
        ) : (
          <div className="border border-white/10 overflow-x-auto" data-testid="admin-items-table">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] tracking-[0.25em] uppercase text-white/50">
                  <th className="text-left px-4 py-3 font-bold">Item</th>
                  <th className="text-right px-4 py-3 font-bold">Price</th>
                  <th className="text-right px-4 py-3 font-bold">Stock</th>
                  <th className="text-center px-4 py-3 font-bold">Status</th>
                  <th className="text-right px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const soldOut = item.manual_sold_out || (item.stock || 0) <= 0;
                  return (
                    <tr key={item.id} data-testid={`admin-row-${item.id}`} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 bg-white/5 border border-white/10 overflow-hidden shrink-0">
                            {item.image_url && (
                              <img src={item.image_url} alt="" className="w-full h-full object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                            )}
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-px tabular-nums">₹{Number(item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-mono-px tabular-nums">{item.stock}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleSoldOut(item)}
                          data-testid={`toggle-sold-out-${item.id}`}
                          className={`px-3 py-1 text-[10px] tracking-[0.2em] uppercase font-bold border transition-colors ${
                            soldOut
                              ? "border-[#FF2A2A] bg-[#FF2A2A] text-white"
                              : "border-white/20 text-white/70 hover:border-white"
                          }`}
                        >
                          {soldOut ? "Sold Out" : "Available"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            data-testid={`edit-item-${item.id}`}
                            className="p-2 border border-white/20 hover:bg-white/5"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            data-testid={`delete-item-${item.id}`}
                            className="p-2 border border-[#FF2A2A]/40 text-[#FF2A2A] hover:bg-[#FF2A2A] hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Drawer / Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-stretch justify-end"
          onClick={() => setShowForm(false)}
          data-testid="item-form-modal"
        >
          <div
            className="bg-[#0A0A0A] border-l border-white/10 w-full max-w-md h-full overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-2xl font-black uppercase tracking-tighter">
                {editing ? "Edit Item" : "New Item"}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 border border-white/20 hover:bg-white/5" data-testid="close-form-button">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ItemForm
              initial={editing}
              onCancel={() => setShowForm(false)}
              onSubmit={submit}
              submitting={submitting}
              collections={collections}
              onCollectionCreate={createCollection}
            />
          </div>
        </div>
      )}
    </div>
  );
}
