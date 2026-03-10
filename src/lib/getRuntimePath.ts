/**
 * Returns the current course route during runtime.
 * The returned path is normalised to match COURSE_ROUTE_ORDER keys
 * used for progress tracking and bookmarking.
 */
export function getRuntimePath() {
    if (typeof window === "undefined") return "/";

    const path = window.location.pathname;

    if (path.includes("section1")) return "/section1";
    if (path.includes("summary")) return "/summary";

    return "/";
}
