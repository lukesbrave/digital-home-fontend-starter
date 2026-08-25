import assert from "node:assert/strict";
import test from "node:test";
import { captureViaBackend } from "./capture-backend.ts";
import {
  applicationLifecycleTags,
  buildFallbackActivities,
  isUuid,
  mergeCaptureCustom,
  mergeCaptureTags,
  paidLifecycleTags,
  validUuidValues,
} from "./capture-state.ts";

test("application tags cannot trigger paid fulfillment", () => {
  const application = applicationLifecycleTags("offer-example", "vip");
  const paid = paidLifecycleTags("offer-example", "vip");

  assert.deepEqual(application, ["offer-example-applied", "offer-example-vip-requested"]);
  assert.deepEqual(paid, ["offer-example-paid", "offer-example-vip"]);
  assert.deepEqual(application.filter((tag) => paid.includes(tag)), []);
});

test("replaying a paid capture does not add fulfillment tags twice", () => {
  const application = applicationLifecycleTags("offer-example", "vip");
  const paid = paidLifecycleTags("offer-example", "vip");
  const firstCapture = mergeCaptureTags(application, paid);
  const replay = mergeCaptureTags(firstCapture, paid);

  assert.deepEqual(replay, firstCapture);
  assert.equal(replay.filter((tag) => tag === "offer-example-paid").length, 1);
  assert.equal(replay.filter((tag) => tag === "offer-example-vip").length, 1);
});

test("existing application custom fields survive a paid capture", () => {
  assert.deepEqual(
    mergeCaptureCustom(
      { requested_variant: "vip", application_answer: "Example" },
      { payment_session_id: "session_123", paid_at: "2026-08-19T02:06:18.000Z" }
    ),
    {
      requested_variant: "vip",
      application_answer: "Example",
      payment_session_id: "session_123",
      paid_at: "2026-08-19T02:06:18.000Z",
    }
  );
});

test("missing and invalid capture keys stay visible to critical callers", async () => {
  let fetchCalled = false;
  const missing = await captureViaBackend({}, {
    backendUrl: "https://backend.example",
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response(null, { status: 200 });
    },
  });
  assert.equal(missing.ok, false);
  assert.match(missing.error || "", /CRM_CAPTURE_KEY/);
  assert.equal(fetchCalled, false);

  const invalid = await captureViaBackend({}, {
    backendUrl: "https://backend.example",
    captureKey: "wrong-key",
    fetchImpl: async () => Response.json({ error: "Unauthorized" }, { status: 401 }),
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error || "", /401.*Unauthorized/);
});

test("interested offers accept UUIDs and reject arbitrary strings", () => {
  const offerId = "123e4567-e89b-12d3-a456-426614174000";

  assert.equal(isUuid(offerId), true);
  assert.equal(isUuid("not-an-offer-uuid"), false);
  assert.deepEqual(validUuidValues([offerId, "offer-x-paid", offerId]), [offerId]);
});

test("fallback activities preserve a contact-form message", () => {
  const activities = buildFallbackActivities(
    {
      form: "contact",
      source: "contact",
      capture_page: "/contact",
      message: " Please call after 3pm. ",
    },
    "lead-123",
    true
  );

  assert.deepEqual(
    activities.map(({ activity_type, body }) => ({ activity_type, body })),
    [
      { activity_type: "created", body: null },
      { activity_type: "note", body: "Please call after 3pm." },
      { activity_type: "form_submitted", body: null },
    ]
  );
});
