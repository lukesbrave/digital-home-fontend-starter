import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const cookieId = "01J5COOKIEANONYMOUSID";
const leadId = "123e4567-e89b-12d3-a456-426614174000";
let backendPayload;
let visitorLink;

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const fakeServices = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://fake.local");

  if (request.method === "POST" && url.pathname === "/api/crm/capture") {
    backendPayload = await readJson(request);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, lead_id: leadId, created: true }));
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/rest/v1/visitors") {
    visitorLink = { query: url.searchParams.get("anonymous_id"), body: await readJson(request) };
    response.writeHead(204);
    response.end();
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "unexpected fake-service request" }));
});

const probe = createServer();
const fakePort = await listen(fakeServices);
const frontendPort = await listen(probe);
await close(probe);

const logs = [];
const frontend = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-H", "127.0.0.1", "-p", String(frontendPort)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fakePort}`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "smoke-anon-key",
      SUPABASE_URL: `http://127.0.0.1:${fakePort}`,
      SUPABASE_ANON_KEY: "smoke-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "smoke-service-role-key",
      BACKEND_URL: `http://127.0.0.1:${fakePort}`,
      CRM_CAPTURE_KEY: "smoke-capture-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

frontend.stdout.on("data", (chunk) => logs.push(chunk.toString()));
frontend.stderr.on("data", (chunk) => logs.push(chunk.toString()));

async function waitUntilReady() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (logs.join("").match(/Ready in|Local:/)) return;
    if (frontend.exitCode !== null) throw new Error(`frontend exited ${frontend.exitCode}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`frontend did not become ready\n${logs.join("").slice(-4000)}`);
}

try {
  await waitUntilReady();
  const response = await fetch(`http://127.0.0.1:${frontendPort}/api/leads`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `bb_vid=${cookieId}`,
    },
    body: JSON.stringify({
      email: "smoke@example.com",
      form: "contact",
      message: "Keep this message",
      tags: ["offer-x-paid"],
      interested_offers: ["not-a-uuid"],
      custom: { stripe_customer_id: "attacker-controlled" },
      workflow_id: "paid-fulfillment",
    }),
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(result, { ok: true, lead_id: leadId, created: true, via: "backend" });
  assert.equal(backendPayload.message, "Keep this message");
  for (const forbidden of ["visitor_id", "tags", "interested_offers", "custom", "workflow_id"]) {
    assert.equal(forbidden in backendPayload, false, `${forbidden} must not cross the public boundary`);
  }
  assert.deepEqual(visitorLink, { query: `eq.${cookieId}`, body: { lead_id: leadId } });

  process.stdout.write(`${JSON.stringify({
    ok: true,
    response: result,
    cookie_link: "visitors.anonymous_id -> visitors.lead_id",
    privileged_fields_forwarded: [],
    injected_tag_triggers: 0,
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.stderr.write(logs.join("").slice(-4000));
  process.exitCode = 1;
} finally {
  frontend.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => frontend.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  await close(fakeServices);
}
