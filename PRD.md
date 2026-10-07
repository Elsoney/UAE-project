# umodai_Restaurant — Product Requirements Document

## 1. Project Identity

| Field | Value |
|---|---|
| Project Name | umodai_Restaurant |
| Project Type | Restaurant & Catering E-commerce Website |
| Project ID | PRD-001 |
| Version | v1.0 |
| Status | Draft |
| Priority | High |
| Created Date | 2026-10-06 |
| Last Updated | 2026-10-06 |
| Restaurant Owner | Umodai |
| Product / Website Owner | [TBD — Website & Operations Owner] |
| Product Support | Senior Product Assistant — ChatGPT |
| Target Market | Ajman, UAE initially; expansion to wider UAE later |
| Primary Languages | Arabic and English |
| Target Launch | Maximum 5 weeks from project start |
| Frontend | Next.js + TypeScript + Tailwind CSS |
| Backend Platform | Supabase |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Server Logic | Supabase Edge Functions |
| Hosting | Vercel |
| Payment Gateway | UAE-compatible gateway — provider TBD |
| Maps | Google Maps |
| SEO Tools | Google Search Console + Google Business Profile |
| Repository | [TBD] |
| Git Branch Prefix | NNN-feature-name |
| PRD File Path | docs/PRD.md |

---

## 2. Problem & Purpose

### Problem Statement

Umodai already operates from a physical restaurant location in Ajman, but it currently lacks a complete digital acquisition and ordering system.

Potential customers may discover catering services through word of mouth, phone calls, WhatsApp, social media, or physical presence, but there is no central digital platform where they can:

- Discover Umodai through search engines.
- View restaurant and catering offerings.
- Understand catering packages and pricing.
- Submit structured catering enquiries.
- Place regular restaurant orders.
- Pay online.
- Pay a deposit for large catering bookings.
- Receive clear confirmation of their request or order.

The absence of a structured website also makes it difficult to accurately identify which orders were generated through the website and calculate the Website & Operations Owner's agreed commission.

### Project Purpose

Create a bilingual, mobile-first restaurant and catering website that acts as Umodai's primary digital sales channel.

The platform will allow customers to discover Umodai, browse food and catering options, submit orders or catering requests, communicate with the restaurant, and complete online payments.

Large catering requests will use a human-reviewed workflow. Restaurant staff will first speak with the customer, confirm availability and requirements, and then decide whether a deposit or full payment should be requested.

### Business Value

The platform is intended to:

1. Increase restaurant and catering enquiries.
2. Generate measurable online sales.
3. Improve local discovery through Google Search and Google Maps.
4. Reduce unstructured ordering through calls and messages.
5. Centralize order and payment information.
6. Create a measurable website-generated revenue channel.
7. Allow transparent calculation of commission generated through website orders.
8. Improve customer trust through professional online presence and secure payment.

### Commercial Model

The Website & Operations Owner receives an agreed percentage of eligible orders generated through the website.

The system must therefore maintain reliable attribution between:

- Website visitor.
- Customer.
- Order or catering request.
- Confirmed order value.
- Payment transactions.
- Refunds where applicable.
- Commissionable amount.
- Commission due.

The exact commission percentage is a commercial agreement and remains `[TBD]`.

---

## 3. Goals & Objectives

### Primary Goal

Launch a production-ready bilingual website within a maximum of five weeks that enables customers to discover Umodai, browse restaurant and catering offerings, submit orders and catering requests, make payments, and find the business through Google Search and Google Maps.

### Objectives

1. Create a high-performance Arabic and English website optimized for mobile customers.
2. Digitize regular restaurant ordering.
3. Create a structured catering enquiry and booking workflow.
4. Support online card and wallet payments through a UAE-compatible gateway.
5. Allow restaurant administrators to manually determine the deposit required for individual catering requests.
6. Accurately track all website-generated orders for commission calculation.
7. Establish and optimize Umodai's Google Business Profile and Google Maps presence.
8. Build a strong Local SEO foundation for catering and restaurant searches in Ajman.
9. Provide a simple administrative workflow for menu, orders, catering requests, payments, and deposits.

### Success Definition

The v1 launch is successful when a customer can:

1. Find Umodai through the website or Google.
2. Understand the restaurant and catering offering.
3. Select food, catering packages, or request a custom catering order.
4. Submit all required event/customer details.
5. Receive restaurant review for larger catering requests.
6. Receive a payment request when required.
7. Pay securely.
8. Receive confirmation.
9. Have the entire transaction correctly attributed to the website.

### Non-Goals for v1

- Native iOS or Android applications.
- Live driver tracking.
- Advanced CRM.
- AI chatbot.
- Loyalty points.
- Talabat, Deliveroo, Careem, or other marketplace integrations.
- Advanced accounting or ERP integration.
- Automatic catering deposit selection based on rules.
- Full automatic catering acceptance without restaurant review.

---

## 4. Scope

### In Scope

- Responsive customer-facing website.
- Arabic and English localization.
- Restaurant information.
- Menu browsing.
- Catering service presentation.
- Catering packages.
- Catering request form.
- Regular online ordering.
- Shopping cart where applicable.
- Checkout flow.
- Online payment gateway.
- Admin-controlled catering deposits.
- Full payment option.
- Payment status tracking.
- Remaining-balance tracking.
- Order management.
- Catering request management.
- Admin authentication.
- Menu and package management.
- Website order attribution.
- Commission calculation.
- Basic commission reporting.
- WhatsApp contact.
- Phone contact.
- Google Maps integration.
- Google Business Profile setup/optimization.
- Local SEO.
- Google Search Console.
- Basic analytics.
- Mobile performance optimization.
- Order/customer confirmation.
- Cancellation/refund workflow.
- Basic promotional code support.
- Catering availability/date blocking.

