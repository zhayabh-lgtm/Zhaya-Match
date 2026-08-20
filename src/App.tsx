import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfigDraftProvider } from './context/ConfigDraftContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { VisitorLockGuard } from './components/VisitorLockGuard';
import { AdminLayout } from './components/admin/AdminLayout';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { TiposEMedidas } from './pages/admin/TiposEMedidas';
import { Aparencia } from './pages/admin/Aparencia';
import { TextosEImagens } from './pages/admin/TextosEImagens';
import { Visualizacao } from './pages/admin/Visualizacao';
import { AnalyticsPage } from './pages/admin/Analytics';
import { MaisVendidos } from './pages/admin/MaisVendidos';
import { Configuracoes } from './pages/admin/Configuracoes';
import { ZhayaMatchHub } from './pages/admin/ZhayaMatchHub';
import { Biblioteca } from './pages/admin/Biblioteca';
import { Preview } from './pages/Preview';
import { MaisVendidosPage } from './pages/public/MaisVendidosPage';

export default function App() {
  return (
    <AuthProvider>
      <ConfigDraftProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Fully Isolated Public Routes (No AdminLayout, No Zhaya Match chrome) */}
            <Route path="/live/:slug" element={<Navigate to="/mais-vendidos" replace />} />
            <Route path="/mais-vendidos" element={<MaisVendidosPage />} />
            <Route path="/mais-vendidos/:slug" element={<MaisVendidosPage />} />

            {/* 2. Internal / App Routes protected by VisitorLockGuard */}
            <Route
              path="/login"
              element={
                <VisitorLockGuard>
                  <Login />
                </VisitorLockGuard>
              }
            />
            <Route
              path="/reset-password"
              element={
                <VisitorLockGuard>
                  <ResetPassword />
                </VisitorLockGuard>
              }
            />

            {/* Public Store Preview Route (Subject to Visitor Lockdown) */}
            <Route
              path="/preview"
              element={
                <VisitorLockGuard>
                  <Preview />
                </VisitorLockGuard>
              }
            />

            {/* Protected Admin Routes */}
            <Route
              path="/admin/zhaya-match"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <ZhayaMatchHub />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route
              path="/admin/tipos-medidas"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <TiposEMedidas />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route
              path="/admin/aparencia"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <Aparencia />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route
              path="/admin/textos-imagens"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <TextosEImagens />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route
              path="/admin/visualizacao"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <Visualizacao />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <AnalyticsPage />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route path="/admin/convite-live" element={<Navigate to="/admin/mais-vendidos" replace />} />
            <Route
              path="/admin/mais-vendidos"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <MaisVendidos />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <Configuracoes />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />
            <Route
              path="/admin/biblioteca"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <Biblioteca />
                    </AdminLayout>
                  </ProtectedRoute>
                </VisitorLockGuard>
              }
            />

            {/* Root and Fallback redirects to Admin (Protected by VisitorLockGuard) */}
            <Route
              path="/admin"
              element={
                <VisitorLockGuard>
                  <Navigate to="/admin/zhaya-match" replace />
                </VisitorLockGuard>
              }
            />
            <Route
              path="/"
              element={
                <VisitorLockGuard>
                  <Navigate to="/admin/zhaya-match" replace />
                </VisitorLockGuard>
              }
            />
            <Route
              path="*"
              element={
                <VisitorLockGuard>
                  <Navigate to="/admin/zhaya-match" replace />
                </VisitorLockGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </ConfigDraftProvider>
    </AuthProvider>
  );
}
