import { useState, useEffect, useCallback } from 'react';
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from '../api/notifications';

interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  error: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!isSupported) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isLoading: false,
        }));
        return;
      }

      // Check current permission
      const permission = Notification.permission;

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          permission,
          error: null,
        });
      } catch (error) {
        setState({
          isSupported: true,
          isSubscribed: false,
          isLoading: false,
          permission,
          error: 'Failed to check subscription status',
        });
      }
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          permission,
          error: 'Notification permission denied',
        }));
        return false;
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Push notifications not configured on server',
        }));
        return false;
      }

      // Subscribe to push
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      // Send subscription to server
      await subscribeToPush(subscription);

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
      }));

      return true;
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      }));
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeFromPush();
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
