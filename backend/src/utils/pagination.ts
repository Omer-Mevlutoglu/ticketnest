import { FilterQuery, Model, SortOrder } from "mongoose";

/**
 * Page metadata returned alongside every list.
 *
 * `data` first so the common case reads naturally; the rest is what a client
 * needs to render a pager without a second request.
 */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface PaginateOptions<T> {
  filter?: FilterQuery<T>;
  page: number;
  limit: number;
  /**
   * Sort keys. `_id` is appended automatically as a tiebreaker: without one,
   * documents sharing a sort value can move between pages, so a record is seen
   * twice or missed entirely as the caller steps through.
   */
  sort: Record<string, SortOrder>;
  /** Fields to include/exclude, e.g. "-passwordHash". */
  select?: string;
  populate?: Array<{ path: string; select?: string }>;
}

export const paginate = async <T>(
  model: Model<T>,
  {
    filter = {} as FilterQuery<T>,
    page,
    limit,
    sort,
    select,
    populate = [],
  }: PaginateOptions<T>
): Promise<Page<T>> => {
  const skip = (page - 1) * limit;

  let query = model
    .find(filter)
    .sort({ ...sort, _id: -1 })
    .skip(skip)
    .limit(limit);

  if (select) query = query.select(select);
  for (const p of populate) query = query.populate(p.path, p.select);

  // Count and fetch together — the count is needed for pageCount, and running
  // them in parallel keeps the extra round trip off the critical path.
  const [data, total] = await Promise.all([
    query.lean<T[]>().exec(),
    model.countDocuments(filter).exec(),
  ]);

  return {
    data,
    total,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(total / limit)),
  };
};
