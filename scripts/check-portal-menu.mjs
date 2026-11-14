/**
 * Self-check for portal menu flags (Day-1 defaults + link filter).
 * Run: node --experimental-strip-types scripts/check-portal-menu.mjs
 */
import { registerHooks } from 'node:module';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
registerHooks({
  resolve(specifier, context, nextResolve) {
    let spec = specifier;
    if (spec.startsWith('@/')) spec = pathToFileURL(path.join(root, spec.slice(2))).href;
    if (spec.startsWith('.')) {
      const parent = context.parentURL ? fileURLToPath(context.parentURL) : root;
      const abs = path.resolve(path.dirname(parent), spec);
      if (!path.extname(abs) && existsSync(`${abs}.ts`)) spec = pathToFileURL(`${abs}.ts`).href;
    } else if (spec.startsWith('file:')) {
      const abs = fileURLToPath(spec);
      if (!path.extname(abs) && existsSync(`${abs}.ts`)) spec = pathToFileURL(`${abs}.ts`).href;
    }
    return nextResolve(spec, context);
  },
});

const {
  DAY1_PORTAL_MENU,
  assertPortalMenuFields,
  filterPortalNavLinks,
  homeLanesVisible,
} = await import('../lib/portal-menu/menu.ts');

assert.equal(DAY1_PORTAL_MENU.show_donate, false);
assert.equal(DAY1_PORTAL_MENU.show_stories, false);
assert.equal(DAY1_PORTAL_MENU.show_memories, false);
assert.equal(DAY1_PORTAL_MENU.show_submissions, false);
assert.equal(DAY1_PORTAL_MENU.show_home_lanes, false);

const allOn = assertPortalMenuFields({
  show_donate: true,
  show_stories: true,
  show_memories: true,
  show_submissions: true,
  show_home_lanes: true,
});
assert.equal(allOn.show_donate, true);

const links = [
  { href: '/member', label: 'Home' },
  { href: '/member/donate', label: 'Donate', emphasize: true },
  { href: '/events', label: 'Events' },
  { href: '/stories', label: 'Stories' },
  { href: '/memories', label: 'Memories' },
  { href: '/submissions', label: 'My submissions' },
];

assert.deepEqual(
  filterPortalNavLinks(links, DAY1_PORTAL_MENU).map((l) => l.href),
  ['/member', '/events']
);
assert.deepEqual(
  filterPortalNavLinks(links, allOn).map((l) => l.href),
  ['/member', '/member/donate', '/events', '/stories', '/memories', '/submissions']
);
assert.equal(homeLanesVisible(DAY1_PORTAL_MENU), false);
assert.equal(homeLanesVisible(allOn), true);

console.log('check-portal-menu: ok');
