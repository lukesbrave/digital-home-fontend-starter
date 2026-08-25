import assert from "node:assert/strict";
import test from "node:test";
import { captureViaBackend } from "./capture-backend.ts";
import { buildPublicCapturePayload } from "./public-capture.ts";

test("public capture strips workflow, provider and offer injection fields", async () => {
  const payload = buildPublicCapturePayload({
    email: "victim@example.com",
    form: "contact",
    message: "A legitimate message",
    tags: ["offer-x-paid"],
    interested_offers: ["not-a-uuid"],
    custom: { stripe_customer_id: "attacker-controlled" },
    workflow_id: "paid-fulfillment",
  });

  let forwarded: Record<string, unknown> | undefined;
  const result = await captureViaBackend(payload, {
    backendUrl: "https://backend.example",
    captureKey: "test-capture-key",
    fetchImpl: async (_input, init) => {
      forwarded = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ lead_id: "lead-123", created: true });
    },
  });

  assert.equal(result.ok, true);
  assert.equal("tags" in (forwarded ?? {}), false);
  assert.equal("interested_offers" in (forwarded ?? {}), false);
  assert.equal("custom" in (forwarded ?? {}), false);
  assert.equal("workflow_id" in (forwarded ?? {}), false);

  const tagTriggers = Array.isArray(forwarded?.tags) ? forwarded.tags : [];
  assert.deepEqual(tagTriggers, [], "no injected tag reaches the backend trigger engine");
});

test("cookied capture never writes anonymous_id into the visitor UUID field", () => {
  const middlewareCookie = "01J5COOKIEANONYMOUSID";
  const payload = buildPublicCapturePayload({ email: "cookie@example.com", form: "newsletter" });

  assert.equal("visitor_id" in payload, false);
  assert.equal(JSON.stringify(payload).includes(middlewareCookie), false);
});
