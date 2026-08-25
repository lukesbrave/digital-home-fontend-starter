/**
 * GET /api/leads — List leads (auth required)
 * POST /api/leads — Capture a new lead (email opt-in)
 *
 * This is the PII boundary — before this endpoint is called,
 * the visitor is fully anonymous. After, we have their email.
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { authenticateRequest, unauthorizedResponse } from "@/lib/api/auth";
import { jsonResponse, errorResponse, parsePagination, paginatedResponse } from "@/lib/api/response";
import { VISITOR_COOKIE_NAME } from "@/lib/personalization/visitor";
import { captureLeadServerSide } from "@/lib/crm/capture";
import { buildPublicCapturePayload } from "@/lib/crm/public-capture";
import type { Enums } from "@/types/database";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) return unauthorizedResponse(auth.error);

  const { searchParams } = request.nextUrl;
  const { page, limit, offset } = parsePagination(searchParams);

  const supabase = createAdminClient();
  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status as Enums<"lead_status">);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) return errorResponse(error.message, 500);

  return paginatedResponse(data || [], count || 0, page, limit);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.email !== "string") {
    return errorResponse("email is required");
  }

  // Honeypot: bots fill every field. Accept the request but persist nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return jsonResponse({ ok: true });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return errorResponse("Invalid email format");
  }

  const visitorId = request.cookies.get(VISITOR_COOKIE_NAME)?.value || null;

  const result = await captureLeadServerSide(
    buildPublicCapturePayload(body as Record<string, unknown>),
    { allowFallback: body.critical !== true }
  );

  if (!result.ok || !result.leadId) {
    return errorResponse(result.error || "Lead capture failed", body.critical === true ? 503 : 500);
  }

  // Link visitor to lead
  if (visitorId) {
    const supabase = createAdminClient();
    const { error: visitorError } = await supabase
      .from("visitors")
      .update({ lead_id: result.leadId })
      .eq("anonymous_id", visitorId);
    if (visitorError) console.warn("lead capture: visitor link failed", visitorError.message);
  }

  return jsonResponse(
    { ok: true, lead_id: result.leadId, created: result.created, via: result.via },
    result.created ? 201 : 200
  );
}
