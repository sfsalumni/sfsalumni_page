/**
 * Pure helpers: which offline proof and bank ref to show on admin Registrations.
 */

export type OfflineProofLite = {
  registration_id: string;
  utr: string | null;
  screenshot_path: string | null;
  status: string;
  created_at: string;
};

/** Prefer non-empty bank_reference; else proof UTR. */
export function displayBankReference(input: {
  bankReference: string | null | undefined;
  proofUtr: string | null | undefined;
}): string | null {
  const bank = String(input.bankReference ?? '').trim();
  if (bank) return bank;
  const utr = String(input.proofUtr ?? '').trim();
  return utr || null;
}

/** Prefer pending; otherwise newest by created_at. */
export function pickProofForRegistration(
  proofs: OfflineProofLite[],
  registrationId: string
): OfflineProofLite | null {
  const forReg = proofs.filter((p) => p.registration_id === registrationId);
  if (forReg.length === 0) return null;
  const pending = forReg.filter((p) => p.status === 'pending');
  const pool = pending.length > 0 ? pending : forReg;
  return pool.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
}

/** One best proof per registration_id. */
export function indexProofsByRegistration(
  proofs: OfflineProofLite[]
): Map<string, OfflineProofLite> {
  const ids = new Set(proofs.map((p) => p.registration_id));
  const map = new Map<string, OfflineProofLite>();
  for (const id of ids) {
    const picked = pickProofForRegistration(proofs, id);
    if (picked) map.set(id, picked);
  }
  return map;
}
