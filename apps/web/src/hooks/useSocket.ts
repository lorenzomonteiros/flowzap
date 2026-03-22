import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useInstanceStore } from '../stores/instanceStore.ts';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

let socketInstance: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { updateInstance } = useInstanceStore();

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
    }
    socketRef.current = socketInstance;

    const socket = socketRef.current;

    const handleConnect = () => {
      console.log('Socket connected:', socket.id);
    };
    const handleDisconnect = () => {
      console.log('Socket disconnected');
    };
    const handleStatus = (data: { instanceId: string; status: string; phoneNumber?: string }) => {
      updateInstance(data.instanceId, {
        status: data.status as WhatsAppInstanceStatus,
        ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('status', handleStatus);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('status', handleStatus);
    };
  }, [updateInstance]);

  const joinInstance = useCallback((instanceId: string) => {
    socketRef.current?.emit('join-instance', instanceId);
  }, []);

  const leaveInstance = useCallback((instanceId: string) => {
    socketRef.current?.emit('leave-instance', instanceId);
  }, []);

  const onQR = useCallback(
    (callback: (data: { instanceId: string; qr: string }) => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};

      const handler = (data: { instanceId: string; qr: string }) => {
        // Update store so card badge/button switches to QR state immediately
        updateInstance(data.instanceId, { status: 'qr' });
        callback(data);
      };

      socket.on('qr', handler);
      return () => {
        socket.off('qr', handler);
      };
    },
    [updateInstance]
  );

  const onMessage = useCallback(
    (callback: (data: { instanceId: string; from: string; content: string }) => void) => {
      socketRef.current?.on('message', callback);
      return () => {
        socketRef.current?.off('message', callback);
      };
    },
    []
  );

  return { socket: socketRef.current, joinInstance, leaveInstance, onQR, onMessage };
}

type WhatsAppInstanceStatus = 'disconnected' | 'connecting' | 'qr' | 'connected';
