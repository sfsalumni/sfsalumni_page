/** Portal nav / home visibility flags. Home + Events are always shown. */

export type PortalMenuFlags = {
  show_donate: boolean;
  show_stories: boolean;
  show_memories: boolean;
  show_submissions: boolean;
  /** Home-page explore lanes (Events / Memories / Donate cards). */
  show_home_lanes: boolean;
};

/** Day-1 defaults: only Home + Events in the sidebar; no home lanes / donate strip. */
export const DAY1_PORTAL_MENU: PortalMenuFlags = {
  show_donate: false,
  show_stories: false,
  show_memories: false,
  show_submissions: false,
  show_home_lanes: false,
};

export type PortalNavLink = { href: string; label: string; emphasize?: boolean };

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

/** Validate admin POST body into portal menu flags. */
export function assertPortalMenuFields(body: unknown): PortalMenuFlags {
  const row = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  return {
    show_donate: asBool(row.show_donate, DAY1_PORTAL_MENU.show_donate),
    show_stories: asBool(row.show_stories, DAY1_PORTAL_MENU.show_stories),
    show_memories: asBool(row.show_memories, DAY1_PORTAL_MENU.show_memories),
    show_submissions: asBool(row.show_submissions, DAY1_PORTAL_MENU.show_submissions),
    show_home_lanes: asBool(row.show_home_lanes, DAY1_PORTAL_MENU.show_home_lanes),
  };
}

export function filterPortalNavLinks(
  links: PortalNavLink[],
  flags: PortalMenuFlags
): PortalNavLink[] {
  return links.filter((link) => {
    if (link.href === '/member/donate') return flags.show_donate;
    if (link.href === '/stories') return flags.show_stories;
    if (link.href === '/memories') return flags.show_memories;
    if (link.href === '/submissions') return flags.show_submissions;
    return true;
  });
}

export function homeLanesVisible(flags: PortalMenuFlags): boolean {
  return flags.show_home_lanes;
}

