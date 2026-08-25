/** Pure merge and lifecycle-tag helpers shared by capture code and tests. */
export function mergeCaptureTags(
  existing: string[] | null | undefined,
  incoming: string[] | null | undefined
) {
  return Array.from(new Set([...(existing ?? []), ...(incoming ?? [])]));
}

export function mergeCaptureCustom(
  existing: unknown,
  incoming: Record<string, unknown> | undefined
): Record<string, unknown> {
  const current =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...current, ...(incoming ?? {}) };
}

/** PostgreSQL's uuid input accepts any canonical 8-4-4-4-12 hex value. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
}

export function validUuidValues(values: string[] | null | undefined): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter((value) => isUuid(value)))
  );
}

export function buildFallbackActivities(
  payload: {
    form: string;
    source?: string;
    capture_page?: string;
    message?: string;
  },
  leadId: string,
  created: boolean
) {
  return [
    ...(created
      ? [{
          lead_id: leadId,
          activity_type: "created",
          title: `Lead created via ${payload.source || payload.form}`,
          body: null,
          data: { source: payload.source || payload.form, capture_page: payload.capture_page },
          actor: "capture:fallback",
        }]
      : []),
    ...(payload.message?.trim()
      ? [{
          lead_id: leadId,
          activity_type: "note",
          title: "Message from form",
          body: payload.message.trim(),
          data: { form: payload.form },
          actor: "capture:fallback",
        }]
      : []),
    {
      lead_id: leadId,
      activity_type: "form_submitted",
      title: `Form submitted: ${payload.form}`,
      body: null,
      data: { form: payload.form, capture_page: payload.capture_page },
      actor: "capture:fallback",
    },
  ];
}

/** Tags that describe interest or intent before payment/activation. */
export function applicationLifecycleTags(scope: string, requestedVariant?: string) {
  return [
    `${scope}-applied`,
    ...(requestedVariant ? [`${scope}-${requestedVariant}-requested`] : []),
  ];
}

/** Tags that prove payment/activation and may safely trigger fulfillment. */
export function paidLifecycleTags(scope: string, purchasedVariant?: string) {
  return [
    `${scope}-paid`,
    ...(purchasedVariant ? [`${scope}-${purchasedVariant}`] : []),
  ];
}
