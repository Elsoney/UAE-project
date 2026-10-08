# Tasks: Umodai Restaurant & Catering Website

**Input**: Design documents from `/specs/001-umodai-restaurant/`

**Prerequisites**: spec.md and plan.md are required. Research, data-model, and contracts should be added as the feature evolves.

**Organization**: Tasks are grouped by user story and execution phase to keep the MVP deployable and independently testable.

## Phase 1: Setup and Shared Infrastructure

**Purpose**: Initialize the project shell, environment variables, and shared app foundation.

- [ ] T001 Create the Next.js + TypeScript project structure for the storefront and admin app in `frontend/`
- [ ] T002 Configure Tailwind CSS, RTL styling, and bilingual content structure for Arabic and English
- [ ] T003 [P] Set up environment configuration for Supabase, payment provider, analytics, and SEO metadata
- [ ] T004 [P] Configure linting, formatting, and basic CI checks for the frontend

---

## Phase 2: Foundational Services and Data Model

**Purpose**: Build the shared backend contracts, database model, and authentication foundation before story work begins.

- [ ] T005 Create Supabase schema for menu items, orders, catering requests, payments, and commission records
- [ ] T006 [P] Implement admin authentication and authorization requirements in the Supabase/Auth layer
- [ ] T007 [P] Define shared TypeScript models and API response types used across storefront and admin flows
- [ ] T008 Configure storage and media handling for menu photography and business imagery
- [ ] T009 Set up error handling, logging, and status mapping for payment and catering review workflows

**Checkpoint**: Shared data model and auth are in place before user story implementation begins.

---

## Phase 3: User Story 1 - Discover the restaurant and catering offer (Priority: P1)

**Goal**: Make Umodai discoverable, informative, and easy to understand on mobile and desktop.

**Independent Test**: A customer can browse the homepage, menu, and catering package sections and understand the offering without signing in.

### Implementation for User Story 1

- [ ] T010 [P] Build the home page with branding, restaurant overview, and bilingual content blocks in `frontend/app/`
- [ ] T011 [P] Build the menu browsing experience with categories, filters, pricing, and images
- [ ] T012 [P] Build the catering packages page with package cards and clear service explanations
- [ ] T013 Create the location/contact section with map embed, address, phone, and WhatsApp links
- [ ] T014 Add SEO metadata, Google Business Profile integration hints, and structured page data
- [ ] T015 Validate responsive behavior and Arabic RTL layout across key screens

**Checkpoint**: User Story 1 is functional and independently testable as a marketing and discovery MVP.

---

## Phase 4: User Story 2 - Place orders or submit catering enquiries (Priority: P1)

**Goal**: Convert website visits into orders and structured catering requests.

**Independent Test**: A customer can add items to a cart, pay securely, or submit a catering enquiry and receive confirmation.

### Implementation for User Story 2

- [ ] T016 [P] Create the cart and checkout flow for regular restaurant orders in `frontend/components/checkout/`
- [ ] T017 [P] Implement order creation, validation, and customer confirmation logic in the application layer
- [ ] T018 Integrate the chosen UAE-compatible payment gateway for secure checkout and payment status tracking
- [ ] T019 Create the catering enquiry form with event details, guest count, date, and request notes
- [ ] T020 Implement deposit and full-payment decision handling for large catering requests
- [ ] T021 Add confirmation screens, email or message notifications, and booking status updates
- [ ] T022 Validate payment failure, invalid form submission, and cancellation edge cases

**Checkpoint**: User Story 2 is independently usable and can generate real conversion flows.

---

## Phase 5: User Story 3 - Admin operations and commission reporting (Priority: P2)

**Goal**: Give staff and the website operator visibility into orders, payments, and business performance.

**Independent Test**: An authenticated admin can review orders, manage catering states, and inspect commission data without developer support.

### Implementation for User Story 3

- [ ] T023 Build admin dashboard shell and authentication gating in `frontend/app/admin/`
- [ ] T024 [P] Create order management table with status updates and customer context
- [ ] T025 [P] Create catering request management with review notes, deposit selection, and approval state
- [ ] T026 Implement payment and refund status tracking aligned with transaction records
- [ ] T027 Add commission attribution logic and reporting for website-generated sales
- [ ] T028 Add admin tools for menu updates and package management if required by the launch MVP

**Checkpoint**: User Story 3 supports the business operational workflow and revenue tracking required by the PRD.

---

## Phase 6: Quality, Polish, and Launch Readiness

**Purpose**: Final checks, documentation, and deployment readiness for a launchable MVP.

- [ ] T029 [P] Run unit and integration tests for the main storefront, checkout, and admin flows
- [ ] T030 [P] Validate accessibility, mobile responsiveness, and RTL correctness on key user journeys
- [ ] T031 Review local SEO, Google Maps, and Business Profile readiness for launch
- [ ] T032 Final security review of payment, auth, and admin-access rules
- [ ] T033 Document the quickstart and deployment instructions for the restaurant team

---

## Dependencies and Execution Order

- Phase 1 and Phase 2 must complete before implementing any user-story work.
- User Story 1 can be implemented independently as the foundation for discoverability and marketing.
- User Story 2 depends on shared checkout and payment infrastructure but should remain independently testable.
- User Story 3 depends on the shared data layer and can run in parallel with final polish once the core flows are complete.

## Parallel Opportunities

- Tasks marked [P] can generally run in parallel when the team has enough capacity.
- The menu, home page, and package pages are independent UI slices after the app shell is ready.
- Order table and catering request management dashboards can be built in parallel once the models are defined.
