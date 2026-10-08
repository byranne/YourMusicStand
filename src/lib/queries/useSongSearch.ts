import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { searchSongs } from '../musicbrainz';

const MIN_QUERY_LENGTH = 2;
// MusicBrainz allows 1 request per second, so wait for a pause in typing.
const DEBOUNCE_MS = 400;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// Catalog search for what the user is typing. Debounced, cancelled when the
// text changes, and cached so going back to an earlier query costs no request.
export function useSongSearch(input: string) {
  const text = input.trim();
  const debounced = useDebouncedValue(text, DEBOUNCE_MS);
  const isLongEnough = text.length >= MIN_QUERY_LENGTH;

  const query = useQuery({
    queryKey: ['song-search', debounced.toLowerCase()],
    queryFn: ({ signal }) => searchSongs(debounced, signal),
    enabled: debounced.length >= MIN_QUERY_LENGTH,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });

  const isSearching = isLongEnough && (text !== debounced || query.isFetching);

  return {
    songs: isLongEnough ? (query.data ?? []) : [],
    isSearching,
    // True once the results on screen are the answer for the current text.
    isSettled: isLongEnough && !isSearching && query.isSuccess,
    isError: isLongEnough && !isSearching && query.isError,
  };
}
