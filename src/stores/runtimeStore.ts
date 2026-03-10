/**
 * Runtime Store
 *
 * Holds global runtime flags used by the course shell UI.
 * This includes development/debug state that may be controlled
 * via environment variables, query parameters, or LMS settings.
 */

import { create } from "zustand";

type RuntimeState = {
    isDevMode: boolean;
    isDebugVisible: boolean;
    toggleDebug: () => void;
};

export const useRuntimeStore = create<RuntimeState>((set) => ({
    // This can be driven by env, query param, or LMS flag
    isDevMode: process.env.NODE_ENV !== "production",
    isDebugVisible: false,

    toggleDebug: () => set((state) => ({ isDebugVisible: !state.isDebugVisible })),
}));
