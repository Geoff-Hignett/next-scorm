import { useDebugStore } from "@/stores/debugStore";
import type { DebugLevel, DebugSource } from "@/stores/debugStore";

/**
 * Lightweight debug logger used by stores and services.
 * Safe to call anywhere. No-op when debug is disabled.
 */
export function debugLog(level: DebugLevel, source: DebugSource, message: string, payload?: unknown) {
    console.log("[DEBUG LOGGER CALLED]", level, source, message, payload);

    const store = useDebugStore.getState();

    console.log("[DEBUG STORE STATE]", store);

    if (!store.enabled) {
        console.log("[DEBUG LOGGER BLOCKED - disabled]");
        return;
    }

    store.log({
        level,
        source,
        message,
        payload,
    });
}
