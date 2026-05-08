# Sally

Sally is a full-stack e-commerce platform purpose-built for an import/resale business operating in Ghana. It transitions the business from a manual WhatsApp-based ordering model to a robust web-based storefront and admin management system.

## Project Structure

This monorepo contains three main applications:

- `api/`: Node.js/Express REST API and PostgreSQL database
- `public-app/`: Customer-facing React/Vite storefront
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

- **Frontend:** React 18, Vite
- **Backend:** Node.js, Express
- **Database:** PostgreSQL 16, `pg` (node-postgres), `node-pg-migrate`
- **Notifications:** Hubtel SMS API
- **Deployment:** DigitalOcean VPS, Nginx, PM2, Let's Encrypt

## Getting Started

*(Detailed installation and environment setup instructions will be added here as the individual sub-projects are bootstrapped).*

## Documentation

For full project specifications, data models, wireframes, and architectural decisions, refer to the [Software Requirements Specification (SRS)](./sally-srs.md).
