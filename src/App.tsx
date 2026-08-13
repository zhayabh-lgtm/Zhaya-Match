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
import { ConviteLive } from './pages/admin/ConviteLive';
import { Configuracoes } from './pages/admin/Configuracoes';
import { Preview } from './pages/Preview';
import { LiveInvitePage } from './pages/public/LiveInvitePage';

export default function App() {
  return (
    <AuthProvider>
      <ConfigDraftProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Fully Isolated Public Live Invite Route (No AdminLayout, No Zhaya Match chrome) */}
            <Route path="/live/:slug" element={<LiveInvitePage />} />

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
            <Route
              path="/admin/convite-live"
              element={
                <VisitorLockGuard>
                  <ProtectedRoute>
                    <AdminLayout>
                      <ConviteLive />
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

            {/* Root and Fallback redirects to Admin (Protected by VisitorLockGuard) */}
            <Route
              path="/admin"
              element={
                <VisitorLockGuard>
                  <Navigate to="/admin/tipos-medidas" replace />
                </VisitorLockGuard>
              }
            />
            <Route
              path="/"
              element={
                <VisitorLockGuard>
                  <Navigate to="/admin/tipos-medidas" replace />
                </VisitorLockGuard>
              }
            />
            <Route
              path="*"
              element={
                <VisitorLockGuard>
                  <Navigate to="/admin/tipos-medidas" replace />
                </VisitorLockGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </ConfigDraftProvider>
    </AuthProvider>
  );
}
