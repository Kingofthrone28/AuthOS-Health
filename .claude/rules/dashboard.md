# dashboard.md

## app/web Engineering Playbook

Project-level process guide for the Next.js dashboard shell.

## Quick start

- Keep route files thin. They should parse params, set loading boundaries, and mount containers.
- Build shared UI in atoms, molecules, organisms, and icons before feature-specific markup.
- Fetch and shape data inside containers. Presentation components render props only.
- Prefer dynamic server rendering for dashboard and case detail screens; use ISR only for slow-changing reference content.
- After mutations, revalidate route or tag caches so queue data stays fresh.

## 1. Product boundary

The `app/web` project is the dashboard shell for the healthcare prior-authorization workspace. It owns route composition, role-based navigation, operational dashboards, work queues, and case detail views.

It does not own payer protocol logic, FHIR connector internals, or workflow orchestration rules directly. Those belong to feature and integration layers behind stable interfaces.

## 2. Architecture rules

Default to Server Components. Reach for Client Components only when a component genuinely needs event handlers, browser APIs, local UI state, URL search-param manipulation, or optimistic interactions.

Organize business logic by feature. Shared visual primitives live in `components/`. Route files stay intentionally thin and should never become the primary home for data-mapping or business rules.

## 3. Rendering strategy

Use dynamic server rendering for:
- dashboard pages
- case detail pages
- tenant-aware queue views
- SLA-sensitive widgets
- authenticated operational data

Use ISR only for:
- slow-changing reference content
- internal help pages
- dashboard glossary content
- static product guidance

Use Client Components only for:
- filters
- local interactive controls
- drawers and modals
- optimistic actions
- URL-bound search state

## 4. Atomic design map

Use shared visual primitives before creating feature-specific UI. Keep the design system small, boring, and composable.

- **Atoms**: buttons, badges, inputs, cards, text, avatars, icons
- **Molecules**: KPI cards, search fields, status pills, detail rows, nav items
- **Organisms**: sidebars, topbars, queue filters, auth tables, summary panels, timelines
- **Icons**: domain-safe icon primitives for navigation, alerts, status, and actions

Prefer shared primitives when reuse is likely. Keep feature-local components close to the owning feature when reuse is unlikely.

## 5. Container / presentation pattern

Containers fetch data, shape view models, coordinate mutations, and decide loading, empty, and error states.

Presentation components render props only. They should be easy to test with plain objects and should not know about backend response formats, auth/session internals, or route parameter parsing.

### Feature directory scaffold

```txt
features/
  dashboard/
    containers/
      DashboardPageContainer.tsx
      QueueFiltersContainer.tsx
    presentation/
      DashboardPage.tsx
    types.ts
    mappers.ts

  case-detail/
    containers/
      CaseDetailContainer.tsx
    presentation/
      CaseDetailPage.tsx
    types.ts
    mappers.ts
```

### Route file responsibilities

- Parse params and search params
- Set route-level loading and suspense boundaries
- Mount the correct container
- Avoid embedding workflow logic or direct domain shaping in `page.tsx`

### Example route + container split

```tsx
// app/(dashboard)/dashboard/page.tsx
import { Suspense } from 'react'
import { DashboardPageContainer } from '@/features/dashboard/containers/DashboardPageContainer'
import { QueueFiltersContainer } from '@/features/dashboard/containers/QueueFiltersContainer'

export default async function DashboardRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const params = await searchParams

  return (
    <main className="space-y-6">
      <Suspense fallback={<div className="h-14 rounded-2xl border bg-white" />}>
        <QueueFiltersContainer />
      </Suspense>

      <DashboardPageContainer
        filters={{
          q: params.q ?? '',
          status: params.status ?? 'all',
        }}
      />
    </main>
  )
}
```

## 6. State and data flow rules

- Server data should be fetched in containers or dedicated lib query helpers.
- Use URL state for list filters and queryable dashboard controls.
- Keep transient UI state local to the Client Component that owns the interaction.
- Use server actions for mutations, then revalidate route or tag caches immediately.
- Do not let presentation components call low-level APIs directly.

## 7. Accessibility and healthcare safety guardrails

Use semantic structure first: headings in order, proper table markup, and button elements for actions rather than clickable divs.

Avoid leaking PHI into logs, mock data screenshots, and debug UI. Default examples should use synthetic patient names and payer data.

Favor server-side data access so secrets and tenant-specific queries stay off the client whenever possible.

## 8. Pull request checklist

- The route file is thin and mounts a container rather than owning business logic.
- Shared UI was added to atoms, molecules, organisms, or icons when reuse is likely.
- The feature exposes typed view models rather than leaking backend response shapes into presentation components.
- Dashboard and case-detail pages remain server-first unless a client boundary is truly required.
- Any mutation path revalidates the correct route or cache tag.
- UI states include loading, empty, success, and error behavior where applicable.
- Accessibility checks were performed for keyboard use, focus states, headings, and tables.
- PHI-safe sample data was used in screenshots, tests, and code examples.

## 9. Recommended app/web starter scaffold

```txt
app/
  (dashboard)/
    layout.tsx
    dashboard/
      page.tsx
      loading.tsx
    cases/
      [id]/
        page.tsx
        loading.tsx

components/
  atoms/
  molecules/
  organisms/
  icons/

features/
  dashboard/
  case-detail/

lib/
  dashboard/
  cases/
  auth/
  api/
```

## 10. Final rule of thumb

Keep the `app/web` shell boring, predictable, and easy to extend. Put domain complexity behind containers and adapters. Let the dashboard feel fast through server-first rendering, small client boundaries, and consistent design-system reuse.
