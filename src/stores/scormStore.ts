/**
 * ScormStore
 * ----------
 * Global state for SCORM runtime tracking.
 * - Manages connection to the SCORM API (SCORM 1.2 / 2004)
 * - Provides actions to set/get suspend data, score, location, objectives, and interactions
 * - Handles reconnection attempts and clean termination
 */

import { create } from "zustand";
import { scormAPI } from "@/lib/scormApi";
import type { ScormState, SuspendPayload } from "./scormTypes";
import { debugLog } from "@/lib/infra/debugLogger";

import { encodeSuspendData, decodeSuspendData } from "@/lib/scorm/suspendDataCodec";

// ---------- Store ----------
export const useScormStore = create<ScormState>((set, get) => ({
    API: scormAPI,
    version: "",
    scormAPIConnected: false,
    scormConnectRun: 0,
    scormInited: { success: false, version: "" },
    suspendData: null,
    location: null,
    scoreRaw: null,
    scoreMin: null,
    scoreMax: null,
    completionStatus: null,
    successStatus: null,
    resumeAvailable: false,
    resumeDecisionMade: false,
    attemptedInitialConnect: false,

    // ---------- Actions ----------
    scormConnect: () => {
        const state = get();

        if (state.attemptedInitialConnect) {
            debugLog("info", "scorm", "SCORM connect skipped (already attempted)");
            return;
        }

        set({ attemptedInitialConnect: true });

        debugLog("info", "scorm", "SCORM connect attempted");

        state.API.configure({ version: "1.2", debug: true });
        const result = state.API.initialize();

        set({
            scormInited: result,
            scormAPIConnected: result.success,
            version: result.version ?? "",
        });

        if (!result.success) {
            debugLog("warn", "scorm", "SCORM unavailable — running in standalone mode");
            return;
        }

        // Ensure course starts as incomplete unless already completed
        if (result.version === "1.2") {
            const status = state.API.get("cmi.core.lesson_status");

            if (!["completed", "passed"].includes((status || "").toLowerCase())) {
                state.API.set("cmi.core.lesson_status", "incomplete");
                state.API.commit();

                debugLog("info", "scorm", "Course marked incomplete on launch");
            }
        } else {
            const status = state.API.get("cmi.completion_status");

            if (status !== "completed") {
                state.API.set("cmi.completion_status", "incomplete");
                state.API.commit();

                debugLog("info", "scorm", "Course marked incomplete on launch");
            }
        }

        get().hydrateFromPersistence();
    },

    scormlogNotConnected: () => {
        console.warn("SCORM not connected");
        debugLog("warn", "scorm", "SCORM API not connected");
    },

    scormGetLocation: () => {
        const state = get();

        if (state.scormAPIConnected) {
            const raw = state.version === "1.2" ? state.API.get("cmi.core.lesson_location") : state.API.get("cmi.location");

            return parseInt(raw || "0", 10);
        }

        const fallback = localStorage.getItem("bookmark");
        return fallback ? parseInt(fallback, 10) : 0;
    },

    scormGetSuspendData: (): SuspendPayload | null => {
        const state = get();

        let raw: string | null = null;

        if (state.scormAPIConnected) {
            raw = state.API.get("cmi.suspend_data");
        } else {
            raw = localStorage.getItem("suspend_data");
        }

        if (!raw) return null;

        try {
            return decodeSuspendData(raw) as SuspendPayload;
        } catch {
            debugLog("error", "scorm", "Failed to decode suspend data");
            return null;
        }
    },

    scormSetSuspendData: (partial: Partial<SuspendPayload>) => {
        const state = get();

        debugLog("info", "scorm", "Updating suspend data", { partial });

        const existing = state.scormGetSuspendData();
        const { v: _ignored, ...existingWithoutV } = existing ?? {};

        const next: SuspendPayload = {
            v: 1,
            ...existingWithoutV,
            ...partial,
        };

        const encoded = encodeSuspendData(next);

        if (state.scormAPIConnected) {
            if (state.version === "1.2" && encoded.length > 4096) {
                throw new Error("Suspend Data length cannot exceed 4096 on SCORM 1.2");
            }

            state.API.set("cmi.suspend_data", encoded);
            state.API.commit();

            debugLog("info", "scorm", "Suspend data committed to LMS", {
                size: encoded.length,
            });
        } else {
            localStorage.setItem("suspend_data", encoded);

            debugLog("info", "scorm", "Suspend data saved locally", {
                size: encoded.length,
            });
        }

        set({ suspendData: encoded });
    },

    scormGetScore: () => {
        const state = get();
        if (!state.scormAPIConnected) {
            console.warn("SCORM not connected — cannot get score");
            debugLog("warn", "scorm", "Attempted getScore while SCORM disconnected");
            return null;
        }
        const scoreStr = state.version === "1.2" ? state.API.get("cmi.core.score.raw") : state.API.get("cmi.score.raw");
        if (!scoreStr) {
            console.warn("No score found in SCORM data");
            debugLog("warn", "scorm", "No SCORM score found");
            return null;
        }
        const score = Number(scoreStr);
        if (isNaN(score)) {
            console.warn("SCORM score is not a number:", scoreStr);
            debugLog("error", "scorm", "Invalid SCORM score value", {
                value: scoreStr,
            });
            debugLog("info", "scorm", "SCORM score retrieved", { score });
            return null;
        }
        return score;
    },

    scormGetStudentName: () => {
        const state = get();
        if (!state.scormAPIConnected) {
            console.log("attempting getStudentName but scorm not connected");
            debugLog("warn", "scorm", "Attempted getStudentName while SCORM disconnected");
            return;
        }
        const name = state.version === "1.2" ? state.API.get("cmi.core.student_name") : state.API.get("cmi.learner_name");
        console.log("Student Name:", name);
        debugLog("info", "scorm", "SCORM learner name retrieved", { name });
        return name;
    },

    scormGetStudentID: () => {
        const state = get();
        if (!state.scormAPIConnected) {
            console.log("attempting getStudentID but scorm not connected");
            debugLog("warn", "scorm", "Attempted getStudentID while SCORM disconnected");
            return;
        }
        const id = state.version === "1.2" ? state.API.get("cmi.core.student_id") : state.API.get("cmi.learner_id");
        console.log("Student ID:", id);
        debugLog("info", "scorm", "SCORM learner ID retrieved", { id });
        return id;
    },

    scormSetComplete: () => {
        const state = get();

        const completionObj = {
            completionStatus: "completed",
            successStatus: "passed",
        };

        debugLog("info", "scorm", "Marking course complete");

        if (state.scormAPIConnected) {
            if (state.version === "1.2") {
                state.API.set("cmi.core.lesson_status", "completed");
            } else {
                state.API.set("cmi.completion_status", "completed");
                state.API.set("cmi.success_status", "passed");
            }

            state.API.commit();

            debugLog("info", "scorm", "Completion committed to LMS", {
                version: state.version,
                completionStatus: completionObj.completionStatus,
            });
        } else {
            localStorage.setItem("completion", JSON.stringify(completionObj));

            debugLog("info", "scorm", "Completion saved locally", {
                completionStatus: completionObj.completionStatus,
            });
        }

        set({
            completionStatus: completionObj.completionStatus,
            successStatus: completionObj.successStatus,
        });
    },

    scormSetLocation: (location: number) => {
        const state = get();

        debugLog("info", "scorm", "Setting location", { location });

        if (state.scormAPIConnected) {
            if (state.version === "1.2") {
                state.API.set("cmi.core.lesson_location", location.toString());
            } else {
                state.API.set("cmi.location", location.toString());
            }

            state.API.commit();

            debugLog("info", "scorm", "Location committed to LMS", {
                location,
                version: state.version,
            });
        } else {
            localStorage.setItem("bookmark", location.toString());

            debugLog("info", "scorm", "Location saved locally", {
                location,
            });
        }

        // merge into suspend data
        state.scormSetSuspendData({ location });

        set({ location });
    },

    scormSetScore: (score: number) => {
        console.log("SCORM SET SCORE FUNCTION CALLED");
        const state = get();

        const scoreObj = {
            raw: score,
            min: 0,
            max: 100,
        };

        debugLog("info", "scorm", "Setting SCORM score", { score });

        if (state.scormAPIConnected) {
            if (state.version === "1.2") {
                state.API.set("cmi.core.score.min", "0");
                state.API.set("cmi.core.score.max", "100");
                state.API.set("cmi.core.score.raw", score.toString());
            } else {
                state.API.set("cmi.score.min", "0");
                state.API.set("cmi.score.max", "100");
                state.API.set("cmi.score.raw", score.toString());
            }

            state.API.commit();

            debugLog("info", "scorm", "Score committed to LMS", {
                score,
                version: state.version,
            });
        } else {
            localStorage.setItem("score", JSON.stringify(scoreObj));

            debugLog("info", "scorm", "Score saved locally", {
                score,
            });
        }

        set({
            scoreRaw: scoreObj.raw,
            scoreMin: scoreObj.min,
            scoreMax: scoreObj.max,
        });
    },

    hydrateFromPersistence: () => {
        const state = get();

        const suspend = state.scormGetSuspendData();

        let loc: number | null = null;

        // 1. SCORM lesson_location ALWAYS wins when connected
        if (state.scormAPIConnected) {
            const lmsLoc = state.scormGetLocation();
            if (typeof lmsLoc === "number" && lmsLoc > 0) {
                loc = lmsLoc;
            }
        }

        // 2. Then suspend data
        if (loc === null && typeof suspend?.location === "number") {
            loc = suspend.location;
        }

        // 3. Finally localStorage
        if (loc === null) {
            const bookmark = localStorage.getItem("bookmark");
            if (bookmark !== null) {
                const parsed = Number(bookmark);
                if (!Number.isNaN(parsed)) {
                    loc = parsed;
                }
            }
        }

        let scoreRaw: number | null = null;
        let scoreMin: number | null = null;
        let scoreMax: number | null = null;

        if (!state.scormAPIConnected) {
            const storedScore = localStorage.getItem("score");

            if (storedScore) {
                try {
                    const parsed = JSON.parse(storedScore);

                    scoreRaw = typeof parsed.raw === "number" ? parsed.raw : null;
                    scoreMin = typeof parsed.min === "number" ? parsed.min : null;
                    scoreMax = typeof parsed.max === "number" ? parsed.max : null;
                } catch {
                    debugLog("error", "scorm", "Failed to parse local score");
                }
            }
        }

        let completionStatus: string | null = null;
        let successStatus: string | null = null;

        if (!state.scormAPIConnected) {
            const storedCompletion = localStorage.getItem("completion");

            if (storedCompletion) {
                try {
                    const parsed = JSON.parse(storedCompletion);

                    completionStatus = typeof parsed.completionStatus === "string" ? parsed.completionStatus : null;

                    successStatus = typeof parsed.successStatus === "string" ? parsed.successStatus : null;
                } catch {
                    debugLog("error", "scorm", "Failed to parse local completion");
                }
            }
        }

        set({
            location: loc,
            resumeAvailable: typeof loc === "number" && loc > 0,
            resumeDecisionMade: false,
            suspendData: suspend ? encodeSuspendData(suspend) : null,
            scoreRaw,
            scoreMin,
            scoreMax,
            completionStatus,
            successStatus,
        });

        if (suspend?.lang) {
            import("@/stores/langStore").then(({ useLangStore }) => {
                useLangStore.getState().loadLang(suspend.lang, { persist: false });
            });
        }
    },

    scormReconnect: () => {
        const state = get();

        debugLog("info", "scorm", "Manual reconnect requested");

        state.API.configure({ version: "1.2", debug: true });

        const result = state.API.initialize();

        set({
            scormInited: result,
            scormAPIConnected: result.success,
            version: result.version ?? "",
        });

        if (!result.success) {
            debugLog("warn", "scorm", "Reconnect failed — still standalone mode");
            return;
        }

        debugLog("info", "scorm", "SCORM API connected via reconnect");

        get().hydrateFromPersistence();
    },

    scormTerminate: () => {
        const state = get();

        if (state.scormAPIConnected) {
            state.API.terminate();

            set({
                scormAPIConnected: false,
            });

            debugLog("info", "scorm", "SCORM session terminated");
        } else {
            debugLog("info", "scorm", "Terminate called in standalone mode");
        }
    },

    updateLocationIfAdvanced: (newLocation: number) => {
        const state = get();

        const current = state.scormGetLocation();

        if (newLocation > current) {
            state.scormSetLocation(newLocation);

            debugLog("info", "scorm", "Location advanced", {
                from: current,
                to: newLocation,
            });
        } else {
            debugLog("info", "scorm", "Location unchanged", {
                current,
                attempted: newLocation,
            });
        }
    },

    resumeCourse: () => {
        set({ resumeDecisionMade: true });

        debugLog("info", "scorm", "User chose to resume course");
    },

    restartCourse: () => {
        const state = get();

        if (state.scormAPIConnected) {
            if (state.version === "1.2") {
                state.API.set("cmi.core.lesson_location", "0");
                state.API.set("cmi.suspend_data", "");
                state.API.set("cmi.core.lesson_status", "incomplete");
            } else {
                state.API.set("cmi.location", "0");
                state.API.set("cmi.suspend_data", "");
                state.API.set("cmi.completion_status", "incomplete");
            }

            state.API.commit();
        }

        localStorage.removeItem("bookmark");
        localStorage.removeItem("suspend_data");
        localStorage.removeItem("score");
        localStorage.removeItem("completion");

        set({
            location: 0,
            suspendData: null,
            resumeAvailable: false,
            resumeDecisionMade: true,
            scoreRaw: null,
            scoreMin: null,
            scoreMax: null,
            completionStatus: null,
            successStatus: null,
        });

        debugLog("info", "scorm", "User restarted course");
    },
}));
