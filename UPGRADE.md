# Frontend 2.5.4

This release routes server-side CRM capture through a Cloudflare service binding
when available. It also clarifies the Simon-guided foundation handover.

For an existing customised frontend, work on a branch and merge changes to
`src/lib/crm/capture.ts`, `src/lib/crm/capture-backend.ts`, and `cloudflare-env.d.ts`.
Add the `backend-binding.test.ts` coverage. Preserve the existing capture fallback
and payment rules. Add a `BACKEND_WORKER` binding in wrangler.jsonc pointing to
the actual backend Worker in the same account; preserve all existing names,
routes, bindings and secrets. Keep BACKEND_URL and CRM_CAPTURE_KEY configured.
Non-Cloudflare/local deployments can keep HTTP without this binding.

Run `npm test`, lint and build. Deploy with the member's authorisation, verify a
lead reaches the backend through its capture endpoint, and record VERSION 2.5.4.
No database migration or new credential is required. Do not replace customer
content with the starter. The bundled CLAUDE.md changes separate later content
and design work from completing a verified foundation.
