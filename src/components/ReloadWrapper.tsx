import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ReloadWrapperProps {
  children: React.ReactNode;
}

const ReloadWrapper: React.FC<ReloadWrapperProps> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    const hasReloaded = sessionStorage.getItem(`reloaded-${location.pathname}`);

    if (!hasReloaded) {
      sessionStorage.setItem(`reloaded-${location.pathname}`, 'true');
      window.location.reload();
    }
  }, [location.pathname]);

  return <>{children}</>;
};

export default ReloadWrapper;
