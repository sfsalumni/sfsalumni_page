export type ParsedStory = {
  title: string;
  body: string;
};

export function assertStorySubmit(input: {
  title: unknown;
  body: unknown;
}): ParsedStory {
  const title = String(input.title ?? '').trim();
  const body = String(input.body ?? '').trim();
  if (!title) throw new Error('Title is required');
  if (title.length > 120) throw new Error('Title must be 120 characters or fewer');
  if (!body) throw new Error('Story text is required');
  if (body.length > 5000) throw new Error('Story must be 5000 characters or fewer');
  return { title, body };
}
