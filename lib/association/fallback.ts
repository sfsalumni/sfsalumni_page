export type PublicAssociationAbout = {
  eyebrow: string;
  title: string;
  purpose_heading: string;
  purpose_body: string;
  purpose_note: string | null;
  cta_label: string;
  cta_href: string;
  highlight_eyebrow: string;
  highlight_title: string;
  highlight_body: string;
};

/** Hardcoded page copy used when the DB row is missing or unpublished. */
export const ASSOCIATION_ABOUT_FALLBACK: PublicAssociationAbout = {
  eyebrow: 'ABOUT THE SFS ALUMNI ASSOCIATION',
  title: 'An association for every generation',
  purpose_heading: 'Our purpose',
  purpose_body:
    'The SFS Alumni Association brings together former students of St. Francis de Sales High School, Shanti Nagar, Secunderabad. It exists to preserve shared memories, strengthen lifelong friendships, support current students and contribute to the school’s future.',
  purpose_note:
    'This is proposed copy. The alumni committee should approve the final mission statement, constitution, membership rules and contact details before publication.',
  cta_label: 'Visit member portal ↗',
  cta_href: '/member',
  highlight_eyebrow: '1976–2026',
  highlight_title: '50 years of SFS',
  highlight_body:
    'A school legacy carried forward by students, teachers, families and alumni across generations.',
};
