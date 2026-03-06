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
