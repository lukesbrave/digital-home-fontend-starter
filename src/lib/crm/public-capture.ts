import type { CapturePayload } from "./capture";

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Allowlist for the unauthenticated website capture door.
 *
 * Tags, interested offers, workflow IDs and custom/provider fields are
 * deliberately absent. Trusted webhooks and server-only callers use
 * captureLeadServerSide directly instead.
 */
export function buildPublicCapturePayload(body: Record<string, unknown>): CapturePayload {
  const requestedForm = optionalString(body.form)?.trim();
  const form = requestedForm || "website-lead";

  return {
    email: String(body.email ?? ""),
    name: optionalString(body.name),
    first_name: optionalString(body.first_name),
    last_name: optionalString(body.last_name),
    phone: optionalString(body.phone),
    company: optionalString(body.company),
    timezone: optionalString(body.timezone),
    message: optionalString(body.message),
    form,
    source: optionalString(body.source) || form,
    capture_page: optionalString(body.capture_page) || optionalString(body.page),
  };
}
