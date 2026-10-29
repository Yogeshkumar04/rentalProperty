# Rental Property

Full-stack rental property management with role-based accounts:
- `apps/web`: Next.js App Router + React + TypeScript (port 3000)
- `apps/api`: NestJS + Mongoose + validated REST API (port 3001)
- MongoDB database: `rental_property`, collection: `properties`

## Run locally

Requires Node.js 20.19+ and Docker Compose (or an existing MongoDB server).

```sh
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:up
npm run dev
```

Open http://localhost:3000 and log in or sign up. The initial admin username is `admin` and password is `admin123@`. The admin account is seeded automatically when the API starts. Rent uses INR. The database starts empty; records persist in a Docker volume.

If using an existing MongoDB server, skip `db:up` and set `MONGODB_URI` in `apps/api/.env`. Restart the apps after changing environment files.

## Checks and production build

```sh
npm run typecheck
npm run build
```

After building, run `npm start -w apps/api` and `npm start -w apps/web` in separate terminals with MongoDB running. Production uses secure session cookies and requires HTTPS; keep the web and API on the same site and configure `WEB_ORIGIN` / `NEXT_PUBLIC_API_URL` for the deployment. The requested default admin credentials are intended for local use.

## Accounts and permissions

- Admin: create/delete landlord and client accounts, and add/edit/delete any property.
- Landlord: sign up, browse all properties, and add/edit/delete their own listings.
- Client: sign up and browse properties; cannot change listings or accounts.
- Public signup only permits landlord or client roles. Passwords are salted and hashed; sessions use HttpOnly cookies, expire after 24 hours, and are revoked on logout or account deletion.
- Deleting a landlord retains their listings for admin management. Existing properties without an owner can only be edited by admin.
- Usernames are case-insensitive, 3–40 letters/numbers/underscores/dots/hyphens. Passwords require 8–128 characters.

Auth endpoints: `POST /api/auth/signup` (`username`, `password`, `role`), `POST /api/auth/login` (`username`, `password`), `GET /api/auth/me`, `POST /api/auth/logout`. Admin account endpoints: `GET /api/users`, `POST /api/users` (`username`, `password`, `role`), `DELETE /api/users/:id`.

To run the API integration checks against a separate test database and running API:

```sh
TEST_API_URL=http://localhost:3028/api node apps/api/test/auth.integration.cjs
```

The checks create and delete test accounts/listings; use an isolated database.

## REST API

All property endpoints require a logged-in session. Write permissions are enforced by the API.

| Method | Endpoint | Action |
| --- | --- | --- |
| GET | /api/properties | List properties |
| GET | /api/properties/:id | Get property |
| POST | /api/properties | Create property |
| PATCH | /api/properties/:id | Update property |
| DELETE | /api/properties/:id | Delete property |

Example create body:
```json
{"title":"Maple Apartment","address":"Indiranagar, Bengaluru","rent":18000,"bedrooms":2,"description":"Sunny apartment near the metro","available":true}
```

Invalid input and malformed IDs return 400; missing records return 404. Stop MongoDB with `npm run db:down` (keeps saved data).

Framework references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [NestJS MongoDB integration](https://docs.nestjs.com/techniques/mongodb).

## Booking requests

Clients can select **Request booking** on an available property, choose check-in and checkout dates, and send a request. **My booking requests** shows pending, approved, and rejected requests. Admin sees all requests; landlords see only requests for properties they own. Request details include the client username, property name/address, bedrooms, monthly rent, and dates. Both admin and the property landlord can approve or reject pending requests; the first decision wins. The dashboard refreshes requests every 15 seconds and also has a Refresh button.

Dates use the India calendar, require check-in today or later, and checkout after check-in. Checkout is exclusive, so another booking may start on the previous booking's checkout date. Approved date ranges cannot overlap; approval uses a single atomic property update to prevent competing approvals. Availability remains a listing-level control, while approved bookings reserve only their date range. Duplicate pending requests for the same client/property/dates are blocked.

Property deletion archives the listing to retain booking history, hides it from property searches, and prevents new requests or approvals. Pending requests for archived properties may still be rejected. Booking details are excluded from normal property responses to keep other clients' requests private.

| Method | Endpoint | Action |
| --- | --- | --- |
| GET | /api/bookings | List requests allowed for the logged-in role |
| POST | /api/bookings | Client request: `propertyId`, `fromDate`, `toDate` (`YYYY-MM-DD`) |
| PATCH | /api/bookings/:id | Admin or owning landlord decision: `status` (`approved` or `rejected`) |

Run booking integration checks against an isolated API/database:

```sh
TEST_API_URL=http://localhost:3028/api node apps/api/test/bookings.integration.cjs
```
