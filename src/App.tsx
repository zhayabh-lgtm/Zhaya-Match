import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfigDraftProvider } from './context/ConfigDraftContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';
import { TiposEMedidas } from './pages/admin/TiposEMedidas';
import { Aparencia } from './pages/admin/Aparencia';
import { TextosEImagens } from './pages/admin/TextosEImagens';
import { Visualizacao } from './pages/admin/Visualizacao';
import { Configuracoes } from './pages/admin/Configuracoes';
import { Preview } from './pages/Preview';

export default function App() {
  return (
    <AuthProvider>
      <ConfigDraftProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public Store Preview Route */}
            <Route path="/preview" element={<Preview />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admin/tipos-medidas"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <TiposEMedidas />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/aparencia"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Aparencia />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/textos-imagens"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <TextosEImagens />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/visualizacao"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Visualizacao />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <ProtectedRoute>
                  <AdminLayout>
                    <Configuracoes />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Root and Fallback redirects to Admin */}
            <Route path="/admin" element={<Navigate to="/admin/tipos-medidas" replace />} />
            <Route path="/" element={<Navigate to="/admin/tipos-medidas" replace />} />
            <Route path="*" element={<Navigate to="/admin/tipos-medidas" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigDraftProvider>
    </AuthProvider>
  );
}
