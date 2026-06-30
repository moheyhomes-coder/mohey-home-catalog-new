import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Catalog from "@/pages/Catalog";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import ItemDetail from "@/pages/ItemDetail";
import { Toaster } from "sonner";

function ProtectedAdmin({ children }) {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white grid place-items-center text-xs tracking-[0.3em] uppercase">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  useEffect(() => {
    document.title = "Mohey Home — Live Catalog";
  }, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" theme="light" />
        <Routes>
          <Route path="/" element={<Catalog />} />
          <Route path="/p/:id" element={<ItemDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdmin>
                <AdminDashboard />
              </ProtectedAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
