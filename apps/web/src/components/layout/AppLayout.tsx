import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.ts';
import { Sidebar } from './Sidebar.tsx';
import { ToastContainer } from '../ui/Toast.tsx';
import { useSocket } from '../../hooks/useSocket.ts';
import { useEffect, useState } from 'react';
import { instancesService } from '../../services/instances.service.ts';
import { useInstanceStore } from '../../stores/instanceStore.ts';
import { authService } from '../../services/auth.service.ts';

export function AppLayout() {
  const { isAuthenticated, logout, login } = useAuthStore();
  const { setInstances } = useInstanceStore();
  const [isVerifying, setIsVerifying] = useState(true);
  useSocket();

  // On mount: verify the access token is still valid.
  // If expired, try refresh. If refresh also fails, logout → redirect to /.
  // This prevents the infinite loop where zustand says "authenticated" but the
  // token is actually expired or missing.
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        logout();
        setIsVerifying(false);
        return;
      }
      try {
        const user = await authService.getMe();
        if (!cancelled) {
          login(user, token);
          setIsVerifying(false);
        }
      } catch {
        // getMe failed — token expired; axios interceptor will try refresh.
        // If refresh also fails, axios interceptor calls logout() + hard redirect.
        // We just need to wait a tick for that to happen.
        if (!cancelled) setIsVerifying(false);
      }
    };

    if (isAuthenticated) {
      void verify();
    } else {
      setIsVerifying(false);
    }

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  useEffect(() => {
    if (isAuthenticated && !isVerifying) {
      instancesService.list().then(setInstances).catch(console.error);
    }
  }, [isAuthenticated, isVerifying, setInstances]);

  // While verifying token, show a minimal loading screen instead of redirecting.
  // This prevents the loop where a brief isAuthenticated=false flicker causes
  // Navigate to kick in before the token verification finishes.
  if (isVerifying) {
    return (
      <div className="flex h-screen bg-bg-primary items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <div className="relative flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
}
