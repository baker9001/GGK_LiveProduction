import { useEffect, useMemo, useState } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialRowsPerPage?: number;
}

export function usePagination<T>(items: readonly T[], options: UsePaginationOptions = {}) {
  const { initialPage = 1, initialRowsPerPage = 10 } = options;
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(rowsPerPage, 1)));

  useEffect(() => {
    setPage((prev) => {
      if (totalCount === 0) {
        return 1;
      }

      if (prev > totalPages) {
        return totalPages;
      }

      if (prev < 1) {
        return 1;
      }

      return prev;
    });
  }, [totalCount, totalPages]);

  const startIndex = totalCount === 0 ? 0 : (page - 1) * rowsPerPage;
  const endIndexExclusive = startIndex + rowsPerPage;

  const paginatedItems = useMemo(() => {
    if (totalCount === 0) {
      return [] as T[];
    }

    return items.slice(startIndex, endIndexExclusive);
  }, [items, startIndex, endIndexExclusive, totalCount]);

  const goToPage = (newPage: number) => {
    if (totalCount === 0) {
      setPage(1);
      return;
    }

    const safePage = Math.min(Math.max(newPage, 1), totalPages);
    setPage(safePage);
  };

  const nextPage = () => {
    if (totalCount === 0) return;
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  const previousPage = () => {
    if (totalCount === 0) return;
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const changeRowsPerPage = (value: number) => {
    const parsed = Number(value) || 10;
    setRowsPerPage(parsed);
    setPage(1);
  };

  const startDisplay = totalCount === 0 ? 0 : startIndex + 1;
  const endDisplay = totalCount === 0 ? 0 : Math.min(endIndexExclusive, totalCount);

  return {
    page,
    rowsPerPage,
    totalPages,
    totalCount,
    paginatedItems,
    start: startDisplay,
    end: endDisplay,
    goToPage,
    nextPage,
    previousPage,
    changeRowsPerPage,
  } as const;
}

