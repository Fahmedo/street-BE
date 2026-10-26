export function formatPaginatedResponse<T>(
  items: T[],
  page: number,
  perPage: number,
  totalItems: number,
  message = 'success',
): {
  message: string;
  items: T[];
  meta: any;
  totalAmount: string;
} {
  const totalPages = Math.ceil(totalItems / perPage);

  return {
    message,
    items,
    meta: {
      currentPage: page,
      itemsPerPage: perPage,
      totalItems,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
    totalAmount: totalItems.toString(),
  };
}
