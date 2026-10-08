# Implementation Plan: Umodai Restaurant & Catering Website

**Branch**: `001-umodai-restaurant` | **Date**: 2026-10-07 | **Spec**: `/specs/001-umodai-restaurant/spec.md`

**Input**: Feature specification from `/specs/001-umodai-restaurant/spec.md`

## Summary

Build a bilingual, mobile-first restaurant and catering website for Umodai in Ajman using a Next.js + TypeScript frontend with Supabase for data, auth, storage, and edge functions. The system will support menu browsing, online ordering, catering enquiries, secure payment handling, admin review, and website attribution for commission reporting.

## Research and Design Decisions

- Use a single Next.js application for storefront and admin because the project is a local-market MVP and the business needs a fast delivery cycle.
- Keep Supabase as the single authoritative operational backend for PostgreSQL, auth, storage, and edge functions to simplify data integrity and reduce operational complexity.
- Treat payment processing as provider-managed hosted checkout or protected callback flow, never as raw card capture inside the app.
- Use an admin-review model for all large catering requests to preserve manual human confirmation before deposit or full payment.
- Keep menu, pricing, package, order, payment, and commission records in versioned database tables so the website can support auditability and staff review.
- Build for a mobile-first Arabic/English experience with RTL support from the first implementation pass rather than as a later patch.

## Technical Context

**Language/Version**: Next.js 14 or later with TypeScript; Node.js 18+ or current supported runtime for the project

**Primary Dependencies**: Next.js, Tailwind CSS, Supabase client and server SDK, Google Maps embed/API, payment gateway SDK, form validation utilities, and analytics/SEO tooling

**Storage**: Supabase PostgreSQL for application data; Supabase Storage for media; Edge Functions for server-side processing and gateway callbacks

**Testing**: Unit tests with Vitest/Jest, component tests, and end-to-end flows for checkout and catering forms

**Target Platform**: Vercel-hosted web application with mobile-first responsive customer experience and admin dashboard

**Project Type**: Web application with a frontend storefront and backend services hosted through Supabase

**Performance Goals**: Fast mobile page loads, responsive menu browsing, and reliable payment/checkout flows within the 5-week initial launch window

**Constraints**: Arabic RTL support, UAE payment compliance, no direct card storage, and manual review required for large catering requests

**Scale/Scope**: Single restaurant and catering business with local-market sales, admin management, and commission attribution; launch-ready MVP for Ajman market

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- User value is clearly centered on customer acquisition and order conversion.
- Payment handling and data retention must avoid storing raw card details.
- Admin review is required for large catering requests before payment confirmation.
- The plan is intentionally scoped to a launch-ready MVP for a single local business and does not add marketplace complexity beyond the requested scope.

## Project Structure

### Documentation (this feature)

```text
specs/001-umodai-restaurant/
├── spec.md
├── plan.md
├── research.md          # future artifact if deeper research is needed
├── data-model.md        # future artifact for domain entity modeling
├── quickstart.md        # future artifact for local setup
├── contracts/           # future artifact for API contracts
└── tasks.md             # implementation checklist
```

### Source Code (repository root)

```text
frontend/
├── app/
│   ├── (marketing)/
│   ├── (shop)/
│   ├── admin/
│   └── api/
├── components/
│   ├── menu/
│   ├── checkout/
│   ├── catering/
│   └── admin/
├── lib/
│   ├── supabase/
│   ├── payments/
│   ├── formatting/
│   └── seo/
├── hooks/
├── types/
└── public/

supabase/
├── migrations/
├── functions/
├── seeds/
└── schemas/

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: A single Next.js storefront and admin app is the correct fit for a quickly deployable bilingual site, with Supabase handling data persistence, auth, media, and server-side logic. The design avoids a separate backend service layer unless the payment callback or admin workflows require custom edge functions.

## Phase Plan

### Phase 0 — Discovery and contract alignment
- Confirm the PRD-driven requirements and map them to the initial user stories.
- Validate business assumptions for payment provider, catering review workflow, commission terms, and VAT/AED logic.
- Confirm content and menu ownership before implementation begins.

### Phase 1 — Shared foundation
- Initialize app shell, styling system, locales, and core admin/auth scaffolding.
- Create Supabase schema and type-safe models for menu, orders, catering, payment, and commission records.
- Set up storage and migration scripts with RLS and basic validation rules.

### Phase 2 — Customer storefront
- Build the marketing pages, menu browsing, local business contact, and catering package sections.
- Create the cart, checkout flow, and order confirmation journey.
- Integrate payment and status updates without storing raw card data.

### Phase 3 — Admin operations
- Build admin login and role gating.
- Add order and catering request dashboards, payment tracking, and deposit revisions.
- Add commission calculation/reporting views tied to the underlying order and payment records.

### Phase 4 — Quality, release readiness, and launch support
- Run QA for Arabic/English journeys, payment flows, admin actions, and edge cases.
- Validate business profile, SEO, and local search readiness.
- Perform final MVP release checks before launch.

## Complexity Tracking

> **No constitution conflicts require overriding the default approach.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
