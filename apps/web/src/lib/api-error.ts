import { AppError } from "@/lib/app-error";
import {
  hasMessageKey,
  type MessageKey,
  type MessageParams,
} from "@/lib/i18n/dictionaries";

interface ApiErrorEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
}

export class ApiError extends AppError {
  readonly code: string;
  readonly status: number;
  readonly details: MessageParams;

  constructor(
    code: string,
    status: number,
    message: string,
    details: MessageParams = {},
    cause?: unknown,
  ) {
    super(getApiErrorKey(code), message, { params: details, cause });
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getApiErrorKey(code: string): MessageKey {
  const key = `errors.api.${code}`;
  return hasMessageKey(key) ? key : "errors.api.generic";
}

function readDetails(value: unknown): MessageParams {
  if (!value || typeof value !== "object") return {};
  const details: MessageParams = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number") {
      details[key] = entry;
    }
  }
  return details;
}

export async function parseApiError(response: Response): Promise<ApiError> {
  let payload: ApiErrorEnvelope | null = null;
  try {
    payload = (await response.json()) as ApiErrorEnvelope;
  } catch {
    // Non-JSON responses are mapped to the generic localized message.
  }

  const code =
    typeof payload?.error?.code === "string" ? payload.error.code : "unknown";
  const message =
    typeof payload?.error?.message === "string"
      ? payload.error.message
      : `Request failed with status ${response.status}`;
  const details = readDetails(payload?.error?.details);

  return new ApiError(code, response.status, message, details);
}

export function messageForError(
  error: unknown,
  fallback: MessageKey = "errors.api.generic",
): { key: MessageKey; params?: MessageParams } {
  if (error instanceof AppError) {
    return { key: error.messageKey, params: error.params };
  }
  return { key: fallback };
}
