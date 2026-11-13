// app/api/admin/registrations/route.ts
// Admin list of event registrations. Every money and status figure comes from the shared ledger
// (see lib/admin/registration-ledger.ts). Filters run on the full list, so search finds every match.

import { NextResponse } from 'next/server';
import {
    displayBankReference,
    indexProofsByRegistration,
    type OfflineProofLite,
} from '@/lib/admin/registration-proof';
import { ledgerFor, loadRegistrationRows, one, refreshRegistrations, type RegistrationDbRow } from '@/lib/admin/registration-rows';
import { STATE_LABELS, type RegistrationState } from '@/lib/admin/registration-ledger';
import { requireVerifiedAdmin } from '@/lib/auth/admin-guard';
import { signedProofUrl } from '@/lib/payments/proof-storage';
import { clampGuestCount, clampGuestsEating } from '@/lib/registration/registration';
import { venuePassSummary } from '@/lib/events/venue-pass';
import { createAdminClient } from '@/lib/supabase-admin';

const VALID_STATES: RegistrationState[] = ['cancelled', 'confirmed', 'awaiting_verification', 'partial', 'unpaid'];

type ProofAttach = { utr: string | null; screenshot_url: string | null };

function toAdminRow(r: RegistrationDbRow, proof: ProofAttach | null) {
    const account = one(r.alumni_accounts);
    const event = one(r.event_catalog);
    const bank_reference = displayBankReference({
        bankReference: r.bank_reference,
        proofUtr: proof?.utr,
    });
    const ledger = ledgerFor({ ...r, bank_reference });

    const guestCount = clampGuestCount(Number(r.number_of_guests) || 0);
    const guestsEating = clampGuestsEating(r.guests_eating, guestCount);
    const guestsCheckedIn = Math.min(guestCount, Math.max(0, Number(r.guests_checked_in) || 0));

    const summary = venuePassSummary({
        attending: r.attending !== false,
        lunch: r.lunch !== false,
        food_preference: r.food_preference,
        number_of_guests: guestCount,
        guests_eating: guestsEating,
        payment_status: ledger.confirmed ? 'paid' : r.payment_status,
        total_due_paise: ledger.duePaise,
        registration_code: r.registration_code,
    });

    const batchRaw = account?.batch;
    const batch =
        typeof batchRaw === 'number'
            ? batchRaw
            : batchRaw != null && String(batchRaw).trim() !== ''
              ? Number(batchRaw) || null
              : null;

    return {
        id: r.id,
        event_id: r.event_id,
        event_title: event?.title || 'Event',
        full_name: account?.full_name || '—',
        email: account?.email || '—',
        batch,
        phone_number: r.phone_number,
        attending: r.attending !== false,
        number_of_guests: guestCount,
        guests_checked_in: guestsCheckedIn,
        meals: summary.meals,
        billed_paise: ledger.billedPaise,
        settled_paise: ledger.settledPaise,
        due_paise: ledger.duePaise,
        state: ledger.state,
        state_label: STATE_LABELS[ledger.state],
        confirmed: ledger.confirmed,
        committee_verified: ledger.committeeVerified,
        payment_status: r.payment_status,
        bank_reference,
        proof_screenshot_url: proof?.screenshot_url || null,
        registration_code: r.registration_code || null,
        checked_in_at: r.checked_in_at,
        created_at: r.created_at,
    };
}

async function loadProofsByRegistrationId(
    registrationIds: string[]
): Promise<Map<string, ProofAttach>> {
    const out = new Map<string, ProofAttach>();
    if (registrationIds.length === 0) return out;

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('offline_payment_proofs')
        .select('registration_id,utr,screenshot_path,status,created_at')
        .in('registration_id', registrationIds);
    if (error) {
        console.error('admin registrations proofs', error);
        return out;
    }

    const lite: OfflineProofLite[] = (data || [])
        .filter((row) => typeof row.registration_id === 'string' && row.registration_id)
        .map((row) => ({
            registration_id: String(row.registration_id),
            utr: typeof row.utr === 'string' ? row.utr : null,
            screenshot_path: typeof row.screenshot_path === 'string' ? row.screenshot_path : null,
            status: String(row.status || ''),
            created_at: String(row.created_at || ''),
        }));

    const indexed = indexProofsByRegistration(lite);
    await Promise.all(
        [...indexed.entries()].map(async ([id, proof]) => {
            out.set(id, {
                utr: proof.utr,
                screenshot_url: await signedProofUrl(admin, proof.screenshot_path),
            });
        })
    );
    return out;
}

export async function GET(request: Request) {
    const me = await requireVerifiedAdmin();
    if (!me) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id') || '';
    const stateParam = searchParams.get('state') || '';
    const q = (searchParams.get('q') || '').trim().toLowerCase();

    await refreshRegistrations(eventId);
    const { rows, error } = await loadRegistrationRows(eventId);
    if (error) {
        console.error('admin registrations', error);
        return NextResponse.json({ error: 'Could not load registrations' }, { status: 500 });
    }

    const proofs = await loadProofsByRegistrationId(rows.map((r) => r.id));

    const stateFilter = VALID_STATES.includes(stateParam as RegistrationState)
        ? (stateParam as RegistrationState)
        : null;

    const list = rows
        .map((r) => toAdminRow(r, proofs.get(r.id) || null))
        .filter((row) => !stateFilter || row.state === stateFilter)
        .filter((row) => {
            if (!q) return true;
            return (
                row.full_name.toLowerCase().includes(q) ||
                row.email.toLowerCase().includes(q) ||
                (row.phone_number || '').toLowerCase().includes(q) ||
                (row.registration_code || '').toLowerCase().includes(q) ||
                (row.bank_reference || '').toLowerCase().includes(q)
            );
        });

    return NextResponse.json(list);
}