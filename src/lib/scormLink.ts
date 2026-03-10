/**
 * In the exported SCORM package each page becomes a folder with
 * an index.html file, and nested pages must navigate using
 * relative paths because the course runs inside an LMS iframe.
 */
export function scormLink(target: string, route: string) {
    const clean = target.replace(/^\/+/, "").replace(/\/+$/, "");

    if (process.env.NODE_ENV === "development") {
        return `/${clean}`;
    }

    if (route === "/") {
        return `${clean}/index.html`;
    }

    return `../${clean}/index.html`;
}
