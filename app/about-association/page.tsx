import Link from 'next/link';
import AssociationRichText from '@/components/association-rich-text';
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
          <div className="mt-4">
            <AssociationRichText text={about.purpose_body} />
          </div>
          {about.purpose_note ? (
            <div className="mt-4">
              <AssociationRichText
                text={about.purpose_note}
                className="text-body-sm text-on-surface-variant"
              />
            </div>
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
          <div className="mt-3">
            <AssociationRichText
              text={about.highlight_body}
              className="text-body-sm text-white/80"
              markColor="#F5E6A8"
            />
          </div>
        </section>
      </div>
      <CommitteeSection />
    </PortalShell>
  );
}
