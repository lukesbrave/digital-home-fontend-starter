import assert from "node:assert/strict";
import test from "node:test";
import { backendFetch, captureViaBackend } from "./capture-backend.ts";

test("CRM capture uses the bound Worker with its receiver, auth and payload intact", async () => {
  const binding = {
    calls: 0,
    async fetch(input: string | URL | Request, init?: RequestInit) {
      this.calls++;
      assert.equal(String(input), "https://backend.example.workers.dev/api/crm/capture");
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("x-capture-key"), "test-key");
      assert.equal(JSON.parse(String(init?.body)).email, "test@example.com");
      return Response.json({ lead_id: "lead-1", created: true });
    },
  };
  const result = await captureViaBackend({ email: "test@example.com" }, {
    backendUrl: "https://backend.example.workers.dev/", captureKey: "test-key", fetchImpl: backendFetch(binding),
  });
  assert.deepEqual(result, { ok: true, leadId: "lead-1", created: true });
  assert.equal(binding.calls, 1);
  assert.equal(backendFetch(), fetch);
});
test("a failed bound call returns an error without another public request", async () => {
  let calls = 0;
  const result = await captureViaBackend({}, { backendUrl: "https://backend.example.workers.dev", captureKey: "test", fetchImpl: backendFetch({ async fetch() { calls++; throw new Error("binding unavailable"); } }) });
  assert.equal(result.ok, false);
  assert.match(result.error!, /binding unavailable/);
  assert.equal(calls, 1);
});