### Out of Scope

- Native mobile applications.
- Marketplace integrations.
- Real-time delivery driver tracking.
- Loyalty program.
- AI customer service assistant.
- Full ERP integration.
- Advanced CRM.
- Complex warehouse or stock management.
- Automated commission payouts.
- Automatic event quotation engine.
- Automatic deposit rules based on order categories.
- Multi-restaurant marketplace functionality.

### Assumptions

- The restaurant will provide accurate menu information.
- Restaurant pricing will be approved before launch.
- Food and catering photographs will be provided or produced.
- The restaurant will define its delivery/service coverage.
- Umodai staff will review large catering requests manually.
- Customers can be contacted by phone before a large catering request is approved.
- The payment gateway account can be opened in the restaurant/business entity's name.
- The restaurant will provide the information required for Google Business Profile verification.
- Commission terms between the parties will be documented separately.

### Constraints

- Maximum five-week implementation window.
- v1 must remain focused on high-value features.
- External payment-gateway onboarding may affect launch timing.
- Google Business verification timing is partly outside project control.
- Restaurant content and photography must be ready early.
- Arabic UX must be properly RTL-compatible.
- Payment-card data must not be stored directly by the Umodai application.

### Dependencies

- Restaurant menu and pricing.
- Catering packages.
- High-quality food photography.
- Restaurant branding assets.
- UAE payment gateway account.
- Google Business Profile ownership/access.
- Domain name.
- Commission agreement.
- Restaurant cancellation/refund policy.
- Delivery/service-area rules.

---

## 5. Users & Personas

### Primary Users

Customers in Ajman searching for restaurant food, catering services, family-event food, corporate catering, or event catering.

### Secondary Users

- Umodai restaurant staff.
- Restaurant management.
- Website & Operations Owner.

### User Roles & Permissions

| Role | Access Level | Key Permissions |
|---|---|---|
| Customer | Public / customer access | Browse menu, browse catering, create order, create catering request, submit contact details, make payment |
| Restaurant Admin | Administrative | Manage menu, packages, requests, orders, payment requests, deposits, statuses, dates, cancellations |
| Website & Operations Owner | Operational / reporting | Review website-generated orders, revenue attribution, payment information, commission reports and operating performance |

### Persona 1 — Catering Customer

**Role:** Individual, family organizer, company employee, office manager, or event organizer.

**Goal:** Arrange food for an event quickly and confidently.

**Pain Point:** Catering arrangements are often fragmented across phone calls and WhatsApp messages, with unclear pricing, availability, order details, and payment status.

**Tech Level:** Low to high.

**Frequency:** Occasional.

**Success Definition:** Customer can submit a complete request and secure the booking without repeated communication.

### Persona 2 — Regular Restaurant Customer

**Role:** Customer ordering food from Umodai.

**Goal:** Find food, choose items, and complete an order with minimal effort.

**Pain Point:** Difficulty finding reliable restaurant information or completing an order digitally.

**Tech Level:** Low to high.

**Frequency:** Weekly or occasional.

**Success Definition:** Customer reaches order confirmation quickly from mobile.

### Persona 3 — Restaurant Administrator

**Role:** Umodai staff member.

**Goal:** Manage incoming requests and convert suitable enquiries into confirmed paid orders.

**Pain Point:** Orders arriving through multiple channels create inconsistent records and make tracking difficult.

**Tech Level:** Low to medium.

**Frequency:** Daily.

**Success Definition:** Staff can process requests using a simple status-driven workflow.

### Persona 4 — Website & Operations Owner

**Role:** Website and operations manager.

**Goal:** Grow website-generated sales and accurately measure revenue and commission.

**Pain Point:** Without reliable attribution, online-generated business cannot be distinguished from offline orders.

**Tech Level:** Medium to high.

**Frequency:** Daily/weekly.

**Success Definition:** Every eligible website order can be traced from request to payment and commission.

---

## 6. MoSCoW Feature Prioritization

### Must Have — P0

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P0-F001 | Bilingual Website | TODO | Responsive Arabic/English customer website | Frontend | Week 1 |
| P0-F002 | Menu & Catering Catalog | TODO | Display restaurant items and catering packages | Full Stack | Week 2 |
| P0-F003 | Catering Request Workflow | TODO | Structured event/catering request submission | Full Stack | Week 2 |
| P0-F004 | Regular Online Ordering | TODO | Standard order/cart/checkout workflow | Full Stack | Week 2 |
| P0-F005 | Admin Order Management | TODO | Manage restaurant and catering requests | Full Stack | Week 2 |
| P0-F006 | Online Payment Gateway | TODO | Secure external payment processing | Backend | Week 3 |
| P0-F007 | Admin-Controlled Deposit | TODO | Admin selects deposit/full-payment requirement per catering order | Backend | Week 3 |
| P0-F008 | Payment & Balance Tracking | TODO | Track paid, deposit paid, balance and refund states | Backend | Week 3 |
| P0-F009 | Website Order Attribution | TODO | Identify and record website-generated orders | Backend | Week 3 |
| P0-F010 | Commission Tracking | TODO | Calculate commission for eligible website orders | Backend | Week 3 |
| P0-F011 | Google Maps & Local Presence | TODO | Maps integration and Google Business Profile | Product/SEO | Week 4 |
| P0-F012 | Local SEO Foundation | TODO | Search-friendly Arabic/English pages for Ajman | SEO/Frontend | Week 4 |
| P0-F013 | WhatsApp & Call Contact | TODO | Direct contact actions from website | Frontend | Week 2 |

