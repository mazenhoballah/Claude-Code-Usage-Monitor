// $/Mtok. Best-effort estimates — UI labels all $ figures as "est."
// Update this table when Anthropic publishes new pricing.
export const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-4-7':       { input: 15,  output: 75,  cacheRead: 1.5,  cacheWrite: 18.75 },
  'claude-opus-4-7[1m]':   { input: 30,  output: 150, cacheRead: 3.0,  cacheWrite: 37.5  },
  'claude-opus-4-6':       { input: 15,  output: 75,  cacheRead: 1.5,  cacheWrite: 18.75 },
  'claude-sonnet-4-6':     { input: 3,   output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  },
  'claude-sonnet-4-5':     { input: 3,   output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  },
  'claude-haiku-4-5':      { input: 1,   output: 5,   cacheRead: 0.1,  cacheWrite: 1.25  },
};

const DEFAULT_PRICE = { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 };

export function priceFor(model: string) {
  return PRICING[model] ?? PRICING[model.replace(/-\d{8}$/, '')] ?? DEFAULT_PRICE;
}

export function costFor(model: string, u: { input: number; output: number; cacheRead: number; cacheCreate: number }): number {
  const p = priceFor(model);
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheCreate * p.cacheWrite) / 1_000_000;
}

// model → context window (tokens)
export const MODEL_WINDOWS: Record<string, number> = {
  'claude-opus-4-7':     200_000,
  'claude-opus-4-7[1m]': 1_000_000,
  'claude-opus-4-6':     200_000,
  'claude-sonnet-4-6':   200_000,
  'claude-sonnet-4-5':   200_000,
  'claude-haiku-4-5':    200_000,
};

export function windowFor(model: string): number {
  return MODEL_WINDOWS[model] ?? MODEL_WINDOWS[model.replace(/-\d{8}$/, '')] ?? 200_000;
}
