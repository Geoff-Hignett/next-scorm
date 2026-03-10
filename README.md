# NextScorm

A modern **Next.js + TypeScript SCORM course shell** with:

- SCORM 1.2 & 2004 runtime support
- Global SCORM lifecycle management (SPA-safe initialise / terminate)
- Robust suspend data & location persistence with LMS ↔ local fallback
- Environment-aware hydrated persistence (LMS ↔ localStorage)
- Route-based bookmarking with learner-controlled resume / restart flow
- Route and component-based internationalisation (i18n)
- Built-in SCORM debug tooling for development

---

## Demo

### Course lifecycle & resume flow

![Course resume flow](docs/demo/resume-flow.gif)

---

## Why NextScorm exists

Most SCORM content was designed for a pre-SPA web. As a result, many existing SCORM shells struggle with modern application concerns such as client-side routing, predictable state management, and clean separation of concerns.

NextScorm exists to bridge that gap.

It provides a **modern, opinionated course shell** that respects the constraints of SCORM and LMS platforms, while embracing contemporary frontend practices such as:

- explicit state ownership
- deterministic side effects
- configuration-driven behaviour
- SPA-safe lifecycle management

Rather than treating SCORM as an afterthought or a thin wrapper around legacy patterns, NextScorm treats the SCORM runtime as a **first-class global system**, with clear boundaries between learning logic, UI concerns, and persistence.

The goal is not to replace LMS platforms or hide SCORM’s limitations, but to make those constraints explicit and manageable - so developers can build reliable, testable learning experiences without fighting the runtime.

In short:  
NextScorm is designed to make **SCORM behave predictably in a modern web application**, without sacrificing LMS compatibility or learner experience.

## Using the course shell

### Development

Run the course locally without an LMS:

`npm install`

`npm run dev`

### Building the course

Create the static export used by the SCORM runtime:

`npm run build`

The build process:

1. Runs next build with static export enabled
2. Outputs the course to the out/ directory
3. Applies SCORM path fixes using scripts/fix-scorm-paths.js

The `out/` directory contains the final course assets.

### Packaging as SCORM

1. Run the build
2. Copy the appropriate manifest into the `out/` directory
3. Zip the contents of `out/`

## Project structure

```id="4imw9x"
src/
  app/            Next.js course pages (each route is a course screen)
  components/     UI components (SCORM wrapper, resume prompt, debug UI)
  stores/         Zustand runtime stores (SCORM state, language, debug)
  lib/            Core runtime utilities and SCORM integration
  types/          Shared TypeScript types

packaging/        SCORM manifest templates (1.2 and 2004)

public/
  lang/           Static language files
  mock-api/       Mock data used during development

scripts/
  fix-scorm-paths.js   Post-build adjustments for static SCORM export

tests/
  scormStore.test.ts   Runtime logic tests
```

## 🧠 Architectural Principles

### 1. Progressive language delivery (local → API)

The language system is designed to support **multiple delivery strategies**, depending on both product requirements and **LMS constraints**.

Out of the box, it supports:

- **Local JSON**  
  Languages are bundled with the app for fast startup and zero network dependency. This suits development-stage apps, static courses, and pre-CMS stage builds.

- **Per-language API (`apiSingle`)**  
  Each language is fetched independently (e.g. `/api/lang/en-GB`), allowing:
    - incremental loading
    - smaller payloads
    - easier cache control
    - CMS-backed language updates without rebuilding the application

- **All-languages API (`apiAll`)**  
   All languages are fetched from a single aggregated endpoint (e.g. `/api/lang/all`),
  returning a list of language payloads in a consistent CMS-friendly shape. This is preferred when:
    - runtime language switching is allowed
    - languages are small
    - the backend already aggregates translations centrally

In many LMS environments, multi-language SCORM packages are **not supported**. Platforms often require **one SCORM package per language**, with language selection handled externally. In these cases, the LangSelector component can be removed, and there is more reason to serve translation on a per-language API. Despite this, the system is designed to scale when the LMS allows it, or when the same codebase is reused outside of strict SCORM contexts.

