export type MarkupKind = 'text' | 'bold' | 'italic' | 'mark';

export type MarkupSegment = {
  kind: MarkupKind;
  text: string;
};

type Delimiter = { open: string; close: string; kind: Exclude<MarkupKind, 'text'> };

const DELIMS: Delimiter[] = [
  { open: '==', close: '==', kind: 'mark' },
  { open: '**', close: '**', kind: 'bold' },
  { open: '*', close: '*', kind: 'italic' },
];

function findNextOpen(source: string, from: number): { index: number; delim: Delimiter } | null {
  let best: { index: number; delim: Delimiter } | null = null;
  for (const delim of DELIMS) {
    const index = source.indexOf(delim.open, from);
    if (index < 0) continue;
    // Prefer longer delimiters when they start at the same place (** over *).
    if (!best || index < best.index || (index === best.index && delim.open.length > best.delim.open.length)) {
      best = { index, delim };
    }
  }
  return best;
}

/** Parse **bold**, *italic*, and ==mark== into flat segments (no nesting). */
export function parseWelcomeMarkup(input: string): MarkupSegment[] {
  const source = String(input || '');
  if (!source) return [];

  const out: MarkupSegment[] = [];
  let i = 0;

  while (i < source.length) {
    const next = findNextOpen(source, i);
    if (!next) {
      out.push({ kind: 'text', text: source.slice(i) });
      break;
    }

    if (next.index > i) {
      out.push({ kind: 'text', text: source.slice(i, next.index) });
    }

    const contentStart = next.index + next.delim.open.length;
    const closeAt = source.indexOf(next.delim.close, contentStart);
    if (closeAt < 0) {
      // Unclosed marker: treat opener as plain text and continue.
      out.push({ kind: 'text', text: source.slice(next.index, contentStart) });
      i = contentStart;
      continue;
    }

    const inner = source.slice(contentStart, closeAt);
    if (inner) out.push({ kind: next.delim.kind, text: inner });
    i = closeAt + next.delim.close.length;
  }

  return out.filter((seg) => seg.text.length > 0);
}

export type WrapKind = 'bold' | 'italic' | 'mark';

const WRAP: Record<WrapKind, { open: string; close: string }> = {
  bold: { open: '**', close: '**' },
  italic: { open: '*', close: '*' },
  mark: { open: '==', close: '==' },
};

/** Wrap a selection range with markup. No-op when the range is empty. */
export function wrapWelcomeMarkup(
  source: string,
  start: number,
  end: number,
  kind: WrapKind
): string {
  const text = String(source || '');
  const a = Math.max(0, Math.min(start, end));
  const b = Math.min(text.length, Math.max(start, end));
  if (a === b) return text;
  const { open, close } = WRAP[kind];
  return `${text.slice(0, a)}${open}${text.slice(a, b)}${close}${text.slice(b)}`;
}
