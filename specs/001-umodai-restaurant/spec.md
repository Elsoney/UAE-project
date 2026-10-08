# Feature Specification: Umodai Restaurant & Catering Website

**Feature Branch**: `001-umodai-restaurant`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Build a bilingual restaurant and catering website for Umodai in Ajman"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Umodai and understand the offering (Priority: P1)

A customer in Ajman wants to understand the restaurant and catering service quickly, evaluate the menu, find the business, and decide whether to order or enquire.

**Why this priority**: This is the main acquisition path; if a customer cannot discover or understand the offering, the website will fail to generate leads or orders.

**Independent Test**: A visitor can land on the homepage, browse menu sections and catering packages, and find the business location and contact details without signing in.

**Acceptance Scenarios**:

1. **Given** a visitor opens the website in English or Arabic, **When** they browse the homepage, **Then** they see Umodai branding, menu highlights, catering overview, and contact routes in the selected language.
2. **Given** a customer wants to view food options, **When** they open the menu or category pages, **Then** they can browse items with descriptions, prices, and food imagery.
3. **Given** a customer wants to find the restaurant physically, **When** they open the location section, **Then** they can see the address, Google Maps link, phone number, and WhatsApp contact.
4. **Given** a potential catering client is looking for event packages, **When** they view the catering section, **Then** they see package options and a route to submit an enquiry.

---

### User Story 2 - Order food or request catering online (Priority: P1)

A customer wants to place a standard order or submit an event request without relying on WhatsApp, phone calls, or walk-ins only.

**Why this priority**: This is the direct revenue-generating workflow and the most important conversion path for the business.

**Independent Test**: A customer can add menu items to a cart, complete checkout, or submit a catering request, then receive a confirmation and a status update.

**Acceptance Scenarios**:

1. **Given** a customer is browsing the menu, **When** they add items to the cart and proceed to checkout, **Then** the system captures the order details and asks for secure payment using the configured payment gateway.
2. **Given** a customer selects a large event or custom catering requirement, **When** they submit the catering enquiry form, **Then** the request is created with event date, guest count, customer details, and admin review status.
3. **Given** a catering request is submitted, **When** the restaurant admin reviews it, **Then** they can decide on a deposit, full payment, or no-deposit approval before confirming the booking.
4. **Given** a payment fails or a form is incomplete, **When** the customer retries or corrects the details, **Then** the system offers clear feedback and keeps the request/order in a recoverable state.

---

### User Story 3 - Manage current orders, payments, and commission data as an admin (Priority: P2)

The restaurant staff and website operator need a practical admin experience to review orders, decide catering payment requirements, and calculate website-generated commission.

**Why this priority**: Staff need operational visibility and a reliable attribution trail to protect revenue integrity and reduce manual confusion.

**Independent Test**: An authenticated admin can view recent orders and catering requests, confirm or reject steps, update status, and review commission-related data.

**Acceptance Scenarios**:

1. **Given** an admin signs in, **When** they open the dashboard, **Then** they see recent orders and catering requests with customer details, item lists, payment state, and approval state.
2. **Given** a catering request is pending review, **When** the admin sets the deposit amount or final approval, **Then** the system updates the request, notifies the customer, and stores the decision as an auditable action.
3. **Given** a completed website order exists, **When** the admin views commission reporting, **Then** they can see the attributable sales, commissionable amount, and related payment status.
4. **Given** a refund, cancellation, or failed payment occurs, **When** the admin reviews the data, **Then** the system reflects the correct status without losing transaction history.

---

### User Story 4 - Maintain the website as a discoverable local business (Priority: P2)

The restaurant needs the website to work as a digital sales and discovery channel for local search and map listing visibility in Ajman.

**Why this priority**: If customers cannot find the business in search and maps, the digital sales funnel loses traffic before conversion.

**Independent Test**: The site includes proper local SEO metadata, Google Business Profile readiness, and user-facing contact information aligned with Google Maps and search discovery.

**Acceptance Scenarios**:

1. **Given** the site is published, **When** search engines crawl the pages, **Then** they find business metadata, location information, and consistent local content for Ajman.
2. **Given** a local user searches for Umodai, **When** they view the Google Business Profile and website, **Then** they can identify the restaurant, menu, contact methods, and service areas.
3. **Given** the site is used on mobile, **When** users scroll and navigate, **Then** the experience is fast, bilingual, and easy to use on small screens.

---

### Edge Cases