The active delivery mode is controlled via configuration, not refactors, so the UI and consuming code remain unchanged.

The active language delivery strategy is selected at runtime via environment configuration:

- NEXT_PUBLIC_LANG_MODE=local
- NEXT_PUBLIC_LANG_MODE=apiSingle
- NEXT_PUBLIC_LANG_MODE=apiAll

This allows the same codebase to be deployed across different LMSs, environments,
and content pipelines without code changes.

CMS-backed in this context refers to publish-time content delivery rather than live,
real-time updates. Language data is treated as stable for the duration of a learner session.

#### Trade-offs

- **Local JSON** is simplest and fastest, but requires a redeploy for content changes.
- **Per-language APIs** scale well for CMS-driven content, but introduce more network requests.
- **All-languages APIs** reduce request count, but can increase initial payload size.

The store abstracts these differences so that the application logic does not need to care _where_ language data comes from - only that it arrives in a consistent shape.

### 2. Route-scoped language

The majority of language fields are grouped by **route**, rather than being tied directly to individual components because:

- **Content ownership is clearer** – pages own their copy, not components
- **CMS-friendly structure** – non-developers think in terms of pages, not React components
- **Translation process** – human translators prefer to see the language in the order it appears to ascertain context in real time
- **Readability** – many courses reuse components across pages, which would otherwise require verbose, deeply nested keys to avoid collisions. A key like `s1_p1` can exist on every page without issue, but cannot be reused within the same component without additional structure.

Global UI copy (e.g. language selector labels) lives separately from route-scoped content.

### 3. Global SCORM lifecycle management

The SCORM runtime is treated as a **global concern**, rather than being tied to individual pages or components.

The SCORM connection:

- initialises once at application load
- persists across route changes
- terminates cleanly on unload

This mirrors how LMS platforms expect SCORM content to behave and avoids repeated or invalid initialise / terminate calls during SPA navigation.

### 4 Runtime persistence

The course supports two execution environments:

- **SCORM LMS runtime**
- **Standalone browser**

Persistence behaviour depends on which environment is detected.

#### SCORM LMS mode

When the SCORM API is available, the LMS is treated as the **source of truth**.  
Learner state is restored exclusively from SCORM runtime data such as
`cmi.location`, `cmi.suspend_data`, score, and completion status.

#### Standalone browser mode

When no SCORM API is present, the course falls back to browser persistence.

This allows the course to function normally during development and static preview.

All hydration logic is **idempotent**, so repeated initialisation (for example
under React 18 Strict Mode) does not create duplicate side effects.

### 5. Route-based bookmarking and learner resume flow

Learner progress is tracked using a **route-based bookmarking strategy**, where each page in the course maps to a logical progression index.

For example:

- `/` → location `0`
- `/section1` → location `1`
- `/summary` → location `2`

Rather than coupling progress tracking to individual components or user actions, the system derives progress directly from **navigation**, ensuring that bookmarking remains reliable across:

- page refreshes
- deep links
- SPA route transitions
- LMS iframe reloads

#### Monotonic progress tracking

On every route change, the application:

1. Resolves the current route to a numeric location
2. Compares it against the previously stored location
3. Persists the new location **only if it represents forward progress**

This guarantees that:

- progress never regresses when navigating backwards
- repeated visits to earlier pages do not overwrite progress
- bookmarking remains deterministic and auditable

All comparison and persistence logic is centralised in the SCORM store, keeping pages and components free of SCORM-specific concerns.

#### Resume vs restart decision

When the course starts, previously persisted progress is hydrated from the best available source (LMS or browser storage).

If the learner has already progressed beyond the start of the course (location > `0`), they are offered a **resume decision** at the course entry point (`/`):

- **Resume** - continue from the furthest previously reached page
- **Restart** - clear all persisted progress and begin again from the start

This prompt is intentionally:

- shown **only at the course entry route**
- never shown mid-course
- never triggered by navigation during an active session

Refreshing or deep-linking to a later route is treated as an implicit intent to continue, avoiding disruptive prompts during learning.

#### Resume vs restart decision

When returning learners have existing progress, the course presents a clear resume decision at the entry point.

