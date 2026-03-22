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

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('status', (data: { instanceId: string; status: string; phoneNumber?: string }) => {
      updateInstance(data.instanceId, {
        status: data.status as WhatsAppInstanceStatus,
        ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
      });
    });

    return () => {
      socket.off('status');
    };
  }, [updateInstance]);

  const joinInstance = useCallback((instanceId: string) => {
    socketRef.current?.emit('join-instance', instanceId);
  }, []);

  const leaveInstance = useCallback((instanceId: string) => {
    socketRef.current?.emit('leave-instance', instanceId);
  }, []);

  const onQR = useCallback((callback: (data: { instanceId: string; qr: string }) => void) => {
    socketRef.current?.on('qr', callback);
    return () => {
      socketRef.current?.off('qr', callback);
    };
  }, []);

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
