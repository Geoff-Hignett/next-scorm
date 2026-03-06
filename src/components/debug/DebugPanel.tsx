"use client";

import React, { useEffect, useRef } from "react";
import { useDebugStore } from "@/stores/debugStore";
import { useScormStore } from "@/stores/scormStore";
import { isDebugEnabled } from "@/lib/infra/env";
import { decodeSuspendData } from "@/lib/scorm/suspendDataCodec";

function Row({ label, value, source }: { label: string; value: React.ReactNode; source?: "LMS" | "Local" }) {
    return (
        <div className="grid grid-cols-2 gap-2 py-0.5">
            <span className="text-gray-500">{label}</span>
            <span className="font-mono text-gray-900">
                {value ?? "—"}
                {source && <span className="ml-2 text-xs text-gray-500">({source})</span>}
            </span>
        </div>
    );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="px-3 py-1.5 rounded bg-gray-800 text-white text-xs hover:bg-gray-700">
            {label}
        </button>
    );
}

function SuspendDataView({ data }: { data: string | null | undefined }) {
    if (!data) {
        return <div className="text-xs text-gray-400 mt-1">—</div>;
    }

    let decoded: unknown;
    let parseError = false;

    try {
        decoded = decodeSuspendData(data);
    } catch {
        parseError = true;
    }

    return (
        <div className="mt-2 space-y-2 flex gap-5">
            <div>
                <div className="text-xs text-gray-500 mb-1">Decoded</div>
                <pre className="rounded bg-gray-100 p-2 text-xs">{parseError ? "Decode failed" : JSON.stringify(decoded, null, 2)}</pre>
            </div>

            <div>
                <div className="text-xs text-gray-500 mb-1">Raw</div>
                <pre className="rounded bg-gray-50 p-2 text-xs font-mono text-gray-600">{data}</pre>
            </div>
        </div>
    );
}

export default function DebugPanel() {
    const { enabled, visible, events, clear } = useDebugStore();
    const scorm = useScormStore();
    const logRef = useRef<HTMLDivElement | null>(null);

    console.log("DEBUG PANEL STATE", {
        enabled,
        visible,
    });

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [events]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const enabled = process.env.NODE_ENV === "development" || params.get("debug") === "true";

        useDebugStore.setState({ enabled });
    }, []);

    if (!enabled || !visible) return null;

    const source: "LMS" | "Local" = scorm.scormAPIConnected ? "LMS" : "Local";
    const scoreDisplay = scorm.scoreRaw !== null && scorm.scoreRaw !== undefined ? `${scorm.scoreRaw} / ${scorm.scoreMax ?? 100}` : "—";

    return (
        <div className="fixed inset-4 z-[9998] bg-white rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <header className="flex justify-between px-4 py-2 bg-gray-900 text-white">
                <span className="font-semibold">Debug Panel (SCORM {scorm.version || "standalone"})</span>
                <button onClick={clear} className="text-sm underline">
                    Clear logs
                </button>
            </header>

            {/* Persistence snapshot */}
            <section className="px-4 py-3 border-b text-sm">
                <h3 className="font-semibold mb-2">Persistence</h3>

                <Row label="Active target" value={source === "LMS" ? "LMS (SCORM)" : "LocalStorage"} />

                <div className="py-0.5">
                    <div className="grid grid-cols-2 gap-2">
                        <span className="text-gray-500">Suspend data</span>
                        <span className="font-mono text-gray-900">
                            {scorm.suspendData ? `${scorm.suspendData.length} chars` : "—"}
                            <span className="ml-2 text-xs text-gray-500">({source})</span>
                        </span>
                    </div>

                    <SuspendDataView data={scorm.suspendData} />
                </div>

                <Row label="Location" value={scorm.location ?? "—"} source={source} />

                <Row label="Score" value={scoreDisplay} source={source} />

                <Row label="Completion" value={scorm.completionStatus ?? "—"} source={source} />

                {scorm.version !== "1.2" && <Row label="Success" value={scorm.successStatus ?? "—"} source={source} />}
            </section>

            {/* Actions */}
            <section className="px-4 py-3 border-b text-sm">
                <h3 className="font-semibold mb-2">SCORM Actions</h3>

                <div className="space-y-3">
                    {/* Progress */}
                    <div>
                        <div className="text-gray-500 text-xs mb-1">Progress</div>

                        <div className="flex flex-wrap gap-2">
                            <ActionButton
                                label="Set suspend data → {foo:'bar'}"
                                onClick={() =>
                                    scorm.scormSetSuspendData({
                                        foo: "bar",
                                    })
                                }
                            />

                            <ActionButton label="Set location → 1" onClick={() => scorm.scormSetLocation(1)} />

                            <ActionButton label="Set score → 50" onClick={() => scorm.scormSetScore(50)} />

                            <ActionButton label="Mark complete" onClick={scorm.scormSetComplete} />
                        </div>
                    </div>

                    {/* Lifecycle */}
                    <div>
                        <div className="text-gray-500 text-xs mb-1">Lifecycle</div>

                        <div className="flex flex-wrap gap-2">
                            <ActionButton label="Reconnect" onClick={scorm.scormReconnect} />

                            <ActionButton label="Terminate" onClick={scorm.scormTerminate} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Logs */}
            <section ref={logRef} className="flex-1 overflow-auto px-4 py-2 font-mono text-xs bg-gray-50">
                {events.length === 0 ? (
                    <div className="text-gray-400">No logs yet</div>
                ) : (
                    events.map((event) => (
                        <div key={event.id} className="mb-2">
                            <div className={event.level === "error" ? "text-red-600" : event.level === "warn" ? "text-yellow-700" : "text-gray-800"}>
                                [{new Date(event.timestamp).toLocaleTimeString()}] {event.message}
                            </div>

                            {event.payload !== undefined && <pre className="ml-2 mt-1 text-gray-500">{JSON.stringify(event.payload, null, 2)}</pre>}
                        </div>
                    ))
                )}
            </section>
        </div>
    );
}
