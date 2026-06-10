interface PaginationQueryInput {
  page?: string | number;
  pageSize?: string | number;
}

export const getPaginationOptions = (
  query: PaginationQueryInput,
  defaultPageSize: number
) => {
  const page = Math.max(Number.parseInt(String(query.page ?? 1), 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number.parseInt(String(query.pageSize ?? defaultPageSize), 10) || defaultPageSize, 1),
    100
  );

  return {
    take: pageSize,
    skip: (page - 1) * pageSize,
    page,
    pageSize,
  };
};

export const formatPaginationResponse = <T>(
  data: T[],
  totalRecords: number,
  page: number,
  pageSize: number
) => {
  const totalPages = Math.ceil(totalRecords / pageSize);

  return {
    currentPage: page,
    pageSize,
    totalRecords,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    data,
  };
};
