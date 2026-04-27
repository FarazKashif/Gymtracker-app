import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Active session state
  activeSessionId: null,
  activeTemplateId: null,
  setActiveSession: (sessionId, templateId) =>
    set({ activeSessionId: sessionId, activeTemplateId: templateId }),
  clearActiveSession: () =>
    set({ activeSessionId: null, activeTemplateId: null }),

  // Progression confirmations pending
  pendingProgressions: [], // [{ exerciseId, exerciseName, currentWeight, newWeight, reps }]
  setPendingProgressions: (items) => set({ pendingProgressions: items }),
  clearPendingProgressions: () => set({ pendingProgressions: [] }),

  // Global notification
  notification: null, // { message, type: 'success'|'info'|'warning' }
  setNotification: (notification) => {
    set({ notification });
    if (notification) setTimeout(() => set({ notification: null }), 3500);
  },
}));
