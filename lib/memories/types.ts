export type MemoryStatus = 'pending' | 'published' | 'rejected';

export type PublishedMemory = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  storage_path: string | null;
  batch_year: number | null;
  batch_label: string | null;
  created_at: string;
};

export type MemoryRow = PublishedMemory & {
  status: MemoryStatus;
  submitted_by: string | null;
  consent_confirmed: boolean;
  review_note: string | null;
  reviewed_at: string | null;
};
