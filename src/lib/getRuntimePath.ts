export function getRuntimePath() {
    if (typeof window === "undefined") return "/";

    const path = window.location.pathname;

    if (path.includes("section1")) return "/section1";
    if (path.includes("summary")) return "/summary";

    return "/";
}
