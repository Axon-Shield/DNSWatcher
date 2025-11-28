type LogLevel = "error" | "warn";

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function log(level: LogLevel, scope: string, error: unknown) {
  const payload = formatError(error);

  if (process.env.NODE_ENV === "production") {
    // Only log minimal information in production to avoid leaking sensitive data.
    console[level](`[${scope}] ${payload}`);
    return;
  }

  // In non-production environments include stack/object details for debugging.
  if (error instanceof Error) {
    console[level](`[${scope}]`, error);
  } else {
    console[level](`[${scope}]`, payload);
  }
}

export function logError(scope: string, error: unknown) {
  log("error", scope, error);
}

export function logWarn(scope: string, error: unknown) {
  log("warn", scope, error);
}

