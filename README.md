# King Sally Imports Platform

King Sally Imports is a full-stack e-commerce platform purpose-built for an import/resale business operating in Ghana. It transitions the business from a manual WhatsApp-based ordering model to a robust web-based storefront and admin management system.

## Project Structure

This monorepo contains three main applications:

- `api/`: Node.js/Express REST API and PostgreSQL database
- `storefront-app/`: Customer-facing React/Vite storefront
- `admin-app/`: Private management interface for the business owner

## Features

### Public Storefront
- Browse and filter products (In-Stock and Preorder)
- View product details, image galleries, and preorder deadlines
- Add items to a shopping cart (persisted in local storage)
- Checkout flow with Mobile Money (MoMo) payment instructions
- Order tracking via phone number and unique order reference

### Admin Dashboard
- JWT-authenticated private dashboard
- Manage products and preorder batches
- Track revenue, open batches, and pending payment confirmations
- Update order fulfillment statuses (Pending -> Confirmed -> Processing -> Shipped -> Delivered)
- Export batch lists as CSV for courier handoff

## Technology Stack

- **Frontend:** React 18, Vite, vanilla CSS with Lucide Icons
- **Backend:** Node.js, Express
- **Database:** PostgreSQL 16, `pg` (node-postgres), `node-pg-migrate`
- **Notifications:** mNotify SMS API
- **Deployment:** DigitalOcean VPS, Nginx, PM2, Let's Encrypt

## Development Progress

**Version 1.0 (MVP) is officially complete and ready for deployment.**

### Completed Phases:
1. **API & Database Foundation:** Built a secure Express REST API with PostgreSQL, integrated with mNotify for automated SMS updates.
2. **Admin Portal:** Deployed a secure, mobile-first private React dashboard for full lifecycle management of products, batches, and orders.
3. **Public Storefront:** Launched a premium, dynamic React frontend featuring a persistent shopping cart, MoMo checkout integration, and self-service order tracking.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v16+)

### Local Development Setup

To run the platform locally, you will need to open three separate terminal windows to start each application:

```bash
# Terminal 1 — Start the Backend API (runs on port 3000)
cd api
npm install
npm run dev

# Terminal 2 — Start the Admin Dashboard (runs on port 5174)
cd admin-app
npm install
npm run dev

# Terminal 3 — Start the Public Storefront (runs on port 5175)
cd storefront-app
npm install
npm run dev
```

## Documentation

For full project specifications, data models, wireframes, and architectural decisions, refer to the [Software Requirements Specification (SRS)](./sally-srs.md).
