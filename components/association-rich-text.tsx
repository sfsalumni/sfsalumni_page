import WelcomeRichText from '@/components/welcome-rich-text';
import { parseAssociationBody } from '@/lib/association/body';

const DEFAULT_MARK = '#C9A227';

/** Renders association body: paragraphs, bullet lists, and **bold** / *italic* / ==mark==. */
export default function AssociationRichText({
  text,
  className = 'text-body-md text-on-surface-variant leading-relaxed',
  markColor = DEFAULT_MARK,
}: {
  text: string;
  className?: string;
  markColor?: string;
}) {
  const blocks = parseAssociationBody(text);
  if (!blocks.length) return null;

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} className={`list-disc pl-5 space-y-1.5 ${className}`}>
              {block.items.map((item, j) => (
                <li key={j}>
                  <WelcomeRichText text={item} markColor={markColor} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={`whitespace-pre-line ${className}`}>
            <WelcomeRichText text={block.text} markColor={markColor} />
          </p>
        );
      })}
    </div>
  );
}
