export interface CursorPage<T> {
  data: T[];
  next_cursor?: string;
  prev_cursor?: string;
  has_more: boolean;
  per_page: number;
  total?: number;
}

export interface CursorPaginationParams {
  cursor?: string;
  per_page?: number;
  direction?: 'next' | 'prev';
}