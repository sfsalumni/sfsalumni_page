import Link from 'next/link';
import WelcomeRichText from '@/components/welcome-rich-text';
import { splitWelcomeBody } from '@/lib/welcome/validate';
import {
  resolveWelcomeStyle,
  welcomeBodyClass,
  welcomeFontClass,
  welcomeHeadlineClass,
} from '@/lib/welcome/style';
import type { PublicWelcome } from '@/lib/welcome/load';

export default function WelcomeMessage({ message }: { message: PublicWelcome }) {
  const paragraphs = splitWelcomeBody(message.body);
  const hasPhoto = Boolean(message.photo_url);
  const ctaIsHash = message.cta_href.startsWith('#');
  const ctaIsExternal = /^https?:\/\//i.test(message.cta_href);
  const resolved = resolveWelcomeStyle(message.style);
  const fontClass = welcomeFontClass(resolved.fontFamily);
  const headlineClass = welcomeHeadlineClass(resolved.size);
  const bodyClass = welcomeBodyClass(resolved.size);

  const ctaClass =
    'inline-flex items-center gap-1.5 text-label-md uppercase tracking-wider hover:opacity-80 transition-opacity';

  const ctaInner = (
    <>
      {message.cta_label}
      <span className="material-symbols-outlined text-[18px]" aria-hidden>
        arrow_forward
      </span>
    </>
  );

  return (
    <section className="w-full bg-surface-ivory py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div
          className={`bg-surface-paper rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 gap-0 items-stretch ${
            hasPhoto ? 'lg:grid-cols-12' : ''
          }`}
        >
          {hasPhoto ? (
            <div className="lg:col-span-5 relative bg-primary flex flex-col justify-end p-8 min-h-[360px] lg:min-h-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${message.person_name}, ${message.person_title}`}
                className="absolute inset-0 w-full h-full object-cover object-top opacity-95 hover:scale-105 transition-transform duration-700"
                src={message.photo_url!}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
              <div className="relative z-10 text-on-primary">
                <span className="text-label-sm uppercase tracking-widest text-secondary-fixed">
                  {message.leadership_label}
                </span>
                <h3 className="text-headline-md text-surface-paper mt-0.5">
                  {message.person_name}
                </h3>
                <p className="text-body-sm text-surface-container-high">{message.person_title}</p>
              </div>
            </div>
          ) : null}

          <div
            className={`${hasPhoto ? 'lg:col-span-7' : ''} p-8 lg:p-12 flex flex-col justify-between ${fontClass}`}
          >
            <div>
              <div className="mb-3">
                <span
                  className="text-label-sm uppercase tracking-widest"
                  style={{ color: resolved.accentColor }}
                >
                  {message.leadership_label}
                </span>
              </div>

              <h2
                className={`${headlineClass} mb-4 leading-tight`}
                style={{ color: resolved.headlineColor }}
              >
                {message.headline}
              </h2>

              {!hasPhoto ? (
                <p className={`${bodyClass} mb-4`} style={{ color: resolved.bodyColor }}>
                  {message.person_name}
                  <span className="opacity-70"> · {message.person_title}</span>
                </p>
              ) : null}

              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={`${bodyClass} mb-4 last:mb-6 leading-relaxed`}
                  style={{ color: resolved.bodyColor }}
                >
                  <WelcomeRichText text={p} markColor={resolved.accentColor} />
                </p>
              ))}

              {message.quote ? (
                <blockquote
                  className={`p-4 rounded-lg bg-surface-container-low ${headlineClass} italic mb-6`}
                  style={{ color: resolved.headlineColor }}
                >
                  &ldquo;
                  <WelcomeRichText text={message.quote} markColor={resolved.accentColor} />
                  &rdquo;
                </blockquote>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-surface-container">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${resolved.accentColor}33`, color: resolved.accentColor }}
                >
                  <span className="material-symbols-outlined text-[22px]" aria-hidden>
                    verified
                  </span>
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-label-md uppercase"
                    style={{ color: resolved.headlineColor }}
                  >
                    {message.signature_name}
                  </span>
                  <span className="text-label-sm" style={{ color: resolved.bodyColor }}>
                    {message.signature_role}
                  </span>
                </div>
              </div>
              {ctaIsHash ? (
                <a href={message.cta_href} className={ctaClass} style={{ color: resolved.headlineColor }}>
                  {ctaInner}
                </a>
              ) : ctaIsExternal ? (
                <a
                  href={message.cta_href}
                  className={ctaClass}
                  style={{ color: resolved.headlineColor }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ctaInner}
                </a>
              ) : (
                <Link href={message.cta_href} className={ctaClass} style={{ color: resolved.headlineColor }}>
                  {ctaInner}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
