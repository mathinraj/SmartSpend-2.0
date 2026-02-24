import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';

const LAST_NOTIF_KEY = 'spendimeter_last_reminder';

export function useReminder() {
  const { state } = useApp();
  const { settings } = state;
  const intervalRef = useRef(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
  }, []);

  const sendNotification = useCallback(() => {
    if (Notification.permission !== 'granted') return;
    try {
      new Notification('Spendimeter Reminder', {
        body: "Don't forget to log your expenses today!",
        icon: '💰',
        tag: 'spendimeter-reminder',
      });
    } catch {
      // Notification constructor can fail on some mobile browsers
    }
  }, []);

  useEffect(() => {
    if (!settings.reminderEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const checkReminder = () => {
      const now = new Date();
      const [hours, minutes] = (settings.reminderTime || '20:00').split(':').map(Number);

      if (settings.reminderFrequency === 'weekly') {
        const reminderDay = settings.reminderDay ?? 0;
        if (now.getDay() !== reminderDay) return;
      }

      if (now.getHours() === hours && now.getMinutes() === minutes) {
        const dateKey = settings.reminderFrequency === 'weekly'
          ? `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
          : now.toDateString();
        const lastNotif = localStorage.getItem(LAST_NOTIF_KEY);
        if (lastNotif === dateKey) return;
        localStorage.setItem(LAST_NOTIF_KEY, dateKey);
        sendNotification();
      }
    };

    intervalRef.current = setInterval(checkReminder, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [settings.reminderEnabled, settings.reminderTime, settings.reminderFrequency, settings.reminderDay, sendNotification]);

  return { requestPermission };
}
