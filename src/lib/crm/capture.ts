import { createAdminClient } from "@/lib/supabase/server";
import { backendFetch, captureViaBackend } from "./capture-backend";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  buildFallbackActivities,
  mergeCaptureCustom,
  mergeCaptureTags,
  validUuidValues,
} from "./capture-state";
import type { Json } from "@/types/database";

export interface CapturePayload {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  timezone?: string;
  message?: string;
  form: string;
  source?: string;
  capture_page?: string;
  tags?: string[];
  interested_offers?: string[];
  custom?: Record<string, unknown>;
}

export interface CaptureResult {
  ok: boolean;
  via: "backend" | "fallback";
  leadId?: string;
  created?: boolean;
  error?: string;
}

/**
 * Captures through the CRM backend so activities and workflows run normally.
 * Ordinary opt-ins may use the complete Supabase fallback. Payments,
 * memberships and entitlement changes must set allowFallback: false so the
 * webhook receives a retryable error instead of accepting partial state.
 */
export async function captureLeadServerSide(
  payload: CapturePayload,
  options: { allowFallback?: boolean } = {}
): Promise<CaptureResult> {
  let binding: CloudflareEnv["BACKEND_WORKER"];
  try { binding = getCloudflareContext().env.BACKEND_WORKER; } catch {
    // Local Next.js or non-Cloudflare hosting has no Workers context.
  }
  const backend = await captureViaBackend(payload, {
    backendUrl: process.env.BACKEND_URL,
    captureKey: process.env.CRM_CAPTURE_KEY,
    fetchImpl: backendFetch(binding),
  });
  if (backend.ok) {
    return {
      ok: true,
      via: "backend",
      leadId: backend.leadId,
      created: backend.created,
    };
  }

  console.error("[crm-capture]", backend.error);
  if (options.allowFallback === false) {
    return { ok: false, via: "backend", error: backend.error };
  }

  try {
    const supabase = createAdminClient();
    const email = payload.email.trim().toLowerCase();
    const { data: existing, error: lookupError } = await supabase
      .from("leads")
      .select("*")
      .ilike("email", email.replace(/[%_]/g, "\\$&"))
      .limit(1)
      .maybeSingle();
    if (lookupError) throw new Error(`lead lookup failed: ${lookupError.message}`);

    const nameParts = (payload.name ?? "").trim().split(/\s+/).filter(Boolean);
    const firstName = payload.first_name?.trim() || nameParts[0] || null;
    const lastName =
      payload.last_name?.trim() || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : null);
    let leadId: string;
    let created = false;

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("leads")
        .update({
          first_name: existing.first_name || firstName,
          last_name: existing.last_name || lastName,
          phone: existing.phone || payload.phone?.trim() || null,
          company: existing.company || payload.company?.trim() || null,
          timezone: existing.timezone || payload.timezone || null,
          tags: mergeCaptureTags(existing.tags, payload.tags),
          interested_offers: mergeCaptureTags(
            existing.interested_offers,
            validUuidValues(payload.interested_offers)
          ),
          custom: mergeCaptureCustom(existing.custom, payload.custom) as Json,
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updateError || !updated) {
        throw new Error(`lead update failed: ${updateError?.message ?? "no lead returned"}`);
      }
      leadId = updated.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("leads")
        .insert({
          email,
          first_name: firstName,
          last_name: lastName,
          phone: payload.phone?.trim() || null,
          company: payload.company?.trim() || null,
          timezone: payload.timezone || null,
          source: payload.source || payload.form,
          capture_page: payload.capture_page || null,
          tags: payload.tags || [],
          interested_offers: validUuidValues(payload.interested_offers),
          custom: (payload.custom ?? {}) as Json,
        })
        .select("id")
        .single();
      if (insertError || !inserted) {
        throw new Error(`lead insert failed: ${insertError?.message ?? "no lead returned"}`);
      }
      leadId = inserted.id;
      created = true;
    }

    const activities = buildFallbackActivities(payload, leadId, created);
    const { error: activityError } = await supabase.from("lead_activities").insert(
      activities.map((activity) => ({ ...activity, data: activity.data as Json }))
    );
    if (activityError) throw new Error(`activity insert failed: ${activityError.message}`);

    return { ok: true, via: "fallback", leadId, created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "capture failed";
    console.error("[crm-capture] fallback failed:", message);
    return { ok: false, via: "fallback", error: message };
  }
}
