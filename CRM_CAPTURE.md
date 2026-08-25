# CRM capture from the public site

Public forms should enter the CRM through the backend's authoritative
`POST /api/crm/capture` endpoint. That path upserts the lead, merges tags and
custom fields, logs the form submission and fires workflow triggers.

The frontend's `POST /api/leads` route already uses this path. Its public
allowlist accepts contact details, form/source, page and message only. It never
forwards client-controlled tags, interested offers, workflow IDs or `custom`
provider fields. Trusted webhooks and other server-only code call
`captureLeadServerSide` directly. Configure:

```env
BACKEND_URL=https://your-backend-worker.example.workers.dev
CRM_CAPTURE_KEY=<the value of backend_settings.crm_capture_key>
```

`BACKEND_URL` is a normal Worker variable. `CRM_CAPTURE_KEY` is a secret:

```bash
npx wrangler secret put CRM_CAPTURE_KEY --name <your-frontend-worker>
```

Do not substitute `API_SECRET_KEY` unless it is deliberately the same value.
The capture endpoint validates `x-capture-key` against
`backend_settings.crm_capture_key`.

## Ordinary forms versus critical events

Ordinary newsletter/contact forms may use the frontend's complete Supabase
fallback so an opt-in is not lost during a backend outage. The fallback merges
existing tags, interested offers and `custom`, logs `form_submitted`, checks
every persistence error, and returns `via: "fallback"` for observability. It
cannot run backend workflow triggers.

Payments, memberships, entitlements and fulfillment events must fail closed:

```ts
const result = await captureLeadServerSide(payload, { allowFallback: false });
if (!result.ok) {
  // Return a non-2xx webhook response so the provider retries.
  return Response.json({ ok: false, error: result.error }, { status: 503 });
}
```

For clients posting to `POST /api/leads`, send `critical: true` for the same
behavior. A missing/invalid capture key or unavailable backend then returns
`503`; it never reports success after a partial direct write.

## Public response contract

`POST /api/leads` now returns
`{ok, lead_id, created, via}` rather than the full lead row. A newly created
lead returns `201`, an updated lead returns `200`, and a critical failure
returns `503`. Deployed sites with custom forms must read `lead_id` from this
response and must not depend on arbitrary lead columns being returned.

## Lifecycle tags

Never use an application/request tag as proof of payment. The provided helpers
produce distinct stages:

```ts
applicationLifecycleTags("offer-example", "vip")
// ["offer-example-applied", "offer-example-vip-requested"]

paidLifecycleTags("offer-example", "vip")
// ["offer-example-paid", "offer-example-vip"]
```

Trigger booking confirmation or fulfillment on the dedicated `-paid` tag.
Trigger variant onboarding on the paid variant tag. Because backend upserts
only fire `tag_added` for genuinely new tags, replaying a provider webhook does
not enroll the same non-reenrolling workflow or queue its emails twice.

Put the provider's stable event/session/payment ID in `custom` and derive
timestamps from provider data rather than `new Date()` so replayed payloads are
stable. Provider-level event deduplication is still recommended when a client
adds a payments table or webhook-event ledger.

## Smoke test

Run the deterministic HTTP smoke first. It boots the real frontend route
against local fake backend/Supabase endpoints, submits a malicious payload with
the middleware's `bb_vid` cookie set, and proves the request allowlist plus the
`visitors.anonymous_id` reverse link:

```bash
npm run test:crm
npm run test:crm:smoke
```

Then run the deployed round trip:

1. Submit a normal lead with a real `bb_vid` cookie and confirm the API response
   says `via: "backend"`; confirm `visitors.lead_id` is set and
   `leads.visitor_id` was not populated with the anonymous cookie value.
2. Confirm the lead timeline contains `form_submitted` and the expected
   workflow enrollment.
3. POST a malicious public payload containing a paid tag, `custom` provider ID,
   workflow ID and non-UUID offer; confirm all are absent from the lead and no
   injected tag workflow fires.
4. Temporarily use an invalid capture key and send a `critical: true` test;
   confirm the response is non-2xx and no fallback lead mutation occurs.
5. Force the ordinary-form fallback with a contact message and confirm the
   message appears as a `note` activity.
6. Replay the same trusted payment test payload; confirm paid tags and workflow/email
   enrollment exist exactly once.
