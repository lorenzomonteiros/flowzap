import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.ts';
import { Sidebar } from './Sidebar.tsx';
import { ToastContainer } from '../ui/Toast.tsx';
import { useSocket } from '../../hooks/useSocket.ts';
import { useEffect } from 'react';
import { instancesService } from '../../services/instances.service.ts';
import { useInstanceStore } from '../../stores/instanceStore.ts';

export function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  const { setInstances } = useInstanceStore();
  useSocket();

  useEffect(() => {
    if (isAuthenticated) {
      instancesService.list().then(setInstances).catch(console.error);
    }
  }, [isAuthenticated, setInstances]);

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
