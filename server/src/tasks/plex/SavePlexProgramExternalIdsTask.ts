import { ProgramDB } from '@/db/ProgramDB.ts';
import { ProgramExternalIdType } from '@/db/custom_types/ProgramExternalIdType.ts';
import { upsertRawProgramExternalIds } from '@/db/programExternalIdHelpers.ts';
import { ProgramExternalId } from '@/db/schema/ProgramExternalId.ts';
import { isQueryError } from '@/external/BaseApiClient.js';
import { MediaSourceApiFactory } from '@/external/MediaSourceApiFactory.js';
import { PlexApiClient } from '@/external/plex/PlexApiClient.js';
import { Task } from '@/tasks/Task.ts';
import { Maybe } from '@/types/util.js';
import { mintExternalIdForPlexGuid } from '@/util/externalIds.js';
import { isDefined, isNonEmptyString } from '@/util/index.js';
import { PlexTerminalMedia } from '@tunarr/types/plex';
import { compact, isEmpty, isNil, isUndefined, map } from 'lodash-es';

export class SavePlexProgramExternalIdsTask extends Task {
  ID = SavePlexProgramExternalIdsTask.name;

  constructor(
    private programId: string,
    private programDB: ProgramDB,
  ) {
    super();
  }

  protected async runInternal(): Promise<unknown> {
    const program = await this.programDB.getProgramById(this.programId);

    if (isNil(program)) {
      throw new Error('Program not found ID = ' + this.programId);
    }

    const plexIds = program.externalIds.filter(
      (eid) =>
        eid.sourceType === ProgramExternalIdType.PLEX &&
        isNonEmptyString(eid.externalSourceId),
    );

    if (isEmpty(plexIds)) {
      return;
    }

    let chosenId: Maybe<ProgramExternalId> = undefined;
    let api: Maybe<PlexApiClient>;
    for (const id of plexIds) {
      if (!isNonEmptyString(id.externalSourceId)) {
        continue;
      }

      api = await MediaSourceApiFactory().getOrSet(id.externalSourceId);

      if (isDefined(api)) {
        chosenId = id;
        break;
      }
    }

    if (isUndefined(api) || isUndefined(chosenId)) {
      return;
    }

    const metadataResult = await api.getItemMetadata(chosenId.externalKey);

    if (isQueryError(metadataResult)) {
      this.logger.error(
        'Error querying Plex for item %s',
        chosenId.externalKey,
      );
      return;
    }

    const metadata = metadataResult.data as PlexTerminalMedia;

    const eids = compact(
      map(metadata.Guid, (guid) => {
        const parsed = mintExternalIdForPlexGuid(guid.id, program.uuid);
        if (parsed) {
          parsed.externalSourceId = undefined;
          return parsed;
        }

        return;
      }),
    );

    return await upsertRawProgramExternalIds(eids);
  }

  get taskName() {
    return SavePlexProgramExternalIdsTask.name;
  }
}
