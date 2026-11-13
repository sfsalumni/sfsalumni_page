export type AssociationBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

const BULLET_LINE = /^\s*[-*•]\s+(.*)$/;

/**
 * Split association body copy into paragraphs and bullet lists.
 * Blank lines separate blocks. Lines starting with -, *, or • become list items.
 * Soft newlines inside a paragraph are kept (render with whitespace-pre-line).
 */
export function parseAssociationBody(input: string): AssociationBlock[] {
  const lines = String(input || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const blocks: AssociationBlock[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  function flushPara() {
    const text = para.join('\n').trim();
    if (text) blocks.push({ type: 'p', text });
    para = [];
  }

  function flushList() {
    if (list?.length) blocks.push({ type: 'ul', items: list });
    list = null;
  }

  for (const line of lines) {
    const bullet = line.match(BULLET_LINE);
    if (bullet) {
      flushPara();
      if (!list) list = [];
      list.push(bullet[1]);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}
