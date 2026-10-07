# SUNLINE

SUNLINE is a full-stack e-commerce application for a premium Tunisian women's
denim brand. It combines a public storefront, customer accounts, guest and
authenticated shopping carts, checkout and order tracking, wishlists, and a
protected administration area for catalog and order management.

The repository is organized as a small monorepo:

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS.
- **Backend:** FastAPI, SQLAlchemy 2, Pydantic 2, Alembic.
- **Persistence:** PostgreSQL 16 for durable business data.
- **Session/cart cache:** Redis 7 for guest shopping carts.
- **Media:** Cloudinary integration for product image uploads.
- **Email:** Background email hooks for welcome and order-confirmation emails.
- **Observability:** Optional Sentry integration.
- **Local orchestration:** Docker Compose.
- **CI:** GitHub Actions for backend lint/import checks and frontend lint/build.

> This README describes the code that currently exists in the repository. It
> distinguishes implemented functionality from planned or placeholder
> functionality so it can also serve as a technical handoff document.

## Contents

- [Product capabilities](#product-capabilities)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Frontend](#frontend)
- [Backend](#backend)
- [Data model](#data-model)
- [Authentication and authorization](#authentication-and-authorization)
- [Cart and checkout behavior](#cart-and-checkout-behavior)
- [API reference](#api-reference)
- [Configuration](#configuration)
- [Local development](#local-development)
- [Database migrations and seed data](#database-migrations-and-seed-data)
- [Docker Compose](#docker-compose)
- [Testing and CI](#testing-and-ci)
- [Security and operational notes](#security-and-operational-notes)
- [Known gaps and next steps](#known-gaps-and-next-steps)
- [Design conventions](#design-conventions)

## Product capabilities

### Customer-facing storefront

- Branded landing page for the SS26 collection.
- Shop page with:
  - Fit filtering: Straight, Wide Leg, Skinny, Mom Jeans, and Flare.
  - Color and size filtering.
  - Minimum and maximum price filtering.
  - In-stock filtering.
  - Featured, price-ascending, and price-descending sorting.
  - French-aware full-text search through PostgreSQL.
- Product detail pages addressed by product slug.
- Product image galleries and product variants.
- Cart pages with quantity updates, removal, subtotal, delivery fee, and total.
- Wishlist pages for authenticated users.
- Account page and authenticated order history.
- Guest and authenticated checkout.
- Order confirmation pages addressed by order number.
- About, FAQ, contact, and newsletter UI pages.
- Responsive storefront layout with shared header and footer.

### Administration

The admin area provides:

- Product list including inactive products.
- Product creation and editing.
- Product activation/deactivation.
- Variant creation, editing, deletion, SKU management, stock, and optional
  price overrides.
- Product image upload and deletion through Cloudinary.
- Order list and order detail views.
- Order status and payment status updates.

Admin API endpoints require a valid access token belonging to a user with
`is_admin = true`. Browser requests to `/admin/*` also pass through a separate
server-side Basic Auth middleware when `ADMIN_BASIC_AUTH_USER` and
`ADMIN_BASIC_AUTH_PASS` are configured.

## Architecture

```text
Browser
  |
  | Next.js pages, React components, AppStateContext
  v
Frontend container :3000
  |
  | JSON over HTTP, cookies, Bearer access token
  v
FastAPI backend :8000
  |             \
  |              \ Redis guest-cart hashes
  v
PostgreSQL       Redis
  |
  \-- Cloudinary for admin product image uploads
  \-- Brevo/email service hooks for background notifications
  \-- Sentry (optional)
```

### Request and data flow

1. Next.js server-rendered pages and browser components call the shared
   `frontend/src/lib/api.ts` wrapper.
2. The wrapper selects `INTERNAL_API_URL` for server-side requests and
   `NEXT_PUBLIC_API_URL` in the browser.
3. Requests include credentials so the backend can use refresh-token and guest
   cart cookies.
4. FastAPI routers validate request data with Pydantic schemas.
5. SQLAlchemy reads and writes PostgreSQL models.
6. Redis stores guest cart contents using a 30-day TTL.
7. Checkout locks product-variant rows with `FOR UPDATE`, validates stock,
   deducts inventory, creates an order, and clears the applicable cart.

## Repository structure

```text
sunline-project/
├── backend/
│   ├── app/
│   │   ├── core/              Settings, DB, Redis, security, dependencies
│   │   ├── models/            SQLAlchemy entities
│   │   ├── routers/           Public, customer, and admin API routes
│   │   ├── schemas/           Pydantic request/response contracts
│   │   ├── services/          Cart, order, and email business logic
│   │   └── scripts/           Seed and admin-user utilities
│   ├── alembic/               Database migrations
│   ├── product.json           Product seed/input data
│   ├── variant.json           Variant seed/input data
│   ├── requirements.txt       Runtime Python dependencies
│   ├── requirements-dev.txt   Runtime plus development dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/app/               Next.js routes and pages
│   ├── src/components/        Reusable UI and feature components
│   ├── src/context/           Global client state
│   ├── src/lib/               API client and shared utilities
│   ├── src/types/             TypeScript API/domain types
│   ├── public/                Static assets
│   └── Dockerfile
├── .github/workflows/ci.yml   Backend and frontend CI
└── docker-compose.yml         PostgreSQL, Redis, backend, frontend
```

## Frontend

### Main routes

| Route | Purpose |
| --- | --- |
| `/` | Home page, collection hero, benefits, fits, best sellers, story, newsletter |
| `/shop` | Product listing, filters, search, and sorting |
| `/product/[slug]` | Product detail and variant selection |
| `/cart` | Current guest or customer cart |
| `/checkout` | Shipping and payment-method submission |
| `/order/[order_number]` | Order confirmation/details |
| `/login` | Customer login |
| `/account` | Account overview |
| `/account/orders` | Authenticated order history |
| `/wishlist` | Authenticated wishlist |
| `/about` | Brand story |
| `/faq` | FAQ content |
| `/contact` | Contact page |
| `/admin` | Admin dashboard shell |
| `/admin/products` | Catalog administration |
| `/admin/orders` | Order administration |

The `AppStateProvider` hydrates the current user, cart count, and wishlist
state on first load. Access tokens are stored in browser `localStorage`;
refresh tokens remain in an HTTP-only cookie managed by the backend.

The visual system is centralized in
[`frontend/tailwind.config.ts`](frontend/tailwind.config.ts): `ink`, `lavender`,
`gray`, and `ivory` are the primary brand colors. Product images can come from
Cloudinary or the development `placehold.co` host configured in
[`frontend/next.config.js`](frontend/next.config.js).

## Backend

### API modules

- `health.py`: database and Redis health checks.
- `products.py`: public active-product catalog and detail lookup.
- `auth.py`: registration, login, token refresh, logout, and current-user lookup.
- `cart.py`: guest and authenticated cart operations.
- `wishlist.py`: authenticated wishlist operations.
- `orders.py`: guest or authenticated checkout, account order history, and order
  lookup.
- `admin_products.py`: protected product, variant, and image administration.
- `admin_orders.py`: protected order management.

### Services

- `services/cart.py` contains cart identity, Redis guest-cart operations,
  database-cart operations, stock checks, delivery pricing, and response
  shaping.
- `services/order.py` creates orders from either cart type and owns the
  concurrency-safe inventory deduction flow.
- `services/email.py` is used by FastAPI background tasks for welcome and order
  confirmation messages.

### Health endpoint

`GET /api/health` checks both dependencies and returns a response shaped like:

```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok"
}
```

The top-level `GET /` endpoint returns the API status and the documentation
path. Interactive API documentation is available at `/docs`; ReDoc is
available at `/redoc`.

## Data model

PostgreSQL contains the following principal entities:

| Entity | Purpose |
| --- | --- |
| `users` | Customer identity, password hash, active flag, admin flag |
| `addresses` | User address records |
| `products` | Name, slug, description, fit, pricing, active state, care instructions |
| `product_variants` | Product color, size, SKU, stock, optional price override |
| `product_images` | Product image URL, alt text, order, primary-image flag |
| `carts` | One persistent cart for an authenticated user |
| `cart_items` | Variant quantities in persistent carts |
| `wishlists` | User-to-product wishlist relationship |
| `orders` | Checkout snapshot, totals, fulfillment status, payment status |
| `order_items` | Immutable product/variant and price snapshot for an order |

Important relationships:

- A product has many variants and images.
- A variant belongs to one product and can appear in cart and order items.
- A user can have one cart, many orders, many addresses, and many wishlist rows.
- An order can be associated with a user, but `user_id` is nullable for guest
  checkout.
- Order shipping fields are copied into the order at checkout so historical
  orders do not change when a customer later edits an address.
- Product and variant deletion is constrained by existing order references;
  deactivating a product is the safer way to remove it from the storefront.

## Authentication and authorization

### Customer sessions

- Passwords are hashed with bcrypt through Passlib.
- Access tokens are JWTs with a 15-minute default lifetime.
- Refresh tokens are JWTs with a 30-day default lifetime and are stored in an
  HTTP-only cookie scoped to `/api/auth`.
- The frontend stores only the access token in `localStorage`.
- `GET /api/auth/me` validates the access token and returns the active user.
- Invalid or expired access tokens produce `401 Unauthorized`.
- Inactive users cannot authenticate successfully.

### Admin protection

There are two independent protections:

1. Next.js middleware protects `/admin/:path*` using server-side Basic Auth and
   fails closed with `503` if the Basic Auth environment variables are absent.
2. Every admin API dependency checks both the JWT and `User.is_admin`.

This means configuring the browser middleware does not replace backend
authorization, and backend authorization does not expose the admin pages
without the middleware credentials.

## Cart and checkout behavior

### Guest carts

- A guest receives the HTTP-only `sunline_cart_session` cookie.
- Redis stores a hash named `guest_cart:<session-key>`.
- Guest cart entries expire after 30 days.
- Stock is checked before adding or updating a guest-cart line.
- Guest carts do not require an account.

### Authenticated carts

- Authenticated users have a PostgreSQL cart and cart items.
- On login, the current guest cart is merged into the user cart.
- The guest cart cookie is deleted after the merge.

### Pricing

- The default delivery fee is **8.00 DT**.
- Delivery is free when the subtotal reaches **200.00 DT**.
- A variant `price_override` takes precedence over the product base price.

### Checkout consistency

Checkout:

1. Resolves the guest or authenticated cart.
2. Reloads all variants with row locks.
3. Validates stock while the locks are held.
4. Calculates subtotal, delivery, and total.
5. Creates the order and immutable order-item snapshots.
6. Decrements stock in the same transaction.
7. Clears the source cart.
8. Queues an order-confirmation email.

Order numbers use the `SL######` format. Guest orders can be retrieved by
order number; orders belonging to an account require that account to be
authenticated.

## API reference

All routes below are prefixed by `/api`.

### Public and customer routes

| Method | Path | Authentication | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | None | Check PostgreSQL and Redis |
| `GET` | `/products` | None | List active products with filters/search/sorting |
| `GET` | `/products/{slug}` | None | Get one active product |
| `POST` | `/auth/register` | None | Register a customer |
| `POST` | `/auth/login` | None | Login and issue an access token |
| `POST` | `/auth/refresh` | Refresh cookie | Rotate access and refresh tokens |
| `POST` | `/auth/logout` | Optional | Delete the refresh cookie |
| `GET` | `/auth/me` | Access token | Get the current customer |
| `GET` | `/cart` | Guest or access token | Read the applicable cart |
| `POST` | `/cart/items` | Guest or access token | Add quantity for a variant |
| `PUT` | `/cart/items/{variant_id}` | Guest or access token | Set variant quantity |
| `DELETE` | `/cart/items/{variant_id}` | Guest or access token | Remove a variant |
| `GET` | `/wishlist` | Access token | Read the current wishlist |
| `POST` | `/wishlist/items/{product_id}` | Access token | Add a product |
| `DELETE` | `/wishlist/items/{product_id}` | Access token | Remove a product |
| `POST` | `/orders` | Guest or access token | Convert the current cart to an order |
| `GET` | `/orders` | Access token | List the current user's orders |
| `GET` | `/orders/{order_number}` | Conditional | Read a guest receipt or owned order |

### Admin routes

All admin routes require an access token for a user with `is_admin = true`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/products` | List all products, including inactive products |
| `GET` | `/admin/products/{product_id}` | Read product details |
| `POST` | `/admin/products` | Create a product |
| `PATCH` | `/admin/products/{product_id}` | Update product fields |
| `DELETE` | `/admin/products/{product_id}` | Delete a product when referential integrity allows |
| `POST` | `/admin/products/{product_id}/variants` | Add a variant |
| `PATCH` | `/admin/products/{product_id}/variants/{variant_id}` | Update a variant |
| `DELETE` | `/admin/products/{product_id}/variants/{variant_id}` | Delete a variant |
| `POST` | `/admin/products/{product_id}/images` | Upload a product image |
| `DELETE` | `/admin/products/{product_id}/images/{image_id}` | Delete a product image |
| `GET` | `/admin/orders` | List all orders |
| `GET` | `/admin/orders/{order_number}` | Read any order |
| `PATCH` | `/admin/orders/{order_number}/status` | Update fulfillment/payment status |

## Configuration

Copy the example files before starting the services:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env.local
```

### Backend variables

| Variable | Purpose | Local example |
| --- | --- | --- |
| `ENV` | Runtime environment | `development` |
| `DEBUG` | Cookie/security development mode | `true` |
| `DATABASE_URL` | PostgreSQL SQLAlchemy URL | `postgresql://sunline:sunline@localhost:15432/sunline_db` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT signing secret | Long random value |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh-token lifetime | `30` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud | Empty for placeholder images |
| `CLOUDINARY_API_KEY` | Cloudinary key | Empty for local catalog-only work |
| `CLOUDINARY_API_SECRET` | Cloudinary secret | Empty for local catalog-only work |
| `BREVO_API_KEY` | Email provider key | Empty disables provider delivery |
| `SENDER_EMAIL` | Sender email | `hello@sunline.tn` |
| `SENDER_NAME` | Sender display name | `SUNLINE` |
| `SENTRY_DSN` | Optional Sentry DSN | Empty disables Sentry |

The backend settings are defined in
[`backend/app/core/config.py`](backend/app/core/config.py). Never commit
`backend/.env` or real credentials.

### Frontend variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Browser-visible backend base URL, normally `http://localhost:8000` |
| `INTERNAL_API_URL` | Optional server-side Docker URL, normally `http://backend:8000` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Public Cloudinary cloud name |
| `NEXT_PUBLIC_GA_ID` | Optional analytics ID |
| `ADMIN_BASIC_AUTH_USER` | Server-only admin middleware username |
| `ADMIN_BASIC_AUTH_PASS` | Server-only admin middleware password |

Do not prefix secrets with `NEXT_PUBLIC_`; Next.js exposes those variables to
the browser bundle.

## Local development

### Prerequisites

- Git
- Docker Desktop with Docker Compose
- Python 3.11
- Node.js 20 and npm

### Option A: run infrastructure in Docker and applications locally

Start only PostgreSQL and Redis:

```powershell
docker compose up -d postgres redis
```

Create and activate the backend environment:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload --port 8000
```

In a second terminal, start the frontend:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Open:

- Storefront: <http://localhost:3000>
- API root: <http://localhost:8000>
- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Health: <http://localhost:8000/api/health>

When the backend runs on Windows outside Docker, use host port `15432` in
`DATABASE_URL`, because Compose maps PostgreSQL's container port 5432 to
localhost port 15432.

### Option B: run the complete stack in Docker

Create `backend/.env` first, then run:

```powershell
docker compose up --build
```

The frontend is available at `http://localhost:3000` and the API at
`http://localhost:8000`. The backend container applies `alembic upgrade head`
before starting Uvicorn.

Stop services while retaining data:

```powershell
docker compose down
```

Stop services and remove the named development volumes:

```powershell
docker compose down -v
```

The last command deletes local PostgreSQL and Redis data. Use it only when that
data is disposable.

## Database migrations and seed data

Alembic migrations are stored in
[`backend/alembic/versions`](backend/alembic/versions). The migration chain
currently includes:

1. Initial schema.
2. Cloudinary public ID for product images.
3. `is_admin` for users.
4. Email snapshot on orders.
5. French-aware product full-text search.

Useful commands from `backend`:

```powershell
alembic current
alembic history
alembic upgrade head
alembic downgrade -1
```

Seed the development catalog:

```powershell
python -m app.scripts.seed
```

The seed script is intentionally repeatable for local development and creates
two example products with variants and placeholder images. It clears existing
product images, variants, and products before inserting the sample catalog.
Do not run it against production data.

Create or promote an administrator:

```powershell
python -m app.scripts.create_admin admin@example.com "use-a-strong-password" "Store Admin"
```

## Docker Compose

The Compose file defines:

| Service | Image/build | Host port | Purpose |
| --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | `15432` | Durable relational data |
| `redis` | `redis:7-alpine` | `6379` | Guest carts and cache |
| `backend` | `backend/Dockerfile` | `8000` | FastAPI API |
| `frontend` | `frontend/Dockerfile` | `3000` | Next.js application |

Named volumes `sunline_pg_data` and `sunline_redis_data` preserve local data
between container restarts.

## Testing and CI

### Backend commands

```powershell
cd backend
ruff check .
black --check .
pytest
```

The repository currently has development test dependencies and CI collection
support, but no committed test suite is visible yet. A zero-test collection is
treated as a non-failing condition by the GitHub Actions workflow.

### Frontend commands

```powershell
cd frontend
npm ci
npm run lint
npm run build
npm run dev
```

### GitHub Actions

[`ci.yml`](.github/workflows/ci.yml) runs on pushes and pull requests targeting
`main`. It:

- Uses Python 3.11 for the backend.
- Installs backend development dependencies.
- Runs Ruff and Black checks.
- Verifies that `app.main` imports successfully.
- Collects backend tests when present.
- Uses Node.js 20 for the frontend.
- Runs `npm ci`, Next.js lint, and a production build.

## Security and operational notes

- Replace the development JWT secret before any shared or production
  deployment.
- Keep all `.env` files and provider credentials out of version control.
- Use HTTPS in non-development environments. Cookie security changes when
  `DEBUG=false`.
- Configure a specific production `FRONTEND_ORIGIN`; do not use a wildcard CORS
  origin with credentials.
- Configure both admin Basic Auth variables in deployments. The middleware
  intentionally returns `503` rather than allowing an unconfigured admin area.
- Use a managed PostgreSQL and Redis service with backups and access controls
  outside local development.
- Product image upload requires valid Cloudinary credentials and should be tested
  separately from catalog CRUD.
- Configure the email provider before relying on welcome or order-confirmation
  delivery. Email work is queued as FastAPI background tasks, not as a durable
  job queue.
- Checkout protects inventory with database row locks, but payment processing is
  currently represented by the `COD` and `online` enum values rather than a
  completed payment-gateway integration.
- Guest order lookup intentionally uses the order number as the receipt
  credential. Treat order numbers as sensitive in customer communications.

## Known gaps and next steps

The codebase is functional in its core catalog/cart/order flows, but the
following areas are incomplete or intentionally lightweight:

- The homepage newsletter form is UI-only; its component contains a TODO for a
  backend newsletter endpoint.
- Online payment is modeled but no payment provider flow is implemented.
- Email delivery depends on the configured provider implementation and is not a
  durable queue.
- Automated application tests should be added for auth, guest-cart merge,
  inventory races, checkout totals, ownership checks, and admin authorization.
- Production deployment documentation, secrets management, migrations in a
  release pipeline, and observability dashboards are not included.
- Development product imagery uses placeholders until Cloudinary assets are
  configured.
- The backend example environment file should be kept synchronized with
  `Settings` when email variable names change; the runtime settings currently
  use `BREVO_API_KEY`, `SENDER_EMAIL`, and `SENDER_NAME`.

## Design conventions

- Keep public API contracts in `backend/app/schemas`.
- Keep database entities in `backend/app/models`; use Alembic for schema
  changes rather than editing the database manually.
- Put cross-route business logic in `backend/app/services` rather than copying
  it into routers.
- Use the existing dependency functions for database sessions and auth:
  `get_db`, `get_current_user`, `get_optional_current_user`, and
  `get_current_admin_user`.
- Keep frontend API calls in `frontend/src/lib/api.ts` and domain types in
  `frontend/src/types`.
- Preserve the shared frontend state flow through `AppStateProvider`.
- Reuse the brand palette from `tailwind.config.ts` instead of adding arbitrary
  component colors.
- Preserve guest-cart support when changing authentication or checkout code.
- Run the smallest relevant lint/build/test command before opening a pull
  request, then run the full CI-equivalent checks for cross-cutting changes.
