export type ParsedTimeControl = {
  initialSeconds: number;
  incrementSeconds: number;
};

export function parseTimeControl(raw: string): ParsedTimeControl | null {
  const match = raw.trim().match(/^(\d+)\+(\d+)$/);
  if (!match) return null;

  const minutes = Number.parseInt(match[1], 10);
  const incrementSeconds = Number.parseInt(match[2], 10);
  if (Number.isNaN(minutes) || Number.isNaN(incrementSeconds)) return null;

  return {
    initialSeconds: minutes * 60,
    incrementSeconds
  };
}
