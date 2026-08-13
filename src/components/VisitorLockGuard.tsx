import React, { useEffect } from 'react';

export const VISITOR_LOCK_STORAGE_KEY = 'zhaya_live_visitor_slug';

interface VisitorLockGuardProps {
  children: React.ReactNode;
}

/**
 * Transparent guard that ensures no visitor lockdown is applied,
 * actively clearing any legacy lock flags so users can freely access the site.
 */
export const VisitorLockGuard: React.FC<VisitorLockGuardProps> = ({ children }) => {
  useEffect(() => {
    try {
      sessionStorage.removeItem(VISITOR_LOCK_STORAGE_KEY);
    } catch {
      // Ignore session storage errors
    }
  }, []);

  return <>{children}</>;
};

