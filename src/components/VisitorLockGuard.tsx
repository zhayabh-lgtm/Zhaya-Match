import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const VISITOR_LOCK_STORAGE_KEY = 'zhaya_live_visitor_slug';

interface VisitorLockGuardProps {
  children: React.ReactNode;
}

/**
 * Guard that enforces the visitor lockdown policy:
 * If an unauthenticated user visited a public live invite (/live/:slug),
 * any internal navigation attempt to admin/login/preview/root routes
 * will bounce them back to their live invite page, preventing unauthorized discovery.
 *
 * If a valid authenticated user (e.g. admin) is logged in, this lockdown is bypassed and cleared.
 */
export const VisitorLockGuard: React.FC<VisitorLockGuardProps> = ({ children }) => {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  // If user is authenticated, clear any visitor lock so they have unrestricted access
  useEffect(() => {
    if (!loading && (user || session)) {
      try {
        sessionStorage.removeItem(VISITOR_LOCK_STORAGE_KEY);
      } catch {
        // Ignore session storage errors
      }
    }
  }, [user, session, loading]);

  if (loading) {
    return <>{children}</>;
  }

  // If user is authenticated, bypass lock completely
  if (user || session) {
    return <>{children}</>;
  }

  // If user is NOT authenticated, check if they have a visitor lockdown active
  try {
    const lockedSlug = sessionStorage.getItem(VISITOR_LOCK_STORAGE_KEY);
    if (lockedSlug && typeof lockedSlug === 'string' && lockedSlug.trim()) {
      const cleanSlug = lockedSlug.trim();
      const currentPath = location.pathname;

      // Only redirect if they are trying to access a non-live route
      if (!currentPath.startsWith(`/live/${cleanSlug}`)) {
        return <Navigate to={`/live/${cleanSlug}`} replace />;
      }
    }
  } catch {
    // Fallback if sessionStorage is not accessible
  }

  return <>{children}</>;
};
