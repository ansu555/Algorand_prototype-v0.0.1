// Simple logging utility for swap events. Replace with your preferred logger as needed.
export function logSwapEvent(type: string, payload: any) {
  // You can replace this with a real logger (e.g., pino, winston, Sentry, etc.)
  // For now, just print to console with a timestamp.
  const ts = new Date().toISOString()
  // eslint-disable-next-line no-console
  console.log(`[${ts}] [${type}]`, JSON.stringify(payload))
}