### Should Have — P1

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P1-F001 | Order Confirmation | TODO | Customer confirmation after request/payment | Full Stack | Week 3 |
| P1-F002 | Promo Codes | TODO | Basic discounts and promotional codes | Full Stack | Week 4 |
| P1-F003 | Catering Availability | TODO | Admin date blocking/availability management | Full Stack | Week 3 |
| P1-F004 | Basic Operations Dashboard | TODO | Orders, payments and basic sales overview | Frontend | Week 3 |
| P1-F005 | Commission Report | TODO | Commissionable orders and amounts | Full Stack | Week 3 |
| P1-F006 | Customer Order History | TODO | Customer-accessible previous orders when account exists | Full Stack | Week 4 |
| P1-F007 | Menu Search & Filters | TODO | Find relevant menu/package items quickly | Frontend | Week 4 |
| P1-F008 | Cancellation & Refund Workflow | TODO | Operational cancellation/refund statuses | Full Stack | Week 4 |

### Could Have — P2

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P2-F001 | Saved Customer Details | TODO | Reuse customer contact/event information | Full Stack | Future |
| P2-F002 | Reorder | TODO | Repeat a previous eligible regular order | Full Stack | Future |
| P2-F003 | Bulk Admin Actions | TODO | Manage multiple orders efficiently | Frontend | Future |
| P2-F004 | Advanced Analytics | TODO | Detailed conversion and sales reporting | Product/Data | Future |
| P2-F005 | Automated Deposit Rules | TODO | Determine deposit automatically using configured rules | Backend | Future |

### Won't Have — P3

| ID | Feature | Status | Description | Assigned To | Sprint |
|---|---|---|---|---|---|
| P3-F001 | Native Mobile App | SKIPPED | Dedicated Android/iOS applications | N/A | v2+ |
| P3-F002 | Driver Live Tracking | SKIPPED | Live delivery location | N/A | v2+ |
| P3-F003 | Loyalty Program | SKIPPED | Points/rewards system | N/A | v2+ |
| P3-F004 | Marketplace Integrations | SKIPPED | Talabat/Deliveroo/Careem integrations | N/A | v2+ |
| P3-F005 | AI Chatbot | SKIPPED | Automated conversational assistant | N/A | v2+ |
| P3-F006 | ERP/CRM Integration | SKIPPED | Enterprise back-office integrations | N/A | v2+ |

---

## 7. Functional Requirements

### P0-F001 — Bilingual Website

**Description:**  
Provide Arabic and English versions of the commercial website.

**User Story:**  
As a customer, I want to use the site in Arabic or English so that I can understand the restaurant's services comfortably.

**Trigger:** Customer opens Umodai website.

**Pre-conditions:** Website is available.

**Post-conditions:** Customer views content in selected language.

**Main Flow:**

1. Customer enters the website.
2. System detects/defaults language according to configured rules.
3. Customer may switch Arabic/English.
4. Interface switches content and layout.
5. Arabic renders RTL.
6. Selected language persists during browsing.

**Alternate Flow:** Requested translation is unavailable → default content is shown without breaking navigation.

**Acceptance Criteria:**

- [ ] Arabic interface renders RTL.
- [ ] English interface renders LTR.
- [ ] Language can be switched manually.
- [ ] Core commercial content exists in both languages.
- [ ] Menu and catering information supports both languages.
- [ ] Mobile layout functions correctly in both directions.

### P0-F002 — Menu & Catering Catalog

**Description:**  
Customers can view regular menu items and dedicated catering packages.

**User Story:**  
As a customer, I want to browse food and catering options before placing a request.

**Trigger:** Customer opens Menu or Catering.

**Main Flow:**

1. System loads active items.
2. Customer views image, name, description, category and price where applicable.
3. Customer selects an item/package.
4. System displays detailed information.
5. Customer adds item to regular order or proceeds to catering request.

**Alternate Flow:** Item is unavailable → system displays unavailable status and prevents ordering.

**Acceptance Criteria:**

- [ ] Admin can activate/deactivate items.
- [ ] Prices display in AED.
- [ ] Catering packages can include guest-count information.
- [ ] Unavailable items cannot be ordered.
- [ ] Images are optimized before display.

### P0-F003 — Catering Request Workflow

**Description:**  
Collect structured catering requirements before restaurant review.

**User Story:**  
As an event organizer, I want to submit my event requirements so Umodai can provide an appropriate catering arrangement.

**Required Data:**

- Customer name.
- Phone number.
- Email where available.
- Event date.
- Event time.
- Number of guests.
- Selected package/items.
- Event location.
- Notes/special requirements.

**Main Flow:**

1. Customer browses catering.
2. Customer selects package or custom request.
3. Customer enters event information.
4. System validates mandatory fields.
5. Customer submits request.
6. System creates request as `Pending Review`.
7. Restaurant receives request.
8. Restaurant contacts customer by phone.
9. Restaurant confirms feasibility, details and final price.
10. Admin updates request.
11. Admin decides payment requirement.
12. Customer receives payment request when applicable.

**Acceptance Criteria:**

- [ ] Incomplete mandatory requests cannot be submitted.
- [ ] Every request receives a unique identifier.
- [ ] Initial status is Pending Review.
- [ ] Admin can edit confirmed event details.
- [ ] Request is attributable to website source.

