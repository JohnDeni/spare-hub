export type Category = {
  id: number;
  name: string;
};

export type PaginatedCategories = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Category[];
};
