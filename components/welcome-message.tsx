import Link from 'next/link';
import { splitWelcomeBody } from '@/lib/welcome/validate';
import type { PublicWelcome } from '@/lib/welcome/load';

export default function WelcomeMessage({ message }: { message: PublicWelcome }) {
  const paragraphs = splitWelcomeBody(message.body);
  const hasPhoto = Boolean(message.photo_url);
  const ctaIsHash = message.cta_href.startsWith('#');
  const ctaIsExternal = /^https?:\/\//i.test(message.cta_href);

  const ctaClass =
    'inline-flex items-center gap-1.5 text-label-md uppercase tracking-wider text-primary hover:text-jubilee-gold-deep transition-colors';

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
            className={`${hasPhoto ? 'lg:col-span-7' : ''} p-8 lg:p-12 flex flex-col justify-between`}
          >
            <div>
              <div className="mb-3">
                <span className="text-label-sm uppercase tracking-widest text-jubilee-gold-deep">
                  {message.leadership_label}
                </span>
              </div>

              <h2 className="text-headline-lg text-primary mb-4 leading-tight">
                {message.headline}
              </h2>

              {!hasPhoto ? (
                <p className="text-body-sm text-on-surface-variant mb-4">
                  {message.person_name}
                  <span className="text-on-surface-variant/70"> · {message.person_title}</span>
                </p>
              ) : null}

              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-body-md text-on-surface-variant mb-4 last:mb-6 leading-relaxed"
                >
                  {p}
                </p>
              ))}

              {message.quote ? (
                <blockquote className="p-4 rounded-lg bg-surface-container-low text-primary text-headline-sm italic mb-6">
                  &ldquo;{message.quote}&rdquo;
                </blockquote>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-container/30 flex items-center justify-center text-jubilee-gold-deep">
                  <span className="material-symbols-outlined text-[22px]" aria-hidden>
                    verified
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-label-md text-primary uppercase">
                    {message.signature_name}
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    {message.signature_role}
                  </span>
                </div>
              </div>
              {ctaIsHash ? (
                <a href={message.cta_href} className={ctaClass}>
                  {ctaInner}
                </a>
              ) : ctaIsExternal ? (
                <a
                  href={message.cta_href}
                  className={ctaClass}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ctaInner}
                </a>
              ) : (
                <Link href={message.cta_href} className={ctaClass}>
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
