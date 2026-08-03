import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-neutral-500 font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
