import { PlexLibrary } from '@/store/programmingSelector/store.ts';
import { Maybe, Nilable } from '@/types/util.ts';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PlexServerSettings } from '@tunarr/types';
import { chain, isNil, isUndefined, sumBy } from 'lodash-es';
import { fetchPlexPath } from '../../helpers/plexUtil.ts';
import { useTunarrApi } from '../useTunarrApi.ts';
import { PlexPlaylists } from '@tunarr/types/plex';
import { useEffect } from 'react';
import { isNonEmptyString } from '@/helpers/util.ts';
import { addKnownMediaForServer } from '@/store/programmingSelector/actions.ts';

/**
 * Currently makes the assumption that are operating on an a music library
 * within Plex
 */
export const usePlexPlaylistsInfinite = (
  plexServer: Maybe<PlexServerSettings>,
  currentLibrary: Nilable<PlexLibrary>,
  pageSize: number,
) => {
  const apiClient = useTunarrApi();

  const queryResult = useInfiniteQuery({
    queryKey: [
      'plex',
      plexServer?.name,
      currentLibrary?.library.key,
      'playlists',
    ],
    queryFn: ({ pageParam }) => {
      const plexQuery = new URLSearchParams({
        type: '15',
        sectionID: currentLibrary!.library.key,
        'X-Plex-Container-Start': pageParam.toString(),
        'X-Plex-Container-Size': pageSize.toString(),
      });

      return fetchPlexPath<PlexPlaylists>(
        apiClient,
        plexServer!.name,
        `/playlists?${plexQuery.toString()}`,
      )();
    },
    enabled:
      !isNil(plexServer) &&
      !isNil(currentLibrary) &&
      currentLibrary.library.type === 'artist',
    initialPageParam: 0,
    getNextPageParam: (res, all, last) => {
      const total = sumBy(all, (page) => page.size);
      if (total >= (res.totalSize ?? res.size)) {
        return null;
      }

      // Next offset is the last + how many items we got back.
      return last + res.size;
    },
  });

  useEffect(() => {
    if (isNonEmptyString(plexServer?.name) && !isUndefined(queryResult.data)) {
      const playlists = chain(queryResult.data.pages)
        .reject((page) => page.size === 0)
        .map((page) => page.Metadata)
        .compact()
        .flatten()
        .value();
      addKnownMediaForServer(plexServer.name, playlists);
    }
  }, [plexServer?.name, queryResult.data]);

  return queryResult;
};