![Resume or restart modal](docs/demo/resume-restart.png)

#### Separation of concerns

Progress tracking and resume decision-making are deliberately separated:

- **Progress advancement** runs unconditionally on navigation
- **Resume prompts** are driven only by persisted state from prior sessions

This avoids race conditions, prevents duplicate writes, and ensures predictable behaviour in both LMS and local development environments.

### 6. Suspend data strategy and encoding

SCORM suspend data is used as the **single source of truth** for learner progress that must survive page reloads, browser restarts, and LMS session boundaries.

However, suspend data comes with **strict constraints**, especially in SCORM 1.2:

- maximum length limits (commonly 4096 characters)
- LMS-specific character restrictions
- inconsistent handling of quotes and special characters

To address this, suspend data is:

- serialised as JSON
- encoded to avoid problematic characters
- validated against SCORM 1.2 length limits before writing

This allows complex course state to be stored safely without relying on LMS-specific behaviour.

---

### 7. SCORM version abstraction (1.2 vs 2004)

The application supports both **SCORM 1.2** and **SCORM 2004** without branching logic leaking into components.

Key differences between versions include:

- different API data model paths
- different status fields (`lesson_status` vs `completion_status`)
- additional capabilities in 2004 (progress measures, richer interaction data)

These differences are abstracted behind store actions such as:

- setting completion state
- reading and writing location
- recording scores, objectives, and interactions

Components and pages do not need to know which SCORM version is active. They interact with a stable API, while the store resolves the correct SCORM calls internally.

This keeps learning logic clean and prevents version-specific edge cases from spreading throughout the codebase.

---

### 8. Next.js static export and LMS compatibility

NextScorm is designed to run inside LMS environments that expect **static SCORM packages** rather than traditional server-hosted web applications.

As a result, several adjustments are required when using **Next.js static export**, because LMS platforms typically:

- serve content from deep nested paths
- run courses inside iframes
- lack server-side routing or rewrite rules
- sometimes load courses directly from static storage

These constraints mean that some default Next.js assumptions about routing and asset resolution do not hold in LMS environments.

#### Static asset path correction

Next.js static export generates asset paths relative to the current page: `/index.html`

However, nested routes such as: `/section1/index.html` would attempt to load assets from: `/section1/\_next/...`
which does not exist in the exported package.

To ensure assets load correctly from any route, NextScorm performs a `post-build patch step` that rewrites nested asset paths to: `../\_next/...`

This allows all pages in the course to correctly reference the shared `_next` build output regardless of their folder depth.

#### Runtime route detection

In a typical Next.js application, the active route is resolved using the framework router.

However, in SCORM environments the router can behave unpredictably because content is executed from:

- static file systems
- LMS content sandboxes
- nested directories inside LMS course containers
- iframe contexts where path resolution differs from standard web hosting

To ensure deterministic behaviour, NextScorm resolves the active route **at runtime using the browser location** rather than relying entirely on the Next.js router during hydration.

This approach ensures that:

- static exports behave consistently across routes
- hydration mismatches are avoided during client startup
- deep linking and bookmarking behave predictably inside LMS players

While this strategy differs slightly from conventional Next.js routing patterns, it provides significantly more reliable behaviour in the constrained runtime environments typical of SCORM LMS platforms.

---

### 9. Debug tooling and local development support

Working with SCORM often involves **slow feedback loops**, opaque LMS errors, and limited debugging tools.

To mitigate this, the project includes a dedicated SCORM debug interface that allows developers to:

- inspect the detected SCORM version
- manually trigger get and set operations
- test scores and completion behaviour

### Debug panel (local development)

The built-in debug panel exposes SCORM state and persistence behaviour during local development, allowing developers to inspect and manipulate progress without an LMS.

![SCORM debug panel](docs/demo/debug-panel.png)

### 10 Testing

Core runtime logic is covered by unit tests using **Jest** and **ts-jest**.

Tests focus on deterministic behaviour in the SCORM runtime store, including:

- persistence hydration precedence (LMS vs browser)
- monotonic route-based bookmarking
- resume availability logic

The SCORM API is mocked so tests can run without an LMS.

---
