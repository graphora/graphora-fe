import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/browser";

export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [browserTracingIntegration()],
      tracesSampleRate: 1.0,
      enabled: import.meta.env.VITE_PROD,
    });
  }
}

export function captureError(error: Error) {
  Sentry.captureException(error);
}
