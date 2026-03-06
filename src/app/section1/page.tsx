"use client";

import { useEffect, useState } from "react";
import { useLangStore } from "@/stores/langStore";
import { getRuntimePath } from "@/lib/getRuntimePath";
import { scormLink } from "@/lib/scormLink";

export default function Section1() {
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

            <a href={scormLink("summary", route)} className="rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700">
                {i18nR(route, "s1_b1")}
            </a>
        </main>
    );
}
