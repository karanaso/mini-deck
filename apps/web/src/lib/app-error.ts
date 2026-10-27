import type {
  MessageKey,
  MessageParams,
} from "@/lib/i18n/dictionaries";

export class AppError extends Error {
  readonly messageKey: MessageKey;
  readonly params?: MessageParams;

  constructor(
    messageKey: MessageKey,
    message: string,
    options: { params?: MessageParams; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.messageKey = messageKey;
    this.params = options.params;
  }
}