### P0-F004 — Regular Online Ordering

**Description:**  
Support direct restaurant orders through the website.

**Main Flow:**

1. Customer browses menu.
2. Customer selects items.
3. Items enter cart.
4. Customer reviews quantity and total.
5. Customer enters contact/order details.
6. System validates order.
7. Customer selects supported payment path.
8. Order is created.
9. Successful payment updates order.
10. Customer receives confirmation.

**Acceptance Criteria:**

- [ ] Cart total is mathematically accurate.
- [ ] Inactive items cannot be purchased.
- [ ] Orders receive unique IDs.
- [ ] Website source is stored.
- [ ] Payment state is stored separately from order state.

### P0-F005 — Admin Order Management

**Description:**  
Administrative interface for restaurant operations.

**Order Status Examples:**

- New
- Pending Review
- Customer Contacted
- Awaiting Payment
- Deposit Paid
- Confirmed
- Preparing
- Completed
- Cancelled

**Acceptance Criteria:**

- [ ] Admin authentication is required.
- [ ] Admin can search and filter orders.
- [ ] Admin can open complete order details.
- [ ] Admin can update operational status.
- [ ] Status history is retained.
- [ ] Customer payment cannot be manually marked successful without appropriate permission/audit data.

### P0-F006 — Online Payment Gateway

**Description:**  
Payments are processed by an external UAE-compatible payment provider.

**Security Rule:**  
Raw card details must never be stored in Umodai or Supabase.

**Main Flow:**

1. System calculates requested payment amount.
2. Backend creates payment transaction.
3. Customer is redirected to or shown secure provider checkout.
4. Customer completes payment.
5. Gateway sends server-side confirmation/webhook.
6. Backend verifies payment.
7. Payment record updates.
8. Linked order updates.
9. Customer sees confirmation.

**Acceptance Criteria:**

- [ ] Payment is not treated as successful from browser redirect alone.
- [ ] Server-side verification/webhook is required.
- [ ] Duplicate webhooks do not duplicate payments.
- [ ] Payment links expire or are invalidated when appropriate.
- [ ] Failed payments leave order recoverable.
- [ ] Supported methods should include cards and, where provider-supported, Apple Pay and Google Pay.

### P0-F007 — Admin-Controlled Catering Deposit

**Description:**  
The restaurant manually selects the financial commitment required for each reviewed catering request.

**Supported Options:**

- No deposit.
- Fixed AED deposit.
- Percentage deposit.
- Full payment.

**Main Flow:**

1. Catering request arrives.
2. Restaurant reviews request.
3. Restaurant calls customer.
4. Price and availability are confirmed.
5. Admin selects payment type.
6. If percentage, admin enters percentage.
7. If fixed amount, admin enters AED amount.
8. System calculates required payment.
9. Admin sends payment request.
10. Customer pays.
11. Successful payment updates request.

**Validation:**

- Deposit cannot exceed total confirmed order value.
- Percentage must be greater than 0 and ≤100.
- Fixed deposit must be positive.
- Changed order value must trigger recalculation/review.

**Acceptance Criteria:**

- [ ] Deposit rule can differ per order.
- [ ] Restaurant retains manual control.
- [ ] Deposit value is recorded at time of payment request.
- [ ] Remaining balance is automatically calculated.
- [ ] Payment request is traceable to the catering order.

### P0-F008 — Payment & Balance Tracking

Each order must expose:

- Confirmed order total.
- Amount requested.
- Amount paid.
- Deposit amount.
- Remaining balance.
- Refund amount.
- Payment status.

**Payment Statuses:**

- Unpaid
- Payment Requested
- Deposit Paid
- Partially Paid
- Fully Paid
- Payment Failed
- Partially Refunded
- Refunded

**Acceptance Criteria:**

- [ ] Remaining balance calculation is accurate.
- [ ] Refunds modify net payment values.
- [ ] Operational order status and payment status remain separate.
- [ ] Payment transaction history is immutable except approved metadata corrections.

### P0-F009 — Website Order Attribution

**Description:**  
Every order originating from the website must be tagged for commercial attribution.

**Acceptance Criteria:**

- [ ] `source = website` stored at order creation.
- [ ] Source cannot be accidentally lost during subsequent status changes.
- [ ] Admin can identify website-generated orders.
- [ ] Commission reports use source data.

### P0-F010 — Commission Tracking

**Description:**  
Calculate commission associated with eligible website orders.

**Example:**

Confirmed website order: AED 3,000  
Commission rate: 7%  
Commission due: AED 210

**Calculation Basis:** `[TBD — gross confirmed order value, collected amount, or net amount after refunds]`

**Acceptance Criteria:**

- [ ] Commission rate is configurable.
- [ ] Commission record references order.
- [ ] Refund treatment is visible.
- [ ] Cancelled orders are excluded according to agreed commercial rules.
- [ ] Report shows order value, collected value and commission.

### P0-F011 — Google Maps & Local Presence

**Description:**  
Make the physical restaurant easily discoverable.

**Acceptance Criteria:**

- [ ] Website displays correct Umodai location.
- [ ] Directions open in Google Maps.
- [ ] Google Business Profile is configured with accurate restaurant data.
- [ ] Website URL is connected to business profile.
- [ ] Restaurant phone and hours are consistent across channels.

### P0-F012 — Local SEO Foundation

**Requirements:**

- Indexable restaurant and catering pages.
- Arabic/English metadata.
- Ajman location signals.
- Structured page headings.
- Restaurant/catering structured data where appropriate.
- Sitemap.
- Robots configuration.
- Canonical URLs.
- Google Search Console.
- Optimized page titles/descriptions.
- Fast mobile pages.

**Acceptance Criteria:**

- [ ] Production pages are crawlable.
- [ ] Sitemap is submitted.
- [ ] Search Console is connected.
- [ ] Core pages contain localized metadata.
- [ ] Arabic and English pages do not create accidental duplicate-content issues.

### P0-F013 — WhatsApp & Call Contact

**Acceptance Criteria:**

- [ ] Phone action works from mobile.
- [ ] WhatsApp action opens correct business conversation.
- [ ] Contact CTAs are visible without interfering with checkout.
- [ ] Source can be tracked where practical.

---

## 8. Non-Functional Requirements

### Performance

- LCP target: ≤2.5 seconds for at least 75% of real-world visits.
- Commercial landing/menu pages should target approximately 1.5–2.0 seconds under good mobile conditions.
- CLS target: ≤0.1.
- INP target: ≤200 ms where practical.
- Images must use responsive sizing and modern formats.
- Server/database operations should generally return within 500 ms excluding third-party gateway latency.

### Security

- HTTPS required.
- TLS used for all external communication.
- Supabase Row Level Security enabled.
- Admin authentication required.
- Least-privilege database access.
- Secrets stored server-side only.
- Raw payment-card data never enters Umodai storage.
- Payment webhooks must be authenticated/verified.
- Input validation performed both client-side and server-side.
- Rate limiting or equivalent abuse protection for sensitive endpoints.
- Audit logging for sensitive admin actions.

### Availability

Target uptime: **99.9%** excluding planned maintenance and external provider failure.

### Scalability

Initial design target:

- <2,000 visitors/month at launch.
- Primarily Ajman-based traffic.
- Architecture must support at least 10× initial traffic without fundamental redesign.

Supabase and Vercel should be configured so capacity can be upgraded independently if demand increases.

### Accessibility

Target: WCAG 2.1 AA for essential customer flows.

### Compatibility

- Current Chrome.
- Current Safari.
- Current Firefox.
- Current Edge.
- Modern Android browsers.
- Modern iOS Safari.

### Data & Privacy

- Store only information necessary for order fulfillment and operations.
- Customer personal information must not be publicly accessible.
- Privacy policy required.
- Cookie notice required where relevant.
- Retention policy to be finalized before production.
- Applicable UAE privacy/data-protection obligations must be reviewed before launch.

### Backups

- Database backups: daily minimum.
- Target retention: 30 days where available/configured.
- Recovery process must be documented.

### Observability

Track:

- Application errors.
- Payment webhook failures.
- Order submission failures.
- Database errors.
- Unusual authentication failures.

Target application error rate: **<0.1% for critical workflows** after stabilization.

---

## 9. Technical Architecture

### Frontend

- Next.js.
- TypeScript.
- Tailwind CSS.
- Responsive mobile-first design.
- Server rendering/static generation where beneficial for SEO.
- Arabic RTL support.
- English LTR support.
- Optimized image loading.

### Backend

Supabase provides:

- PostgreSQL database.
- Authentication.
- Storage.
- Row Level Security.
- Server-side functions.
- Webhook processing support.
- Optional realtime functionality.

### Database Architecture

Primary entities:

#### users
- id
- email
- phone
- role
- created_at

#### customers
- id
- full_name
- phone
- email
- preferred_language
- created_at

#### categories
- id
- name_en
- name_ar
- active

#### menu_items
- id
- category_id
- name_en
- name_ar
- description_en
- description_ar
- price
- image_url
- active

#### catering_packages
- id
- name_en
- name_ar
- description_en
- description_ar
- base_price
- minimum_guests
- active

#### orders
- id
- customer_id
- order_type
- source
- subtotal
- discount
- total
- order_status
- payment_status
- created_at

#### order_items
- id
- order_id
- menu_item_id
- quantity
- unit_price
- total_price

#### catering_requests
- id
- customer_id
- event_date
- event_time
- guest_count
- event_location
- package_id
- customer_notes
- admin_notes
- quoted_total
- status
- source
- created_at

#### payment_requests
- id
- order_id/catering_request_id
- payment_type
- percentage
- fixed_amount
- requested_amount
- expires_at
- status

#### payments
- id
- order_id/catering_request_id
- provider
- provider_transaction_id
- amount
- currency
- status
- paid_at

#### refunds
- id
- payment_id
- amount
- provider_reference
- status
- created_at

#### commissions
- id
- order_id/catering_request_id
- commission_rate
- commission_basis
- eligible_amount
- commission_amount
- status

#### blocked_dates
- id
- date
- reason
- created_by

#### status_history
- id
- entity_type
- entity_id
- old_status
- new_status
- changed_by
- changed_at

### Authentication & Authorization

Supabase Auth.

Roles:

- Admin
- Operations Owner

Customers should not be forced to create an account for the initial catering enquiry unless required by final UX.

Admin tables protected through RLS and server-side checks.

### Infrastructure

**Frontend Hosting:** Vercel  
**Database/Backend:** Supabase  
**Assets:** Supabase Storage and/or image CDN  
**CI/CD:** GitHub Actions / Vercel deployment pipeline  
**DNS:** [TBD]

### External Integrations

- UAE payment gateway — TBD.
- Google Maps.
- Google Business Profile.
- Google Search Console.
- Google Analytics 4.
- WhatsApp.
- Email provider — TBD.
- Optional SMS provider — future/TBD.

---

## 10. Implementation Phases

### Phase 1 — Foundation

**Duration:** Week 1

**Goal:** Establish architecture, content structure and administration foundation.

- [ ] Confirm domain and environments.
- [ ] Initialize Next.js project.
- [ ] Configure TypeScript.
- [ ] Configure Tailwind.
- [ ] Configure Supabase.
- [ ] Create database schema.
- [ ] Implement RLS strategy.
- [ ] Implement admin authentication.
- [ ] Create Arabic/English architecture.
- [ ] Implement base navigation.
- [ ] Implement restaurant information pages.
- [ ] Define menu content import structure.
- [ ] Create initial catering models.
- [ ] Begin payment-provider onboarding.
- [ ] Begin Google Business Profile work.

**Validation:**  
Deployed staging site connects successfully to Supabase and authenticated admin can access protected area.

### Phase 2 — Core Commerce

**Duration:** Week 2

**Goal:** Enable customer discovery and submission of real orders/requests.

- [ ] Build menu.
- [ ] Build menu item details.
- [ ] Build catering packages.
- [ ] Build catering request flow.
- [ ] Build cart.
- [ ] Build regular order flow.
- [ ] Build customer data capture.
- [ ] Build admin order view.
- [ ] Build catering request view.
- [ ] Add WhatsApp.
- [ ] Add call CTA.
- [ ] Add status workflow.
- [ ] Implement source attribution.

**Validation:**  
Test customer can submit a regular order and catering enquiry and both appear correctly in admin.

### Phase 3 — Payments & Operations

**Duration:** Week 3

**Goal:** Convert reviewed requests into paid, trackable commercial orders.

- [ ] Integrate payment gateway.
- [ ] Implement webhook verification.
- [ ] Implement payment records.
- [ ] Implement configurable deposit percentage.
- [ ] Implement configurable fixed deposit.
- [ ] Implement full payment option.
- [ ] Implement no-deposit option.
- [ ] Implement remaining-balance calculation.
- [ ] Implement payment statuses.
- [ ] Implement commission calculations.
- [ ] Build commission report.
- [ ] Build basic operations dashboard.
- [ ] Add availability/date blocking.
- [ ] Add confirmation communication.

**Validation:**  
Complete sandbox flow from catering request → restaurant review → custom deposit → successful payment → confirmed order → commission record.

### Phase 4 — Discoverability & Commercial Polish

**Duration:** Week 4

**Goal:** Make Umodai discoverable and production-ready commercially.

- [ ] Add Google Maps.
- [ ] Complete Google Business Profile setup where verification allows.
- [ ] Implement Local SEO.
- [ ] Add Arabic/English metadata.
- [ ] Create XML sitemap.
- [ ] Configure robots.
- [ ] Connect Google Search Console.
- [ ] Connect GA4.
- [ ] Implement structured data.
- [ ] Optimize images.
- [ ] Optimize Core Web Vitals.
- [ ] Implement promo codes.
- [ ] Implement cancellation/refund workflow.
- [ ] Improve search/filter.
- [ ] Review content and photography.

**Validation:**  
Production candidate passes SEO, performance and functional review.

### Phase 5 — QA & Launch

**Duration:** Week 5

**Goal:** Validate complete commercial workflow and release publicly.

- [ ] Mobile QA.
- [ ] Desktop QA.
- [ ] Arabic RTL QA.
- [ ] English QA.
- [ ] Menu pricing verification.
- [ ] Catering pricing verification.
- [ ] Payment test.
- [ ] Deposit test.
- [ ] Refund test.
- [ ] Commission test.
- [ ] Duplicate webhook test.
- [ ] Order attribution test.
- [ ] Permission/security test.
- [ ] Google Maps test.
- [ ] Contact CTA test.
- [ ] Performance test.
- [ ] Error-state test.
- [ ] Production deployment.
- [ ] Post-launch monitoring.

**Validation:**  
Restaurant Owner and Website & Operations Owner approve production launch.

---

## 11. Product Flow, Edge Cases, API Design & UX Rules

### Primary Catering User Flow

1. Customer searches Google for catering/restaurant services in Ajman or visits Umodai directly.
2. Customer lands on Arabic or English website.
3. Customer opens Catering.
4. Customer browses packages.
5. Customer chooses a package or custom request.
6. Customer enters event date, number of guests, location and contact information.
7. Customer submits request.
8. System creates `Pending Review` request.
9. Restaurant receives request.
10. Restaurant calls customer.
11. Restaurant confirms requirements and availability.
12. Admin enters final price.
13. Admin chooses payment rule for that specific order.
14. System creates payment request.
15. Customer opens secure payment gateway.
16. Customer pays.
17. Payment provider confirms transaction server-side.
18. System updates payment.
19. Catering request becomes confirmed according to configured workflow.
20. Commission record is created/updated.
21. Customer receives confirmation.

### Regular Order User Flow

1. Customer opens Menu.
2. Customer selects items.
3. Customer reviews cart.
4. Customer enters order details.
5. Customer proceeds to payment.
6. Gateway processes payment.
7. System verifies successful transaction.
8. Order becomes confirmed.
9. Restaurant sees new order.
10. Customer sees confirmation.

### Edge Cases

#### Invalid Catering Date
**Condition:** Customer selects invalid/past date.  
**System Behavior:** Submission is blocked.  
**User Feedback:** Clear inline validation requests a valid future date.

#### Blocked Catering Date
**Condition:** Restaurant has marked date unavailable.  
**System Behavior:** Request cannot proceed normally.  
**User Feedback:** Customer is asked to choose another date or contact restaurant.

#### Missing Required Information
**Condition:** Required form field is empty.  
**System Behavior:** Form remains unsent.  
**User Feedback:** Missing fields highlighted inline.

#### Menu Item Becomes Unavailable
**Condition:** Item is deactivated before checkout.  
**System Behavior:** System removes/prevents purchase.  
**User Feedback:** Customer is informed and total recalculates.

#### Payment Failure
**Condition:** Gateway declines/fails.  
**System Behavior:** Order remains unpaid.  
**User Feedback:** Customer sees failure and can retry.

#### Customer Closes Checkout
**Condition:** Customer leaves payment page.  
**System Behavior:** Payment remains pending/unpaid.  
**User Feedback:** Customer can resume payment if request remains valid.

#### Duplicate Webhook
**Condition:** Payment provider sends same confirmation multiple times.  
**System Behavior:** Idempotency prevents duplicate payment.  
**User Feedback:** No duplicate transaction is displayed.

#### Deposit Exceeds Order Total
**Condition:** Admin enters invalid amount.  
**System Behavior:** Save is blocked.  
**User Feedback:** Admin sees validation warning.

#### Order Price Changes After Deposit
**Condition:** Restaurant changes final amount.  
**System Behavior:** Remaining balance recalculates and change is logged.  
**User Feedback:** Updated balance visible to admin/customer where applicable.

#### Unauthorized Admin Access
**Condition:** Non-admin attempts protected action.  
**System Behavior:** Request rejected.  
**User Feedback:** Access denied.

#### Network Failure During Submission
**Condition:** Customer loses connection.  
**System Behavior:** System avoids accidental duplicate submission.  
**User Feedback:** Retry message shown.

#### Duplicate Catering Submission
**Condition:** Customer submits same request twice.  
**System Behavior:** System detects likely duplicate where practical or clearly separates unique request IDs.  
**User Feedback:** Confirmation prevents uncertainty.

### High-Level API Design

#### Public Content
- `GET /api/v1/menu`
- `GET /api/v1/menu/:id`
- `GET /api/v1/catering/packages`
- `GET /api/v1/catering/packages/:id`

