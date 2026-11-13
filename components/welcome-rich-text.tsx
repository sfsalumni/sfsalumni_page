import { parseWelcomeMarkup } from '@/lib/welcome/markup';

/** Renders **bold**, *italic*, and ==mark== without allowing HTML. */
export default function WelcomeRichText({
  text,
  markColor,
}: {
  text: string;
  markColor: string;
}) {
  const segments = parseWelcomeMarkup(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'bold') {
          return (
            <strong key={i} className="font-semibold">
              {seg.text}
            </strong>
          );
        }
        if (seg.kind === 'italic') {
          return (
            <em key={i} className="italic">
              {seg.text}
            </em>
          );
        }
        if (seg.kind === 'mark') {
          return (
            <mark
              key={i}
              className="rounded-sm px-0.5"
              style={{ backgroundColor: `${markColor}33`, color: 'inherit' }}
            >
              {seg.text}
            </mark>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </>
  );
}
