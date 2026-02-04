"use client";

// Inspired by react-hot-toast library
import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 1000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  duration?: number; // ms
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type Action =
  | { type: typeof actionTypes.ADD_TOAST; toast: ToasterToast }
  | { type: typeof actionTypes.UPDATE_TOAST; toast: Partial<ToasterToast> & { id: string } }
  | { type: typeof actionTypes.DISMISS_TOAST; toastId?: string }
  | { type: typeof actionTypes.REMOVE_TOAST; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

const removeQueue = new Map<string, ReturnType<typeof setTimeout>>();
const dismissQueue = new Map<string, ReturnType<typeof setTimeout>>();

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function addToRemoveQueue(toastId: string) {
  if (removeQueue.has(toastId)) return;

  const timeout = setTimeout(() => {
    removeQueue.delete(toastId);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
  }, TOAST_REMOVE_DELAY);

  removeQueue.set(toastId, timeout);
}

function clearDismissTimer(toastId: string) {
  const t = dismissQueue.get(toastId);
  if (t) {
    clearTimeout(t);
    dismissQueue.delete(toastId);
  }
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    case actionTypes.DISMISS_TOAST: {
      const toastId = action.toastId;

      if (toastId) addToRemoveQueue(toastId);
      else state.toasts.forEach((t) => addToRemoveQueue(t.id));

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          toastId === undefined || t.id === toastId ? { ...t, open: false } : t
        ),
      };
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.toastId) };

    default:
      return state;
  }
};

function dispatch(action: Action) {
  // Limpia timers en remove/dismiss
  if (action.type === actionTypes.DISMISS_TOAST && action.toastId) {
    clearDismissTimer(action.toastId);
  }
  if (action.type === actionTypes.REMOVE_TOAST && action.toastId) {
    clearDismissTimer(action.toastId);
    const r = removeQueue.get(action.toastId);
    if (r) {
      clearTimeout(r);
      removeQueue.delete(action.toastId);
    }
  }

  memoryState = reducer(memoryState, action);
  listeners.forEach((l) => l(memoryState));
}

type Toast = Omit<ToasterToast, "id">;

function toast(props: Toast) {
  const id = genId();
  const duration = props.duration ?? 3500;

  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });
  const update = (next: Partial<ToasterToast>) =>
    dispatch({ type: actionTypes.UPDATE_TOAST, toast: { ...next, id } });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss (si duration no es Infinity y es > 0)
  if (Number.isFinite(duration) && duration > 0) {
    clearDismissTimer(id);
    dismissQueue.set(id, setTimeout(dismiss, duration));
  }

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };