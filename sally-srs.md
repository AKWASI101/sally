# Sally — Software Requirements Specification

**Version:** 1.0  
**Date:** May 2026  
**Author:** AOD Webservice  
**Status:** Draft — Pending Name Confirmation

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Stakeholders & Users](#2-stakeholders--users)
3. [System Overview](#3-system-overview)
4. [Functional Requirements](#4-functional-requirements)
   - 4.1 Public Storefront
   - 4.2 Checkout & Order Flow
   - 4.3 Order Tracking
   - 4.4 Admin — Product Management
   - 4.5 Admin — Batch Management
   - 4.6 Admin — Order Management
   - 4.7 Admin — Dashboard
   - 4.8 Notifications
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Models](#6-data-models)
7. [UI Wireframes](#7-ui-wireframes)
   - 7.1 Public: Home
   - 7.2 Public: Shop
   - 7.3 Public: Product Detail
   - 7.4 Public: Cart & Checkout
   - 7.5 Public: Order Confirmation
   - 7.6 Public: Order Tracking
   - 7.7 Admin: Login
   - 7.8 Admin: Dashboard
   - 7.9 Admin: Products List
   - 7.10 Admin: Create/Edit Product
   - 7.11 Admin: Batches
   - 7.12 Admin: Orders List
   - 7.13 Admin: Order Detail
8. [Technical Architecture](#8-technical-architecture)
9. [Deployment](#9-deployment)
10. [Future Scope (v2)](#10-future-scope-v2)
11. [Open Questions & Decisions Log](#11-open-questions--decisions-log)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete software requirements for **Sally**, a web-based e-commerce platform purpose-built for an import/resale business operating in Ghana. It serves as the single source of truth for design, development, and deployment decisions throughout the build.

### 1.2 Background

The business currently operates entirely via WhatsApp — products are posted to a contact list, customers preorder, and the seller ships batches of goods from abroad. This model works but has a hard ceiling: audience is limited to existing contacts, order tracking is manual, and operational overhead grows linearly with volume.

Sally solves this by providing a public-facing storefront that expands reach beyond WhatsApp, and an admin interface that gives the seller operational control — batch management, order tracking, payment confirmation — without relying on chat threads.

WhatsApp will continue to be used alongside Sally during transition. The platform must complement that workflow, not fight it.

### 1.3 Scope

Sally consists of two applications sharing one backend:

- **Public Site** — a customer-facing storefront accessible to anyone
- **Admin Site** — a private management interface for the business owner only

Out of scope for v1: customer accounts/login, automated payment processing, mobile app, multi-vendor support, discount/coupon system.

### 1.4 Definitions

| Term | Meaning |
|---|---|
| Preorder | A product sourced abroad on demand; customers commit before the item is purchased/shipped |
| In-Stock | A product the seller physically has and can ship quickly |
| Batch | A grouped shipment of preorder items sharing the same order deadline and estimated arrival |
| MoMo | Mobile Money (MTN MoMo or Telecel Cash) — primary payment method |
| Order Deadline | The last date a customer can preorder items in a given batch |
| Estimated Arrival | The date a batch is expected to arrive in Ghana |

---

## 2. Stakeholders & Users

### 2.1 Business Owner (Admin User)

Alberta — the seller. She manages everything: lists products, opens/closes batches, confirms payments, updates order status, and handles courier dispatch. She is the only admin user. She is comfortable with smartphones and WhatsApp but is not technical. The admin UI must be operable without a manual.

### 2.2 Customers

Existing WhatsApp contacts migrating to the platform, plus new customers discovered via the public site. They are located across Ghana. They pay via MoMo. They expect clear delivery timelines and a way to check their order status without calling or messaging.

### 2.3 Developer / System Administrator

AOD — responsible for deployment, maintenance, backend changes, and system health. Not available 24/7 for operational tasks; the admin UI must handle all day-to-day operations without developer intervention.

---

## 3. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        SALLY PLATFORM                        │
│                                                             │
│   ┌──────────────────┐         ┌──────────────────────┐    │
│   │   Public Site    │         │      Admin Site       │    │
│   │  (React/Vite)    │         │    (React/Vite)       │    │
│   └────────┬─────────┘         └──────────┬───────────┘    │
│            │                              │                  │
│            └──────────────┬───────────────┘                  │
│                           │                                  │
│                  ┌────────▼────────┐                        │
│                  │  REST API       │                        │
│                  │ (Node/Express)  │                        │
│                  └────────┬────────┘                        │
│                           │                                  │
│              ┌────────────┴────────────┐                    │
│              │                         │                    │
│     ┌────────▼───────┐      ┌─────────▼──────┐            │
│     │  PostgreSQL DB  │      │  File Storage  │            │
│     │                │      │  (local/disk)  │            │
│     └────────────────┘      └────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

Both frontend applications are served as static builds via Nginx. The Express API handles all data operations. PostgreSQL is the single source of truth. Product images are stored on disk and served via Nginx.

---

## 4. Functional Requirements

### 4.1 Public Storefront

**FR-PUB-01 — Product Listing**
The shop page shall display all active products. Each product card shall show: product image, name, price (GHS), product type badge (PREORDER or IN STOCK), and for preorder items, the order deadline.

**FR-PUB-02 — Filtering**
Customers shall be able to filter products by: type (All / Preorder / In Stock), and category (Beauty & Skincare / Fashion & Clothing / Electronics & Gadgets / Home & Kitchen / Other).

**FR-PUB-03 — Product Detail**
Each product shall have a dedicated detail page showing: all images (gallery), full description, price, availability status, stock quantity (for in-stock items), preorder deadline and estimated arrival (for preorder items), and an Add to Cart button.

**FR-PUB-04 — Preorder Deadline Countdown**
For preorder products, a visible countdown timer shall show days/hours remaining until the order deadline closes.

**FR-PUB-05 — Out of Stock / Closed Handling**
Products with zero stock (in-stock) or a passed deadline (preorder) shall still be visible but marked as unavailable. The Add to Cart button shall be disabled with a clear label.

**FR-PUB-06 — Homepage**
The homepage shall display: a hero section with a call-to-action, featured products (admin-curated, up to 8), and a section for currently open preorder batches.

---

### 4.2 Checkout & Order Flow

**FR-ORD-01 — Cart**
Customers shall be able to add multiple products (mix of preorder and in-stock) to a cart. The cart shall persist in browser local storage. Customers shall be able to update quantities and remove items.

**FR-ORD-02 — Checkout Form**
The checkout page shall collect: full name, phone number (used as customer identifier), delivery region (dropdown — all Ghana regions), delivery address (text), and optional order note.

**FR-ORD-03 — MoMo Payment Instructions**
After form submission, the customer shall be shown: the total amount due, the seller's MoMo number, the seller's registered MoMo name, and a unique Order Reference to include in the MoMo payment note. No automated payment processing in v1.

**FR-ORD-04 — Payment Reference Submission**
After paying via MoMo, the customer shall submit their MoMo transaction reference on the confirmation page. This reference is stored against the order for admin verification.

**FR-ORD-05 — Order Reference Generation**
Each order shall be assigned a unique, human-readable reference (e.g. `SAL-2026-00042`). This is the customer's primary identifier for tracking.

**FR-ORD-06 — Mixed Cart Handling**
If a cart contains both preorder and in-stock items, the checkout shall inform the customer that items may arrive at different times. In-stock items ship separately; preorder items ship with their batch.

---

### 4.3 Order Tracking

**FR-TRK-01 — Tracking Page**
A public tracking page shall allow any customer to look up their order using their phone number + order reference.

**FR-TRK-02 — Order Status Display**
The tracking result shall show: order reference, list of items ordered, order date, payment status, fulfillment status, and for preorder items, the batch estimated arrival date.

**FR-TRK-03 — Status States**
An order shall move through the following statuses:

| Status | Meaning |
|---|---|
| PENDING_PAYMENT | Order placed, awaiting MoMo confirmation |
| PAYMENT_CONFIRMED | Admin has verified the MoMo payment |
| PROCESSING | Order is being prepared / included in batch |
| SHIPPED | Item has been dispatched via courier |
| DELIVERED | Customer has received the order |
| CANCELLED | Order was cancelled |

---

### 4.4 Admin — Product Management

**FR-ADM-PROD-01 — Product List**
Admin shall see all products in a table with: image thumbnail, name, category, type, price, stock (for in-stock), status (active/archived), and action buttons.

**FR-ADM-PROD-02 — Create Product**
Admin shall be able to create a product with: name, description, category, type (PREORDER or IN_STOCK), price (GHS), images (up to 5, drag-to-reorder), stock quantity (in-stock only), linked batch (preorder only), and featured toggle.

**FR-ADM-PROD-03 — Edit Product**
All product fields shall be editable after creation. Changing type (preorder ↔ in-stock) shall be allowed with a warning if orders exist.

**FR-ADM-PROD-04 — Archive Product**
Admin shall be able to archive a product (soft delete). Archived products are hidden from the public site but orders referencing them remain intact.

**FR-ADM-PROD-05 — Featured Toggle**
Admin shall be able to mark up to 8 products as featured for homepage display.

---

### 4.5 Admin — Batch Management

**FR-ADM-BATCH-01 — Create Batch**
Admin shall create a batch with: batch name/label (e.g. "May 2026 Shipment"), order deadline date, estimated arrival date, and optional notes.

**FR-ADM-BATCH-02 — Batch List**
Admin shall see all batches with: name, status, order deadline, estimated arrival, number of orders, and total value of orders in the batch.

**FR-ADM-BATCH-03 — Batch Status States**

| Status | Meaning |
|---|---|
| OPEN | Accepting preorders |
| CLOSED | Deadline passed, no new orders |
| SHIPPED | Batch has left origin country |
| ARRIVED | Batch has arrived in Ghana |
| FULFILLED | All orders in batch delivered |

**FR-ADM-BATCH-04 — Close Batch**
Admin shall be able to manually close a batch before its deadline (e.g. if shipment is full). Closing a batch disables all linked preorder products.

**FR-ADM-BATCH-05 — Batch Detail View**
Admin shall be able to view a batch and see: all orders in that batch, subtotals per order, total batch value, and a summary of payment statuses (how many confirmed vs pending).

**FR-ADM-BATCH-06 — Batch Export**
Admin shall be able to export a batch's order list as CSV — containing customer name, phone, delivery region, address, items ordered, and payment status. This supports courier handoff.

---

### 4.6 Admin — Order Management

**FR-ADM-ORD-01 — Order List**
Admin shall see all orders with filters for: status, date range, payment status, and batch. Table columns: order reference, customer name, phone, items count, total, payment status, fulfillment status, order date.

**FR-ADM-ORD-02 — Order Detail**
Admin shall be able to open any order and see: full customer info, itemised list, MoMo reference submitted by customer, payment status, fulfillment status, and a timeline of status changes.

**FR-ADM-ORD-03 — Confirm Payment**
Admin shall be able to mark an order's payment as confirmed. This moves the order from PENDING_PAYMENT to PAYMENT_CONFIRMED.

**FR-ADM-ORD-04 — Update Fulfillment Status**
Admin shall be able to update an order's fulfillment status through the pipeline: PROCESSING → SHIPPED → DELIVERED. Each update shall record a timestamp.

**FR-ADM-ORD-05 — Cancel Order**
Admin shall be able to cancel an order with a required reason note. Stock shall be restored for in-stock items on cancellation.

**FR-ADM-ORD-06 — Add Internal Note**
Admin shall be able to add private notes to any order (not visible to customers).

---

### 4.7 Admin — Dashboard

**FR-ADM-DASH-01 — Summary Cards**
Dashboard shall show: total orders this month, revenue this month (confirmed payments only), pending payment confirmations (requires action), and open batches.

**FR-ADM-DASH-02 — Pending Actions Feed**
A prominent section listing orders that require immediate action: unconfirmed payments sorted by age (oldest first).

**FR-ADM-DASH-03 — Recent Orders**
A table of the 10 most recent orders with quick-access links to order detail.

**FR-ADM-DASH-04 — Batch Status Overview**
Current open batches with deadline countdowns and order counts.

---

### 4.8 Notifications

**FR-NOTIF-01 — Order Placed (Customer)**
When an order is successfully placed, the customer shall receive an SMS confirming: order reference, items summary, total amount, and MoMo payment instructions.

**FR-NOTIF-02 — Payment Confirmed (Customer)**
When admin confirms payment, the customer shall receive an SMS confirming their payment has been received.

**FR-NOTIF-03 — Order Shipped (Customer)**
When admin marks an order as shipped, the customer shall receive an SMS with a courier tracking number if available.

**FR-NOTIF-04 — New Order (Admin)**
When a new order is placed, admin shall receive an SMS alert with order reference and total value.

**FR-NOTIF-05 — SMS Provider**
mNotify SMS API shall be used as the notification provider (supports Ghana numbers natively, GHS billing).

**FR-NOTIF-06 — Notification Failure Handling**
SMS failures shall be logged but shall not block the order flow. The order is created regardless of whether the SMS sends.

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Public pages shall load within 3 seconds on a 3G mobile connection
- API response time for all standard endpoints shall be under 500ms
- Product images shall be compressed and served optimised (WebP where supported)

### 5.2 Security
- Admin site shall be protected by JWT authentication with 8-hour session expiry
- All API inputs shall be validated and sanitised server-side
- SQL queries shall use parameterised statements — no string concatenation
- Rate limiting shall be applied to: checkout endpoint (10 req/min per IP), login endpoint (5 req/min per IP), tracking endpoint (20 req/min per IP)
- HTTP headers shall be hardened via Helmet.js
- HTTPS enforced via Let's Encrypt / Certbot on all routes

### 5.3 Reliability
- Application errors shall be logged with Winston (file + console transport)
- PM2 shall be configured for auto-restart on crash
- Database shall have daily automated backups (pg_dump to local file, retained 14 days)

### 5.4 Usability
- Public site shall be fully responsive — mobile-first design (majority of Ghanaian users are on mobile)
- Admin site shall be usable on tablet and desktop
- All destructive admin actions (cancel order, archive product, close batch) shall require a confirmation dialog

### 5.5 Maintainability
- Database schema changes shall use migration files (node-pg-migrate or similar)
- API shall follow RESTful conventions with consistent response envelopes
- Codebase shall be organised in a monorepo with clear separation: `/api`, `/public-app`, `/admin-app`
- All environment-specific config (DB credentials, MoMo number, mNotify API key) shall use `.env` files — never hardcoded

---

## 6. Data Models

### 6.1 Product

```
Product {
  id                UUID PRIMARY KEY
  name              VARCHAR(200) NOT NULL
  description       TEXT
  category          ENUM (beauty_skincare, fashion_clothing, electronics_gadgets, home_kitchen, other)
  type              ENUM (preorder, in_stock)
  price             NUMERIC(10,2) NOT NULL
  stock_quantity    INTEGER DEFAULT 0          -- in_stock only
  batch_id          UUID REFERENCES Batch      -- preorder only
  images            JSONB                      -- ordered array of image paths
  is_featured       BOOLEAN DEFAULT false
  is_active         BOOLEAN DEFAULT true
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.2 Batch

```
Batch {
  id                UUID PRIMARY KEY
  name              VARCHAR(200) NOT NULL
  status            ENUM (open, closed, shipped, arrived, fulfilled)
  order_deadline    DATE NOT NULL
  estimated_arrival DATE NOT NULL
  notes             TEXT
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.3 Order

```
Order {
  id                UUID PRIMARY KEY
  reference         VARCHAR(20) UNIQUE NOT NULL   -- e.g. SAL-2026-00042
  customer_name     VARCHAR(200) NOT NULL
  customer_phone    VARCHAR(20) NOT NULL
  delivery_region   VARCHAR(100) NOT NULL
  delivery_address  TEXT NOT NULL
  order_note        TEXT
  payment_status    ENUM (pending, confirmed)
  fulfillment_status ENUM (pending_payment, payment_confirmed, processing, shipped, delivered, cancelled)
  momo_reference    VARCHAR(100)
  subtotal          NUMERIC(10,2) NOT NULL
  delivery_fee      NUMERIC(10,2) NOT NULL DEFAULT 0
  total             NUMERIC(10,2) NOT NULL
  cancelled_reason  TEXT
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.4 OrderItem

```
OrderItem {
  id                UUID PRIMARY KEY
  order_id          UUID REFERENCES Order NOT NULL
  product_id        UUID REFERENCES Product NOT NULL
  product_name      VARCHAR(200) NOT NULL      -- snapshot at time of order
  product_price     NUMERIC(10,2) NOT NULL     -- snapshot at time of order
  quantity          INTEGER NOT NULL
  subtotal          NUMERIC(10,2) NOT NULL
}
```

### 6.5 OrderStatusLog

```
OrderStatusLog {
  id                UUID PRIMARY KEY
  order_id          UUID REFERENCES Order NOT NULL
  status            VARCHAR(50) NOT NULL
  note              TEXT
  created_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.6 AdminNote

```
AdminNote {
  id                UUID PRIMARY KEY
  order_id          UUID REFERENCES Order NOT NULL
  note              TEXT NOT NULL
  created_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.7 Admin

```
Admin {
  id                UUID PRIMARY KEY
  email             VARCHAR(200) UNIQUE NOT NULL
  password_hash     VARCHAR(200) NOT NULL
  created_at        TIMESTAMPTZ DEFAULT now()
}
```

---

## 7. UI Wireframes

> Wireframes use ASCII layout notation. All layouts are mobile-first.  
> `[ ]` = button, `( )` = input field, `|...|` = image/media area, `[v]` = dropdown  
> Numbers in brackets like `[1]` denote callout annotations below each wireframe.

---

### 7.1 Public: Home Page

```
┌─────────────────────────────────────────────────────┐
│  SALLY                              [Shop Now] [🛒2] │  [1]
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │          HERO IMAGE / BANNER                │   │  [2]
│  │                                             │   │
│  │   Shop the latest arrivals from abroad.     │   │
│  │   Quality goods. Delivered to your door.    │   │
│  │                                             │   │
│  │          [ Browse Products ]                │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── OPEN PREORDER BATCHES ──────────────────────── │  [3]
│                                                     │
│  ┌───────────────────┐  ┌───────────────────┐      │
│  │ May 2026 Shipment │  │ June 2026 Batch   │      │
│  │ Closes: 20 May    │  │ Closes: 10 Jun    │      │
│  │ ⏱ 12 days left   │  │ ⏱ 33 days left   │      │
│  │ [ Order Now ]     │  │ [ Order Now ]     │      │
│  └───────────────────┘  └───────────────────┘      │
│                                                     │
│  ── FEATURED PRODUCTS ──────────────────────────── │  [4]
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  |IMG|   │  │  |IMG|   │  │  |IMG|   │         │
│  │ Name     │  │ Name     │  │ Name     │         │
│  │ GHS 120  │  │ GHS 45   │  │ GHS 200  │         │
│  │[PREORDER]│  │[IN STOCK]│  │[PREORDER]│         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  ─────────────── [ View All Products ] ─────────── │
│                                                     │
│  ── FOOTER ─────────────────────────────────────── │
│  Sally © 2026 | Contact | Track Order              │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Sticky navigation. Cart icon shows item count badge. On mobile, collapses to hamburger.
2. Hero banner is admin-configurable in v2. For v1, static content edited by developer.
3. Batch cards only appear if at least one batch has OPEN status.
4. Product cards show type badge. Scroll horizontally on mobile; grid on desktop.

---

### 7.2 Public: Shop Page

```
┌─────────────────────────────────────────────────────┐
│  SALLY                              [Shop Now] [🛒2] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Shop  /  All Products                              │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  FILTERS                                    │   │  [1]
│  │                                             │   │
│  │  Type:  [All ▼]    Category: [All ▼]        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  48 products found                                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  |IMG|   │  │  |IMG|   │  │  |IMG|   │         │
│  │ Product  │  │ Product  │  │ Product  │         │
│  │ Name     │  │ Name     │  │ Name     │         │
│  │ GHS 120  │  │ GHS 45   │  │ GHS 200  │         │
│  │[PREORDER]│  │[IN STOCK]│  │[PREORDER]│         │
│  │Closes 20M│  │          │  │Closes 10J│         │  [2]
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  |IMG|   │  │  |IMG|   │  │  |IMG|   │         │
│  │ Product  │  │ Product  │  │ Product  │         │
│  │ GHS 75   │  │ GHS 30   │  │ GHS 180  │         │
│  │[IN STOCK]│  │[SOLD OUT]│  │[PREORDER]│         │  [3]
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
│           [ Load More Products ]                    │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Filters are inline dropdowns on mobile. On desktop they can be a sidebar.
2. Preorder cards show the deadline date abbreviated. Full countdown on product detail page.
3. Sold out / deadline passed items appear greyed out with a SOLD OUT / CLOSED badge.

---

### 7.3 Public: Product Detail Page

```
┌─────────────────────────────────────────────────────┐
│  SALLY                              [Shop Now] [🛒2] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Shop / Beauty & Skincare / Vitamin C Serum         │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │           MAIN PRODUCT IMAGE                │   │  [1]
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│  │ [IMG1] [IMG2] [IMG3] [IMG4] │                   │  [2]
│                                                     │
│  VITAMIN C BRIGHTENING SERUM                        │
│  ★ Beauty & Skincare                               │
│                                                     │
│  GHS 85.00                                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🕐 PREORDER — Closes in 12 days 4 hrs       │   │  [3]
│  │    Estimated arrival: June 15, 2026          │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Quantity:  [ - ]  1  [ + ]                         │  [4]
│                                                     │
│  [ ADD TO CART — GHS 85.00 ]                        │
│                                                     │
│  ── DESCRIPTION ──────────────────────────────────  │
│  Lorem ipsum product description text...            │
│  ...                                                │
│                                                     │
│  ── DELIVERY INFO ────────────────────────────────  │  [5]
│  Nationwide delivery via courier.                   │
│  Delivery fees calculated at checkout.              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Main image takes up most of the viewport on mobile. Tap to zoom.
2. Thumbnail strip for image gallery. Tap to switch main image.
3. For IN_STOCK items, this section shows "In Stock — Ships within 3–5 days" instead.
4. Quantity selector enforces minimum 1. For preorder items no upper limit. For in-stock, capped at stock_quantity.
5. Static section for v1. Admin-configurable in v2.

---

### 7.4 Public: Cart & Checkout

```
┌─────────────────────────────────────────────────────┐
│  SALLY                                   [← Back]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  YOUR CART                                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ |IMG| Vitamin C Serum          GHS 85.00    │   │
│  │       [PREORDER] Batch: May 26 qty: [ 1 ] ✕ │   │
│  ├─────────────────────────────────────────────┤   │
│  │ |IMG| Air Fryer                GHS 420.00   │   │
│  │       [IN STOCK]               qty: [ 2 ] ✕ │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚠️  Mixed cart notice                       │   │  [1]
│  │ Your cart has preorder and in-stock items.  │   │
│  │ They will be shipped separately.            │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── YOUR DETAILS ─────────────────────────────────  │
│                                                     │
│  Full Name     ( Akua Mensah              )         │
│  Phone         ( 0244000000               )         │
│  Region        [Greater Accra           ▼]         │
│  Address       ( House no, street, area   )         │
│  Note          ( Optional message         )         │
│                                                     │
│  ── ORDER SUMMARY ────────────────────────────────  │
│  Items:                            GHS 590.00       │
│  Delivery:                          GHS 30.00       │
│  ─────────────────────────────────────────────      │
│  Total:                            GHS 620.00       │
│                                                     │
│  [ PROCEED TO PAYMENT →  ]                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Mixed cart notice only appears if cart contains both preorder and in-stock items.

---

### 7.5 Public: Order Confirmation / Payment Page

```
┌─────────────────────────────────────────────────────┐
│  SALLY                                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│          ✅ Order Placed Successfully!              │
│                                                     │
│  Your order reference:                              │
│  ┌─────────────────────────────────────────────┐   │
│  │         SAL-2026-00042                      │   │  [1]
│  │         [ Copy Reference ]                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── COMPLETE YOUR PAYMENT ───────────────────────   │
│                                                     │
│  Send GHS 620.00 via Mobile Money to:               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  MoMo Number:   0244 XXX XXX               │   │
│  │  Name:          Alberta [Last Name]         │   │
│  │                                             │   │
│  │  ⚠️  Include your order reference           │   │  [2]
│  │     SAL-2026-00042 in the payment note      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  After paying, enter your MoMo reference below:    │
│                                                     │
│  MoMo Ref  ( e.g. GHxxxxxxxxxxxxxx        )        │  [3]
│                                                     │
│  [ SUBMIT PAYMENT REFERENCE ]                       │
│                                                     │
│  ── or ──                                           │
│                                                     │
│  [ I'll pay later — Track my order ]                │  [4]
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Order reference is prominent and copyable. An SMS has already been sent to the customer's phone with this reference.
2. The order reference in the payment note is critical — this is how admin matches MoMo payments to orders.
3. MoMo reference submission is optional but encouraged. Customer can submit it later via the tracking page.
4. Allows customer to leave and pay later. Order is created with PENDING_PAYMENT status.

---

### 7.6 Public: Order Tracking Page

```
┌─────────────────────────────────────────────────────┐
│  SALLY                                   [← Home]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  TRACK YOUR ORDER                                   │
│                                                     │
│  Phone Number  ( 0244000000               )         │
│  Order Ref     ( SAL-2026-00042           )         │
│                                                     │
│  [ FIND MY ORDER ]                                  │
│                                                     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                     │
│  SAL-2026-00042  •  Placed 5 May 2026              │
│                                                     │
│  Items:                                             │
│  • Vitamin C Serum x1 — GHS 85.00                  │
│  • Air Fryer x2 — GHS 840.00                       │
│  Total: GHS 620.00 (incl. delivery)                 │
│                                                     │
│  ── ORDER STATUS ─────────────────────────────────  │
│                                                     │
│  ●  Order Placed          5 May 2026  ✓            │
│  ●  Payment Confirmed     6 May 2026  ✓            │
│  ●  Processing            —           ⏳           │  [1]
│  ○  Shipped               —                        │
│  ○  Delivered             —                        │
│                                                     │
│  ── PREORDER ITEMS ───────────────────────────────  │
│  Batch: May 2026 Shipment                          │
│  Estimated Arrival: 15 Jun 2026                    │
│                                                     │
│  Have your MoMo reference?                         │
│  ( Enter reference to submit )  [ Submit ]          │  [2]
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Timeline shows completed steps (✓), current step (⏳), and upcoming steps (○).
2. If payment status is still PENDING, the tracking page gives the customer another chance to submit their MoMo reference.

---

### 7.7 Admin: Login

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                    SALLY ADMIN                      │
│                                                     │
│         ┌───────────────────────────────┐          │
│         │                               │          │
│         │  Email    ( admin@sally.com ) │          │
│         │  Password ( ••••••••••••••• ) │          │
│         │                               │          │
│         │  [ SIGN IN ]                  │          │
│         │                               │          │
│         └───────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 7.8 Admin: Dashboard

```
┌─────────────────────────────────────────────────────┐
│  SALLY ADMIN    [Products] [Batches] [Orders] [↩]   │  [1]
├─────────────────────────────────────────────────────┤
│                                                     │
│  Good morning, Alberta.                             │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │ Orders   │ │ Revenue  │ │ Pending  │ │ Open  │ │  [2]
│  │ This Mo. │ │ This Mo. │ │ Payments │ │Batches│ │
│  │    73    │ │GHS 12,400│ │    8 ⚠️  │ │   2   │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────┘ │
│                                                     │
│  ── REQUIRES ACTION ─────────────────────────────   │  [3]
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ SAL-2026-00038 | Ama Boateng | GHS 220      │   │
│  │ MoMo Ref: GH20260503xxxxxx   [Confirm] [✕] │   │
│  ├─────────────────────────────────────────────┤   │
│  │ SAL-2026-00041 | Kofi Asante | GHS 85       │   │
│  │ MoMo Ref: GH20260504xxxxxx   [Confirm] [✕] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── OPEN BATCHES ────────────────────────────────   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ May 2026 Shipment          OPEN             │   │
│  │ Deadline: 20 May  ⏱ 12 days  •  34 orders  │   │
│  │ [ View Batch ]  [ Close Batch ]             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── RECENT ORDERS ───────────────────────────────   │
│                                                     │
│  SAL-00042 | Akua M.   | GHS 620 | CONFIRMED  >    │
│  SAL-00041 | Kofi A.   | GHS 85  | PENDING    >    │
│  SAL-00040 | Efua T.   | GHS 340 | CONFIRMED  >    │
│                          [ View All Orders ]        │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Sidebar nav collapses to top bar on mobile. Logout button `[↩]` always visible.
2. Pending Payments card has a warning indicator if count > 0.
3. Requires Action feed is the most important section — surfaces unconfirmed payments immediately.

---

### 7.9 Admin: Products List

```
┌─────────────────────────────────────────────────────┐
│  SALLY ADMIN    [Products] [Batches] [Orders] [↩]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Products                    [ + Add New Product ]  │
│                                                     │
│  Type: [All ▼]  Category: [All ▼]  Status: [All ▼] │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ IMG │ Vitamin C Serum                       │   │
│  │     │ Beauty • PREORDER • GHS 85.00         │   │
│  │     │ Batch: May 2026 • Active              │   │
│  │     │              [Edit] [Archive]         │   │
│  ├─────────────────────────────────────────────┤   │
│  │ IMG │ Air Fryer 4.5L                        │   │
│  │     │ Home & Kitchen • IN STOCK • GHS 420   │   │
│  │     │ Stock: 5 units • Active ★ Featured   │   │
│  │     │              [Edit] [Archive]         │   │
│  ├─────────────────────────────────────────────┤   │
│  │ IMG │ Silk Blouse                           │   │
│  │     │ Fashion • PREORDER • GHS 150          │   │
│  │     │ Batch: May 2026 • Active              │   │
│  │     │              [Edit] [Archive]         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│             < 1  2  3 >                             │
└─────────────────────────────────────────────────────┘
```

---

### 7.10 Admin: Create / Edit Product

```
┌─────────────────────────────────────────────────────┐
│  SALLY ADMIN                           [← Products] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  New Product                                        │
│                                                     │
│  Product Name   ( Vitamin C Serum        )          │
│  Description    ( textarea...            )          │
│                                                     │
│  Category       [Beauty & Skincare      ▼]         │
│  Type           ( ● Preorder  ○ In Stock )          │  [1]
│                                                     │
│  Price (GHS)    ( 85.00                  )          │
│                                                     │
│  ── IF PREORDER ──────────────────────────────────  │
│  Linked Batch   [May 2026 Shipment      ▼]         │
│                                                     │
│  ── IF IN STOCK ──────────────────────────────────  │
│  Stock Qty      ( 10                     )          │
│                                                     │
│  ── IMAGES ───────────────────────────────────────  │  [2]
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐         │
│  │IMG 1│ │IMG 2│ │IMG 3│ │  +  │ │  +  │         │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘         │
│  Drag to reorder. First image is the cover.        │
│                                                     │
│  Mark as Featured  [ ☐ ]                           │
│                                                     │
│  [ SAVE PRODUCT ]           [ Cancel ]             │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Type toggle shows/hides the relevant fields below (Batch selector vs Stock Qty).
2. Image upload supports up to 5 images. First slot is always the cover image shown on product cards.

---

### 7.11 Admin: Batches

```
┌─────────────────────────────────────────────────────┐
│  SALLY ADMIN    [Products] [Batches] [Orders] [↩]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Batches                        [ + New Batch ]     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ MAY 2026 SHIPMENT              ● OPEN       │   │
│  │ Deadline: 20 May 2026  •  Arrival: 15 Jun   │   │
│  │ 34 orders  •  GHS 8,200 confirmed           │   │
│  │ [View Orders]  [Edit]  [Close Batch]        │   │
│  ├─────────────────────────────────────────────┤   │
│  │ APRIL 2026 SHIPMENT           ● SHIPPED     │   │
│  │ Deadline: 10 Apr  •  Arrival: 5 May 2026   │   │
│  │ 61 orders  •  GHS 14,750                    │   │
│  │ [View Orders]  [Mark Arrived]               │   │
│  ├─────────────────────────────────────────────┤   │
│  │ MARCH 2026 SHIPMENT           ● FULFILLED   │   │
│  │ Deadline: 12 Mar  •  Arrival: 8 Apr 2026   │   │
│  │ 55 orders  •  GHS 11,200                    │   │
│  │ [View Orders]                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### 7.12 Admin: Orders List

```
┌─────────────────────────────────────────────────────┐
│  SALLY ADMIN    [Products] [Batches] [Orders] [↩]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Orders                                             │
│                                                     │
│  Status: [All ▼]  Payment: [All ▼]  Batch: [All ▼] │
│  Date From: ( __ /__ /____ )  To: ( __ /__ /____ )  │
│                                                     │
│  73 orders found                                    │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ SAL-00042 • Akua Mensah • 0244000000       │   │
│  │ 3 items • GHS 620 • PAYMENT CONFIRMED       │   │
│  │ 5 May 2026                         [View >] │   │
│  ├─────────────────────────────────────────────┤   │
│  │ SAL-00041 • Kofi Asante • 0277000000       │   │
│  │ 1 item  • GHS 85  • PENDING PAYMENT ⚠️     │   │
│  │ 5 May 2026                         [View >] │   │
│  ├─────────────────────────────────────────────┤   │
│  │ SAL-00040 • Efua Tetteh • 0200000000       │   │
│  │ 2 items • GHS 340 • SHIPPED                 │   │
│  │ 4 May 2026                         [View >] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│             < 1  2  3  4  5  6  7  8 >             │
└─────────────────────────────────────────────────────┘
```

---

### 7.13 Admin: Order Detail

```
┌─────────────────────────────────────────────────────┐
│  SALLY ADMIN                            [← Orders]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SAL-2026-00042               PAYMENT CONFIRMED     │
│  Placed 5 May 2026, 14:32                          │
│                                                     │
│  ── CUSTOMER ─────────────────────────────────────  │
│  Akua Mensah  •  0244000000                        │
│  Greater Accra Region                              │
│  House 12, Spintex Road, Accra                     │
│  Note: "Please call before delivery"               │
│                                                     │
│  ── ITEMS ────────────────────────────────────────  │
│  Vitamin C Serum x1          GHS 85.00             │
│    [PREORDER] May 2026 Batch                       │
│  Air Fryer 4.5L x2           GHS 840.00            │
│    [IN STOCK]                                      │
│  ─────────────────────────────────────────         │
│  Subtotal: GHS 925.00                              │
│  Delivery: GHS 30.00 (Nationwide)                  │
│  Total:    GHS 955.00                              │  [1]
│                                                     │
│  ── PAYMENT ──────────────────────────────────────  │
│  MoMo Ref: GH20260505XXXXXXXX                     │
│  Status: CONFIRMED  [Change to Pending]            │
│                                                     │
│  ── FULFILLMENT STATUS ───────────────────────────  │
│  ● Payment Confirmed    6 May 2026  ✓              │
│  ● Processing           —          ⏳ CURRENT      │
│  ○ Shipped              —                          │
│  ○ Delivered            —                          │
│                                                     │
│  [ MARK AS SHIPPED ]                               │  [2]
│  Tracking Number  ( Optional courier ref  )        │
│                                                     │
│  ── INTERNAL NOTES ───────────────────────────────  │
│  ( Add a private note...              ) [ Add ]    │
│                                                     │
│  ── DANGER ZONE ──────────────────────────────────  │
│  [ Cancel Order ]                                  │  [3]
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Annotations:**
1. Note: total on this example is GHS 955 — the order summary shows correct arithmetic from order items + delivery.
2. The primary action button always reflects the single logical next step for the order's current status.
3. Cancel Order is visually separated and will trigger a confirmation modal with a required reason field.

---

## 8. Technical Architecture

### 8.1 Repository Structure

```
sally/
├── api/                        # Express REST API
│   ├── src/
│   │   ├── config/             # DB config, env validation
│   │   ├── middleware/         # Auth, error handler, rate limiter
│   │   ├── modules/
│   │   │   ├── products/       # routes, controller, service
│   │   │   ├── batches/
│   │   │   ├── orders/
│   │   │   ├── admin/
│   │   │   └── notifications/
│   │   ├── db/
│   │   │   └── migrations/     # Numbered migration files
│   │   └── utils/
│   ├── .env.example
│   └── package.json
│
├── public-app/                 # Customer-facing React/Vite app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/            # Cart context
│   │   └── api/                # API client layer
│   └── package.json
│
├── admin-app/                  # Admin React/Vite app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── api/                # API client layer
│   └── package.json
│
└── README.md
```

### 8.2 API Structure

All API endpoints are prefixed `/api/v1/`.

Public endpoints (no auth):
```
GET    /products                 List products (with filters)
GET    /products/:id             Product detail
GET    /batches/open             Open batches for homepage
POST   /orders                   Place order
PATCH  /orders/:ref/momo         Submit MoMo reference
GET    /orders/track             Track order (phone + ref query params)
```

Admin endpoints (JWT required):
```
POST   /admin/auth/login

GET    /admin/products
POST   /admin/products
PATCH  /admin/products/:id
DELETE /admin/products/:id       Soft archive

GET    /admin/batches
POST   /admin/batches
PATCH  /admin/batches/:id
GET    /admin/batches/:id/orders
GET    /admin/batches/:id/export  CSV download

GET    /admin/orders
GET    /admin/orders/:id
PATCH  /admin/orders/:id/payment
PATCH  /admin/orders/:id/status
POST   /admin/orders/:id/notes
DELETE /admin/orders/:id         Cancel

GET    /admin/dashboard
```

### 8.3 Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| Public Frontend | React 18 + Vite | Familiar, fast builds, good ecosystem |
| Admin Frontend | React 18 + Vite | Same codebase patterns as public |
| Backend | Node.js + Express | Consistent with existing AOD Webservice skills |
| Database | PostgreSQL 16 | Relational integrity, already on aodserver |
| ORM / Query | node-postgres (pg) | Lightweight, full SQL control |
| Migrations | node-pg-migrate | Simple, SQL-based, trackable |
| Auth | JWT (jsonwebtoken) | Stateless, simple for single admin user |
| File Uploads | Multer + local disk | No external storage needed at this volume |
| SMS | mNotify SMS API | Ghana-native, GHS billing, reliable delivery |
| HTTP Hardening | Helmet.js | Standard security headers |
| Rate Limiting | express-rate-limit | Protects checkout and auth endpoints |
| Logging | Winston | File + console, structured logs |
| Process Manager | PM2 | Auto-restart, cluster mode, log management |
| Reverse Proxy | Nginx | Static file serving, SSL termination |
| SSL | Let's Encrypt / Certbot | Free, auto-renewal |

---

## 9. Deployment

### 9.1 Environment

Server: DigitalOcean VPS (existing), Ubuntu 24.04  
Domain: TBD (to be configured with A record pointing to VPS IP)

### 9.2 Directory Layout on Server

```
/var/www/sally/
├── api/              # Express app, managed by PM2
├── public-app/       # Built static files served by Nginx
├── admin-app/        # Built static files served by Nginx
└── uploads/          # Product images
```

### 9.3 Nginx Configuration (outline)

```
server {
    server_name sally.yourdomain.com;

    # Public app
    location / {
        root /var/www/sally/public-app;
        try_files $uri /index.html;
    }

    # Admin app
    location /admin {
        root /var/www/sally/admin-app;
        try_files $uri /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
    }

    # Uploaded images
    location /uploads {
        root /var/www/sally;
    }
}
```

### 9.4 PM2 Configuration

```json
{
  "name": "sally-api",
  "script": "src/index.js",
  "instances": 2,
  "exec_mode": "cluster",
  "env_production": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

### 9.5 Backup Strategy

Daily cron job at 02:00 WAT:
```bash
pg_dump sally_prod > /backups/sally_$(date +%Y%m%d).sql
# Retain last 14 days, delete older files
```

---

## 10. Future Scope (v2)

These features are explicitly out of scope for v1 but should be considered in architectural decisions to avoid painful rework:

| Feature | Notes |
|---|---|
| Customer accounts | Login via phone + OTP. Enables order history, saved addresses |
| Automated MoMo verification | Paystack or mNotify API integration |
| Product reviews | Customers rate purchased items |
| Discount codes | Percentage or fixed-amount codes |
| Delivery fee calculator | Region-based fee table instead of flat fee |
| Admin analytics | Charts for revenue trends, popular products, customer retention |
| WhatsApp notifications | Replace SMS with WhatsApp Business API messages |
| Multi-currency display | Show USD equivalent alongside GHS |
| Platform generalisation | Multi-tenant SaaS version for other import sellers |

---

## 11. Open Questions & Decisions Log

| # | Question | Status | Decision |
|---|---|---|---|
| 1 | Platform name confirmed? | ❓ Open | Using "Sally" as placeholder |
| 2 | What is the MoMo number / registered name to display at checkout? | ❓ Open | To be provided by Alberta |
| 3 | What is the flat delivery fee for nationwide courier? | ❓ Open | To be confirmed — or is it region-based? |
| 4 | Domain name for the platform? | ❓ Open | To be purchased and configured |
| 5 | Should the public site be a subdomain of an existing domain or standalone? | ❓ Open | |
| 6 | mNotify SMS — does Alberta have or need a registered sender ID? | ❓ Open | Affects SMS deliverability |
| 7 | Should admin be at `/admin` path or a separate subdomain e.g. `admin.sally.com`? | ❓ Open | |
| 8 | Maximum order value before additional verification is needed? | ❓ Open | Risk management consideration |

---

*End of Document — Sally SRS v1.0*
