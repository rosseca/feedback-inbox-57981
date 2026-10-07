'use client';

import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (variant: ToastVariant, message: string) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (variant, message) => {
    const id = Date.now() + Math.random();
    set((state) => ({ toasts: [...state.toasts, { id, variant, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function toast(variant: ToastVariant, message: string) {
  useToastStore.getState().push(variant, message);
}
