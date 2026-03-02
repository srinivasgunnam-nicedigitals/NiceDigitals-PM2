/**
 * Shared avatar URL utility.
 * Returns the user's avatar URL or a consistent fallback using ui-avatars.com.
 * Color is deterministic — same name always produces the same avatar color.
 */
export function getAvatarUrl(name: string, avatar?: string | null): string {
  if (avatar) return avatar;
  // Deterministic color from name hash (no randomness)
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Convert HSL to hex for the API (pastel palette: S=45%, L=65%)
  const bg = hslToHex(hue, 45, 65);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=128&bold=true&format=svg`;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `${f(0)}${f(8)}${f(4)}`;
}
