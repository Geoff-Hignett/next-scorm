/**
 * Defines the linear order of course routes.
 *
 * Used by the SCORM runtime to:
 * - determine learner progress
 * - calculate completion
 * - store resume location
 *
 * Keys are route paths and values represent their position
 * in the course sequence.
 */
export const COURSE_ROUTE_ORDER: Record<string, number> = {
    "/": 0,
    "/section1/": 1,
    "/summary/": 2,
};
