---
name: Marketplace architecture decisions
description: Durable choices for the repuestos marketplace foundation.
---

The marketplace uses the Replit-managed PostgreSQL database and Clerk rather than introducing an external Supabase dependency. Server-side role and merchant ownership checks remain authoritative; client visibility is not a security boundary.

**Why:** The project already provides a managed database and Clerk setup, while the original specification named Supabase as an implementation detail. Keeping both services inside the workspace reduces operational coupling and still preserves the requested behavior.

**How to apply:** Keep API contracts in OpenAPI, persist historical exchange rates on orders, and enforce unique mobile-payment references in the database. Add object storage before storing real product image bytes.

Clerk remains the source of authentication credentials; the database stores only the local role mapping. The master role is bound server-side to the verified master email and never stores a password in the repository or PostgreSQL.

**Why:** A seed can safely provision access metadata, but password values must remain in Clerk's managed identity system rather than becoming application data.

**How to apply:** Keep public registration mapped to `customer`; require the master role for role changes, payment receiver settings, and delivery-location administration.