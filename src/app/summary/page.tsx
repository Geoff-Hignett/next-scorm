"use client";

import { useEffect, useState } from "react";
import { useLangStore } from "@/stores/langStore";
import { getRuntimePath } from "@/lib/getRuntimePath";

export default function Summary() {
    const { i18nR } = useLangStore();
    const [route, setRoute] = useState<string | null>(null);

    useEffect(() => {
        setRoute(getRuntimePath());
    }, []);

    if (!route) return null;

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50">
            <h1 className="text-7xl font-bold">{i18nR(route, "s1_h1")}</h1>

            <p className="text-gray-700">{i18nR(route, "s1_p1")}</p>
        </main>
    );
}
