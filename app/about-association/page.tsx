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
      <CommitteeSection />
    </PortalShell>
  );
}