- What happens when a customer submits a catering request with an invalid event date, missing guest count, or incomplete contact details?
- How does the system handle checkout failures, duplicate payment callbacks, or a paused payment flow?
- What happens when an admin tries to approve a deposit larger than the approved total or a zero-value request?
- How does the system behave when a customer cancels an order or requests a refund after payment confirmation?
- What happens when a large catering request is submitted outside the restaurant's service coverage or approved date window?
- How does the site behave when some content or translations are missing in one locale?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a bilingual Arabic and English customer experience with proper RTL support for Arabic content.
- **FR-002**: The system MUST display restaurant information, menu categories, pricing, images, and local business details clearly on mobile and desktop layouts.
- **FR-003**: The system MUST allow customers to browse the menu, filter by category or type, and inspect item descriptions and pricing before ordering.
- **FR-004**: The system MUST present the restaurant's catering services and packages with event scope, pricing, and terms explained in both languages.
- **FR-005**: The system MUST allow a customer to submit a structured catering enquiry with event date, guest count, service needs, customer information, and special requirements.
- **FR-006**: The system MUST support regular online ordering with a cart and checkout flow for eligible menu items.
- **FR-007**: The system MUST use a UAE-compatible payment provider for secure online payment and MUST NOT store raw card or CVV data in the application itself.
- **FR-008**: The system MUST support deposit, full-payment, and no-deposit options for large catering requests, with restaurant review before confirmation.
- **FR-009**: The system MUST allow restaurant admin users to review orders, update status, set deposit requirements, and confirm or reject catering requests.
- **FR-010**: The system MUST maintain an audit trail for order creation, payment events, catering approvals, refunds, and any admin actions that change financial or approval state.
- **FR-011**: The system MUST record website-origin attribution for orders and requests so the commercial model can calculate commission accurately.
- **FR-012**: The system MUST provide WhatsApp, phone, and map-based customer contact routes to the restaurant.
- **FR-013**: The system MUST support local SEO and business discoverability through Google Business Profile, Google Maps, Google Search Console, and consistent local metadata.
- **FR-014**: The system MUST implement admin authentication and role-based access so only authorized users can manage orders, payments, deposits, and commission reports.
- **FR-015**: The system MUST support menu management and package/content updates in a simple admin workflow for the restaurant team.
- **FR-016**: The system MUST provide confirmation and status messaging to customers after order placement, catering submission, deposit payment, full payment, or refund/cancellation actions.
- **FR-017**: The system MUST support payment status tracking, remaining-balance tracking, and reconciliation for catering and order events.
- **FR-018**: The system MUST protect customer privacy by collecting only required information and keeping sensitive payment data in provider-managed workflows rather than directly in the app.

### Key Entities *(include if feature involves data)*

- **Customer**: A user who browses, orders, or requests catering; includes contact details and event/contact information as needed.
- **Menu Item**: A restaurant menu item with title, category, description, price, visibility state, translation data, and media.
- **Catering Package**: A packaged catering offering with service scope, price, included items, and terms.
- **Order**: A regular restaurant order created from a shopping cart and checkout flow, including customer, order items, total, payment status, and fulfillment status.
- **Catering Request**: A custom event enquiry or booking request with guest count, event date, service details, approval status, deposit, and payment state.
- **Payment**: A transaction generated for an order or catering deposit, with provider reference, amount, currency, and status.
- **Admin User**: A restaurant or operations user who reviews orders, updates statuses, approves catering bookings, and manages financial data.
- **Commission Record**: A record linking a website-generated sale to commission eligibility, approved rate, and payable amount under the agreed commercial terms.
- **Refund/Adjustment**: A transactional change to captured payment or approved order value, recorded for auditing and commission reconciliation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can browse the restaurant and catering offering and complete the primary task in under five minutes on desktop or mobile.
- **SC-002**: At least 90% of test users can successfully complete a standard order or catering enquiry without support intervention.
- **SC-003**: Each online payment is tracked with a verified gateway reference and a clear status, and no raw card data is stored in the application.
- **SC-004**: Each website-generated order or catering payment can be attributed to the correct customer and linked to a commissionable amount with a complete audit trail.
- **SC-005**: Large catering requests are reviewed by the restaurant before final confirmation and deposit requirements are explicitly selected and recorded.
- **SC-006**: The website supports local search and map discovery in Ajman and provides clear business information across English and Arabic channels.
- **SC-007**: The platform can be launched as a single-restaurant, bilingual digital sales channel within the maximum five-week timeline without violating core security and payment integrity rules.

## Assumptions

- Customers will primarily discover the business through local search, social media, WhatsApp, and direct location awareness in Ajman.
- The restaurant will provide accurate menu and pricing content before launch.
- The restaurant has a human review process for large catering requests and will confirm service coverage and availability.
- Payment processing will occur using a UAE-compatible provider with hosted/managed payment flows rather than storing cards directly in the application.
- The website is the digital sales channel while the restaurant remains responsible for execution, preparation, fulfillment, and direct customer service for bookings.
- Commission rules and payment model will be approved separately by Umodai and the website/operator before live commission accrual.
- Google Business Profile verification and local SEO optimization will be completed as part of launch readiness and may depend on external verification timing.
- The restaurant will provide brand content, food photography, and service information early enough for launch.
- The application may use Supabase for authentication, database, storage, and edge functions, as described in the PRD and project technical direction.
