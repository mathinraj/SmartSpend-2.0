'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';

const LAST_NOTIF_PREFIX = 'spendtraq_reminder_';

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

  const sendNotification = useCallback(async (message, tag) => {
    if (Notification.permission !== 'granted') return;
    const options = {
      body: message || "Don't forget to log your expenses today!",
      tag: tag || 'spendtraq-reminder',
    };
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('SpendTrak Reminder', options);
        return;
      }
    } catch { /* fall through */ }
    try {
      new Notification('SpendTrak Reminder', options);
    } catch { /* constructor can fail on some mobile browsers */ }
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

    checkReminders();
    intervalRef.current = setInterval(checkReminders, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [settings.reminders, settings.dndEnabled, settings.dndStart, settings.dndEnd, sendNotification]);

  useEffect(() => {
    if (!settings.plannedReminders) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const plannedPayments = state.plannedPayments || [];
    if (plannedPayments.length === 0) return;

    const PLANNED_NOTIF_KEY = 'spendtraq_planned_reminder_last';

    function checkPlannedDue() {
      const lastCheck = localStorage.getItem(PLANNED_NOTIF_KEY);
      const todayKey = new Date().toDateString();
      if (lastCheck === todayKey) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const due = plannedPayments.filter((p) => {
        if (!p.enabled) return false;
        const d = new Date(p.nextDate);
        d.setHours(0, 0, 0, 0);
        return d <= tomorrow;
      });

      if (due.length === 0) return;
      localStorage.setItem(PLANNED_NOTIF_KEY, todayKey);

      const overdue = due.filter((p) => new Date(p.nextDate) < today);
      const dueToday = due.filter((p) => { const d = new Date(p.nextDate); d.setHours(0,0,0,0); return d.getTime() === today.getTime(); });
      const dueTomorrow = due.filter((p) => { const d = new Date(p.nextDate); d.setHours(0,0,0,0); return d.getTime() === tomorrow.getTime(); });

      const parts = [];
      if (overdue.length) parts.push(`${overdue.length} overdue`);
      if (dueToday.length) parts.push(`${dueToday.length} due today`);
      if (dueTomorrow.length) parts.push(`${dueTomorrow.length} due tomorrow`);

      sendNotification(
        `You have ${parts.join(', ')}: ${due.slice(0, 3).map((p) => p.name).join(', ')}${due.length > 3 ? '...' : ''}`,
        'spendtrak-planned-due'
      );
    }

    const timer = setTimeout(checkPlannedDue, 8000);
    return () => clearTimeout(timer);
  }, [settings.plannedReminders, state.plannedPayments, sendNotification]);

  return { requestPermission };
}
