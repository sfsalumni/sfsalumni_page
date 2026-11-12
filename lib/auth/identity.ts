export function normalizeLoginId(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

/** Custom username, or the email when the person leaves username blank. */
export function resolveUsername(raw: string, email: string): string {
  return normalizeLoginId(raw) || normalizeLoginId(email);
}

/** Null when the username can be stored. An email-shaped value is allowed. */
export function usernameError(username: string): string | null {
  const value = normalizeLoginId(username);
  if (!value) return 'Choose a username, or leave it blank to use your email';
  if (value.includes('@')) return null;
  if (value.length < 3 || value.length > 30) {
    return 'Username must be 3–30 characters';
  }
  if (!/^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/.test(value) || value.includes('..')) {
    return 'Username can use letters, numbers, dots, and underscores';
  }
  return null;
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}

export function joinName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}