#### Orders
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`
- `PUT /api/v1/admin/orders/:id/status`

#### Catering
- `POST /api/v1/catering/requests`
- `GET /api/v1/admin/catering/requests`
- `GET /api/v1/admin/catering/requests/:id`
- `PUT /api/v1/admin/catering/requests/:id`
- `PUT /api/v1/admin/catering/requests/:id/status`

#### Payment Requests
- `POST /api/v1/admin/payment-requests`
- `GET /api/v1/payment-requests/:id`
- `POST /api/v1/payment-requests/:id/checkout`

#### Payments
- `POST /api/v1/payments/webhook`
- `GET /api/v1/admin/payments/:id`
- `POST /api/v1/admin/payments/:id/refund`

#### Admin Menu
- `POST /api/v1/admin/menu`
- `PUT /api/v1/admin/menu/:id`
- `DELETE /api/v1/admin/menu/:id`

#### Commission
- `GET /api/v1/admin/commissions`
- `GET /api/v1/admin/commissions/:id`

### UX Rules

Every customer action must provide:

**Validation:** Problems are identified before or immediately after submission.  
**Loading:** Buttons display progress and cannot accidentally submit twice.  
**Error:** Readable error message explains what failed without exposing internal details.  
**Success:** Clear confirmation with order/request reference.

Additional rules:

- Mobile-first.
- Arabic RTL must be treated as native layout, not visual mirroring afterthought.
- Prices clearly show AED.
- Checkout should minimize unnecessary fields.
- Catering forms may be longer but should be grouped logically.
- Customer should always know whether the request is confirmed or merely submitted.
- A submitted catering enquiry must never visually imply booking confirmation before restaurant approval.
- Payment amount must be shown clearly before gateway redirection.
- Deposit and remaining balance must be visually distinct.
- Important actions require confirmation before destructive changes.

---

## 12. Success Metrics and KPIs

### Business Metrics

| Metric | Target | Measurement |
|---|---:|---|
| Share of new catering enquiries generated through website | ≥20% within 2–3 months | Website requests ÷ all new catering enquiries |
| Qualified visitor conversion | ≥5% | Orders + catering submissions ÷ qualified visitors |
| Website order attribution accuracy | ≥90% initially, target 100% | Audited website orders correctly tagged |
| Commission attribution accuracy | ≥95% | Correct commission records ÷ eligible website orders |

### Product Metrics

| Metric | Target | Measurement |
|---|---:|---|
| Catering form completion | ≥60% of users starting form | Analytics funnel |
| Checkout completion | ≥60% of initiated eligible checkouts | Payment/order funnel |
| Mobile usability | ≥95% critical-flow QA pass | Device/browser test matrix |
| Order submission success | ≥99% | Successful submissions ÷ attempts |

### Payment Metrics

| Metric | Target | Measurement |
|---|---:|---|
| Successful payment-to-order linkage | ≥95%, target 100% | Matched successful gateway payments |
| Duplicate payment records | 0 | Payment reconciliation |
| Deposit calculation accuracy | 100% | Automated + QA reconciliation |

### Technical Metrics

| Metric | Target | Measurement |
|---|---:|---|
| LCP | ≤2.5s for ≥75% users | Core Web Vitals |
| CLS | ≤0.1 | Core Web Vitals |
| INP | ≤200ms where feasible | Core Web Vitals |
| Critical workflow error rate | <0.1% after stabilization | Application monitoring |
| Checkout/order submission failure | <1% excluding customer/gateway declines | Logs + analytics |
| Availability | 99.9% target | Hosting monitoring |

### SEO Metrics

- Google Business Profile successfully live and verified.
- Website indexed by Google.
- Arabic and English commercial pages indexed.
- Search Console active.
- Organic impressions tracked.
- Ajman catering-related queries monitored monthly.

### Tracking Tools

- Google Analytics 4.
- Google Search Console.
- Supabase operational database.
- Payment gateway dashboard.
- Application error monitoring `[TBD]`.

### Review Frequency

- 1 week after launch.
- 2 weeks after launch.
- 30 days after launch.
- Monthly thereafter.

### Owners

Business KPIs: Website & Operations Owner / Restaurant Owner  
Product KPIs: Website & Operations Owner  
Technical KPIs: Development owner

---

## 13. Timeline and Milestones

**Start:** October 2026  
**Target Duration:** Maximum 5 weeks

| Milestone | Description | Due | Status | Owner |
|---|---|---|---|---|
| Kickoff | Scope and product direction approved | Day 1 | TODO | Product Owner |
| PRD Approved | Requirements approved | Week 1 | TODO | Umodai + Website Owner |
| Phase 1 Complete | Architecture/foundation ready | End Week 1 | TODO | Development |
| Phase 2 Complete | Ordering/catering flows ready | End Week 2 | TODO | Development |
| Phase 3 Complete | Payments/deposits/commission ready | End Week 3 | TODO | Development |
| Phase 4 Complete | SEO/maps/polish ready | End Week 4 | TODO | Development/Product |
| Beta Launch | Production candidate tested | Week 5 | TODO | Website Owner |
| Public Launch | Website publicly launched | End Week 5 | TODO | Umodai + Website Owner |

---

## 14. Risk Register

Scoring: High = 3, Medium = 2, Low = 1.

| ID | Description | Likelihood | Impact | Score | Mitigation | Owner |
|---|---|---|---|---:|---|---|
| R001 | Payment gateway approval delayed | Medium | High | 6 | Start onboarding in Week 1; maintain backup gateway option | Website Owner |
| R002 | Google Business verification delayed | Medium | Medium | 4 | Start immediately; do not block website launch | Restaurant Owner |
| R003 | Menu/content/photos unavailable | High | High | 9 | Content deadline in Week 1; temporary approved placeholders only where unavoidable | Restaurant Owner |
| R004 | Scope creep threatens 5-week deadline | High | High | 9 | Enforce P0/P1 scope; defer new features | Product Owner |
| R005 | Restaurant workflow not followed consistently | Medium | High | 6 | Keep admin workflow simple; provide operational guide | Operations Owner |
| R006 | Commission attribution incorrect | Low | High | 3 | Store immutable source field and automated commission linkage | Development |
| R007 | Catering date conflict | Medium | High | 6 | Admin review before confirmation; date-blocking functionality | Restaurant Admin |
| R008 | Duplicate payment webhook | Medium | High | 6 | Implement idempotency and transaction uniqueness | Development |
| R009 | Arabic localization quality issues | Medium | Medium | 4 | Native RTL QA before launch | Product Owner |
| R010 | Poor mobile performance due to food imagery | Medium | High | 6 | Compression, responsive images, lazy loading, CDN | Development |
| R011 | Refund/commission disagreement | Medium | High | 6 | Define commission/refund rules contractually before launch | Commercial Owners |
| R012 | Supabase or external service disruption | Low | High | 3 | Monitoring, backups, graceful error handling | Development |

---

## 15. Stakeholders and Approvals

### Stakeholders

| Name | Role | Involvement | Contact |
|---|---|---|---|
| Umodai | Restaurant Owner | Business approval, pricing, menu, catering operations | [TBD] |
| [TBD] | Website & Operations Owner | Product ownership, development, digital operations, commission reporting | [TBD] |
| ChatGPT | Senior Product Assistant | PRD/product planning support | N/A |
| Payment Provider | Payment Partner | Payments, gateway, refunds | [TBD] |
| Google | Search/Maps Platform | Discovery and business listing | External |

### Approval Gates

| Gate | Approver | Required By | Status |
|---|---|---|---|
| PRD Approval | Umodai + Website Owner | Before development freeze | TODO |
| Menu & Price Approval | Umodai | Before production content freeze | TODO |
| Catering Workflow Approval | Umodai | Before Week 2 completion | TODO |
| Payment Policy Approval | Umodai | Before payment integration release | TODO |
| Commission Rule Approval | Both Commercial Parties | Before launch | TODO |
| Production Launch | Umodai + Website Owner | End Week 5 | TODO |

---

## 16. References and Links

| Resource | Location |
|---|---|
| Design Files | [TBD] |
| Repository | [TBD] |
| API Documentation | [TBD] |
| Architecture Diagram | [TBD] |
| Staging Environment | [TBD] |
| Production Website | [TBD] |
| Supabase Project | [TBD] |
| Vercel Project | [TBD] |
| CI/CD Pipeline | [TBD] |
| Payment Gateway Dashboard | [TBD] |
| Google Business Profile | [TBD] |
| Google Search Console | [TBD] |
| Google Analytics | [TBD] |
| Monitoring Dashboard | [TBD] |
| Domain/DNS | [TBD] |
| Related PRDs | N/A |
| Meeting Notes | [TBD] |

---

## 17. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| v1.0 | 2026-10-06 | Website & Operations Owner / Product Assistant | Initial PRD created |
