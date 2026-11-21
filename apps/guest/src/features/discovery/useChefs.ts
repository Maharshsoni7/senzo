import { listChefs, type ListChefsParams } from '@senzo/api-client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function useChefs(params: ListChefsParams) {
  return useQuery({
    queryKey: ['chefs', params],
    queryFn: () => listChefs(params),
    placeholderData: keepPreviousData,
  });
}

export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
