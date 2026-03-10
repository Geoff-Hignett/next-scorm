/**
 * Normalises a Next.js pathname to a course route used by the SCORM runtime.
 *
 * This strips nested paths and ensures the result matches the keys
 * used in COURSE_ROUTE_ORDER for progress tracking and bookmarking.
 */
export function getCoursePath(pathname: string) {
    const match = pathname.match(/\/(section1|summary)\/?$/);
    return match ? `/${match[1]}` : "/";
}
