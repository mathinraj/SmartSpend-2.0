'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';

const LAST_NOTIF_PREFIX = 'spendimeter_reminder_';

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

  const sendNotification = useCallback((message, tag) => {
    if (Notification.permission !== 'granted') return;
    try {
      new Notification('Spendimeter Reminder', {
        body: message || "Don't forget to log your expenses today!",
        icon: '💰',
        tag: tag || 'spendimeter-reminder',
      });
    } catch {
      // Notification constructor can fail on some mobile browsers
    }
  }, []);

  useEffect(() => {
    const reminders = settings.reminders || [];
    const hasAnyEnabled = reminders.some((r) => r.enabled);

    if (!hasAnyEnabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const isDndActive = () => {
      if (!settings.dndEnabled) return false;
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = (settings.dndStart || '23:00').split(':').map(Number);
      const [endH, endM] = (settings.dndEnd || '07:00').split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (startMins <= endMins) {
        return nowMins >= startMins && nowMins < endMins;
      }
      return nowMins >= startMins || nowMins < endMins;
    };

    const checkReminders = () => {
      if (isDndActive()) return;
      const now = new Date();

      reminders.forEach((reminder) => {
        if (!reminder.enabled) return;

        const [hours, minutes] = (reminder.time || '20:00').split(':').map(Number);

        if (reminder.frequency === 'weekly') {
          const reminderDay = reminder.day ?? 0;
          if (now.getDay() !== reminderDay) return;
        }

        if (reminder.frequency === 'interval') {
          const intervalMins = reminder.intervalMinutes || 60;
          const storageKey = `${LAST_NOTIF_PREFIX}${reminder.id}_last`;
          const lastSent = localStorage.getItem(storageKey);
          const lastTime = lastSent ? parseInt(lastSent, 10) : 0;
          if (Date.now() - lastTime >= intervalMins * 60 * 1000) {
            localStorage.setItem(storageKey, Date.now().toString());
            sendNotification(reminder.message, `reminder-${reminder.id}`);
          }
          return;
        }

        if (now.getHours() === hours && now.getMinutes() === minutes) {
          const dateKey = reminder.frequency === 'weekly'
            ? `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
            : now.toDateString();
          const storageKey = `${LAST_NOTIF_PREFIX}${reminder.id}`;
          const lastNotif = localStorage.getItem(storageKey);
          if (lastNotif === dateKey) return;
          localStorage.setItem(storageKey, dateKey);
          sendNotification(reminder.message, `reminder-${reminder.id}`);
        }
      });
    };

    intervalRef.current = setInterval(checkReminders, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [settings.reminders, settings.dndEnabled, settings.dndStart, settings.dndEnd, sendNotification]);

  return { requestPermission };
}
