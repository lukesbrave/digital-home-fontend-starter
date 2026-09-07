export interface BackendCaptureResult {
  ok: boolean;
  leadId?: string;
  created?: boolean;
  error?: string;
}

export type FetchImplementation = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

/** Preserve the service binding's receiver; never retry a failed bound request over public HTTP. */
export function backendFetch(binding?: { fetch: FetchImplementation }): FetchImplementation {
  return binding ? binding.fetch.bind(binding) : fetch;
}

/** Attempts the authoritative CRM endpoint without invoking a fallback. */
export async function captureViaBackend(
  payload: unknown,
  config: {
    backendUrl?: string;
    captureKey?: string;
    fetchImpl?: FetchImplementation;
  }
): Promise<BackendCaptureResult> {
  const { backendUrl, captureKey, fetchImpl = fetch } = config;

  if (!backendUrl || !captureKey) {
    const missing = [!backendUrl && "BACKEND_URL", !captureKey && "CRM_CAPTURE_KEY"].filter(Boolean);
    return { ok: false, error: `CRM capture is not configured (missing ${missing.join(" and ")})` };
  }

  try {
    const response = await fetchImpl(`${backendUrl.replace(/\/$/, "")}/api/crm/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-capture-key": captureKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      lead_id?: string;
      created?: boolean;
    };

    if (response.ok && data.lead_id) {
      return { ok: true, leadId: data.lead_id, created: data.created };
    }
    return {
      ok: false,
      error: `CRM backend rejected capture (${response.status})${data.error ? `: ${data.error}` : ""}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: `CRM backend unreachable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
