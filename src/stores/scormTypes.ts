import { ScormInitResult } from "@/types/scorm";
import type { ScormRuntimeAPI } from "@/types/scormApi";

export type ScormState = {
    API: ScormRuntimeAPI;
    version: string;
    scormAPIConnected: boolean;
    scormConnectRun: number;
    scormInited: ScormInitResult;
    suspendData: string | null;
    location: number | null;
    scoreRaw: number | null;
    scoreMin: number | null;
    scoreMax: number | null;
    completionStatus: string | null;
    successStatus: string | null;
    resumeAvailable: boolean;
    resumeDecisionMade: boolean;
    attemptedInitialConnect: boolean;

    // Actions
    scormConnect: () => void;
    scormlogNotConnected: () => void;
    scormGetLocation: () => number;
    scormGetSuspendData: () => SuspendPayload | null;
    scormSetSuspendData: (partial: Partial<SuspendPayload>) => void;
    scormGetScore: () => number | null;
    scormGetStudentName: () => string | null | undefined;
    scormGetStudentID: () => string | null | undefined;
    scormSetComplete: () => void;
    scormSetLocation: (location: number) => void;
    scormSetScore: (score: number) => void;
    scormReconnect: () => void;
    scormTerminate: () => void;
    hydrateFromPersistence: () => void;
    updateLocationIfAdvanced: (location: number) => void;
    resumeCourse: () => void;
    restartCourse: () => void;
};

export type SuspendPayload = {
    v: 1;
    location?: number;
    lang?: string;
    [key: string]: unknown;
};
