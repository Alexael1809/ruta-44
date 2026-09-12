---
name: Marketplace architecture decisions
description: Durable choices for the repuestos marketplace foundation.
---

The marketplace uses the Replit-managed PostgreSQL database and Clerk rather than introducing an external Supabase dependency. Server-side role and merchant ownership checks remain authoritative; client visibility is not a security boundary.

**Why:** The project already provides a managed database and Clerk setup, while the original specification named Supabase as an implementation detail. Keeping both services inside the workspace reduces operational coupling and still preserves the requested behavior.

**How to apply:** Keep API contracts in OpenAPI, persist historical exchange rates on orders, and enforce unique mobile-payment references in the database. Add object storage before storing real product image bytes.