import Link from 'next/link';
import CommitteeSection from '@/components/committee-section';
import PortalShell from '@/components/portal-shell';
import { getAssociationAbout } from '@/lib/association/load';

export default async function AssociationPage() {
  const about = await getAssociationAbout();
  const ctaIsExternal = /^https?:\/\//i.test(about.cta_href);

  return (
    <PortalShell title={about.title} eyebrow={about.eyebrow}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl bg-white border border-outline-variant p-7 md:p-9">
          <h2 className="text-headline-md text-primary">{about.purpose_heading}</h2>
          <p className="text-body-md text-on-surface-variant mt-4 leading-relaxed">
            {about.purpose_body}
          </p>
          {about.purpose_note ? (
            <p className="text-body-sm text-on-surface-variant mt-4">{about.purpose_note}</p>
          ) : null}
          {ctaIsExternal ? (
            <a
              href={about.cta_href}
              className="inline-flex mt-6 rounded-lg bg-primary text-white px-5 py-3"
              target="_blank"
              rel="noopener noreferrer"
            >
              {about.cta_label}
            </a>
          ) : (
            <Link
              href={about.cta_href}
              className="inline-flex mt-6 rounded-lg bg-primary text-white px-5 py-3"
            >
              {about.cta_label}
            </Link>
          )}
        </section>
        <section className="rounded-2xl bg-primary text-white p-7 md:p-9">
          <div className="text-label-sm uppercase tracking-widest text-secondary-fixed">
            {about.highlight_eyebrow}
          </div>
          <h2 className="text-headline-md mt-3">{about.highlight_title}</h2>
          <p className="text-body-sm text-white/80 mt-3">{about.highlight_body}</p>
        </section>
      </div>
      <CommitteeSection />
    </PortalShell>
  );
}
