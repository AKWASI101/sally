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
- **Notifications:** mNotify SMS API
- **Deployment:** DigitalOcean VPS, Nginx, PM2, Let's Encrypt

## Development Progress

The current phase of development has focused on building the backend API foundation. The following modules and infrastructure are complete:

### Infrastructure & Core
- Express API foundation with robust security middleware (Helmet, CORS).
- Rate limiting configuration for API endpoints and strict limits for auth routes.
- Centralized Winston logger with file and console transports.
- PostgreSQL database connection pool.
- Global centralized error handling.

### Admin & Authentication
- JWT-based authentication for the admin portal.
- Secure login mechanism and session handling.
- High-level admin dashboard summary endpoint.

### Core Modules
- **Batches**: Management of preorder batches (create, update, close).
- **Products**: Product management including image uploading (via Multer), associating with batches, and listing.
- **Orders (Public)**: Order creation with cart items, and order tracking via phone number/reference ID.
- **Orders (Admin)**: Management of order statuses, manual MoMo payment verification, and order list retrieval.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v16+)

*(Detailed installation and environment setup instructions will be expanded as the individual sub-projects are bootstrapped).*

## Documentation

For full project specifications, data models, wireframes, and architectural decisions, refer to the [Software Requirements Specification (SRS)](./sally-srs.md).
