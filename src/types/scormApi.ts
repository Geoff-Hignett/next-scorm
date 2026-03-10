export type ScormRuntimeAPI = {
    configure: (options: { version?: "1.2" | "2004"; debug?: boolean }) => void;
    initialize: () => { success: boolean; version: string };
    get: (key: string) => string | null;
    set: (key: string, value: string) => void;
    commit: () => void;
    terminate: () => void;
};
