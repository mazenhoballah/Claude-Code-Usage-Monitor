// Tier-based bold palette: Opus=warm, Sonnet=cool, Haiku=green
const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-7[1m]': '#DC2626',  // deep red — flagship
  'claude-opus-4-7':     '#F97316',  // orange — powerful
  'claude-opus-4-6':     '#FB923C',  // light orange — still powerful
  'claude-sonnet-4-6':   '#3B82F6',  // bright blue — balanced
  'claude-sonnet-4-5':   '#8B5CF6',  // purple — balanced but softer
  'claude-haiku-4-5':    '#10B981',  // green — fast, efficient
};
const FALLBACK_COLOR = '#9CA3AF';

export function colorForModel(model: string): string {
  if (model in MODEL_COLORS) return MODEL_COLORS[model];
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.startsWith(key)) return color;
  }
  return FALLBACK_COLOR;
}
