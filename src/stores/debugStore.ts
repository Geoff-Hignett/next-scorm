import { create } from "zustand";

export type DebugLevel = "info" | "warn" | "error";
export type DebugSource = "scorm" | "lang" | "system";

export type DebugEvent = {
    id: string;
    timestamp: number;
    level: DebugLevel;
    source: DebugSource;
    message: string;
    payload?: unknown;
};

type DebugState = {
    enabled: boolean;
    visible: boolean;
    events: DebugEvent[];

    log: (event: Omit<DebugEvent, "id" | "timestamp">) => void;
    clear: () => void;
    toggleVisible: () => void;
    setVisible: (visible: boolean) => void;
};

export const useDebugStore = create<DebugState>((set, get) => ({
    enabled: false,
    visible: false,
    events: [],

    log: (event) => {
        if (!get().enabled) return;

        set((state) => ({
            events: [
                ...state.events,
                {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    ...event,
                },
            ],
        }));
    },

    clear: () => set({ events: [] }),
    toggleVisible: () => set((state) => ({ visible: !state.visible })),
    setVisible: (visible) => set({ visible }),
}));
