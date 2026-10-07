// Identifiants UUID v4 en texte (docs/PLAN.md, « Schéma »), tirés par crypto.getRandomValues :
// disponible partout où tourne Baluchon (Android, Debian, Node), contrairement à
// crypto.randomUUID, qui exige une page « sécurisée ».
export function nouvelId() {
  const octets = globalThis.crypto.getRandomValues(new Uint8Array(16));
  octets[6] = (octets[6] & 0x0f) | 0x40;
  octets[8] = (octets[8] & 0x3f) | 0x80;
  const hex = [...octets].map(o => o.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
