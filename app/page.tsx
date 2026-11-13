import Hero from '@/components/hero';
import WelcomeMessage from '@/components/welcome-message';
import { getPublishedWelcome } from '@/lib/welcome/load';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const galleryItems = [
  {
    id: 1,
    image: '/images/classroom.jpg',
    label: 'Classroom Foundations',
    title: 'Generations of Academic Focus & Value-Based Learning',
    span: 'md:col-span-7',
    height: 'min-h-[300px]',
  },
  {
    id: 2,
    image: '/images/assembly.jpg',
    label: 'Assembly Traditions',
    title: 'School Ground Assemblies & Sports Disciplines',
    span: 'md:col-span-5',
    height: 'min-h-[300px]',
  },
  {
    id: 3,
    image: '/images/council.jpg',
    label: 'Student Leadership',
    title: 'Investiture & House Prefects',
    span: 'md:col-span-4',
    height: 'h-64',
  },
  {
    id: 4,
    image: '/images/annual-day.jpg',
    label: 'Cultural Heritage',
    title: 'Annual Day & Celebrations',
    span: 'md:col-span-4',
    height: 'h-64',
  },
  {
    id: 5,
    image: '/images/faculty.jpg',
    label: 'Dedicated Mentors',
    title: 'Teachers Who Guided 50 Years',
    span: 'md:col-span-4',
    height: 'h-64',
  },
];

export default async function HomePage() {
  const welcome = await getPublishedWelcome();

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <main className="w-full pt-20 bg-surface flex-grow">
        <Hero />

        {welcome ? <WelcomeMessage message={welcome} /> : null}

        <section className="w-full bg-surface-bright py-16 lg:py-20" id="gallery-section">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-label-sm uppercase tracking-widest text-jubilee-gold-deep font-bold">
                Historical & Campus Archives
              </span>
              <h2 className="text-headline-lg text-primary tracking-tight mt-1">
                Our School Gallery & Campus Life
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Glimpses of daily discipline, investitures, and grand celebrations that have shaped
                SFS Shanthinagar over fifty years.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {galleryItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`${item.span} rounded-xl overflow-hidden shadow-md group relative ${item.height} bg-primary`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={item.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-4 left-4 right-4 text-on-primary">
                    <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">
                      {item.label}
                    </span>
                    <p
                      className={`text-surface-paper mt-1 ${
                        idx < 2 ? 'text-headline-sm' : 'text-body-md font-semibold'
                      }`}
                    >
                      {item.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full bg-surface-ivory pt-16 pb-12 shadow-[0_-1px_12px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 pb-12">
            <div className="md:col-span-5 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="SFS Shanthinagar Emblem"
                  className="h-10 w-auto object-contain rounded-full"
                  src="/images/emblem.png"
                />
                <span className="text-headline-sm text-primary">
                  St. Francis de Sales&apos; High School
                </span>
              </div>

              <p className="text-body-sm text-on-surface-variant max-w-md mb-6">
                North Lalaguda, Shanthinagar, Secunderabad - 500017, Telangana, India
              </p>

              <div className="flex flex-col gap-2.5 mb-6">
                <a
                  href="mailto:info@sfsshanthinagar.com"
                  className="inline-flex items-center gap-2.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                  info@sfsshanthinagar.com
                </a>
                <a
                  href="mailto:sfsalumnis@gmail.com"
                  className="inline-flex items-center gap-2.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                  sfsalumnis@gmail.com
                </a>
                <a
                  href="tel:+918012345678"
                  className="inline-flex items-center gap-2.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">call</span>
                  +91 80 1234 5678
                </a>
                <a
                  href="tel:+917416368516"
                  className="inline-flex items-center gap-2.5 text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-primary text-[18px]">call</span>
                  +91 7416 368 516
                </a>
              </div>

              <div className="flex items-center gap-3">
                {['public', 'chat', 'photo_camera', 'smart_display'].map((icon) => (
                  <a
                    key={icon}
                    className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-colors"
                    href="#"
                  >
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="md:col-span-7 flex flex-col justify-between">
              <div className="w-full h-56 rounded-xl overflow-hidden bg-surface-container relative shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                <iframe
                  className="w-full h-full border-0 filter contrast-[1.02] opacity-90 hover:opacity-100 transition-opacity"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src="https://maps.google.com/maps?q=St.+Francis+de+Sales+High+School+Shanthinagar+Secunderabad&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  title="SFS Shanthinagar Campus Location"
                />
              </div>
              <div className="flex items-center gap-2 mt-3 text-on-surface-variant">
                <span className="material-symbols-outlined text-jubilee-amber text-[18px]">
                  location_on
                </span>
                <span className="text-label-sm uppercase tracking-wider">
                  Campus Location • North Lalaguda, Secunderabad
                </span>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-2">
            <p className="text-body-sm text-on-surface-variant text-center sm:text-left">
              Copyright © 2026 St. Francis de Sales&apos; High School. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
