export interface Link {
  slug: string;
  url: string;
  created_at: number;
  expires_at: number | null;
  max_clicks: number | null;
  click_count: number;
  last_clicked: number | null;
  disabled: boolean;
}

export interface CreateLinkInput {
  url: string;
  slug?: string;
  expires_at?: number | null;
  max_clicks?: number | null;
}

export interface PatchLinkInput {
  expires_at?: number | null;
  max_clicks?: number | null;
  disabled?: boolean;
}
