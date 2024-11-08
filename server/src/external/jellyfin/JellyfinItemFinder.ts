import { JellyfinItem, JellyfinItemKind } from '@tunarr/types/jellyfin';
import dayjs from 'dayjs';
import { find, isUndefined, some } from 'lodash-es';
import { match } from 'ts-pattern';
import { ProgramMinterFactory } from '../../dao/converters/ProgramMinter.ts';
import {
  ProgramExternalIdType,
  programExternalIdTypeFromJellyfinProvider,
} from '../../dao/custom_types/ProgramExternalIdType.ts';
import { ProgramWithExternalIds } from '../../dao/direct/derivedTypes.js';
import { ProgramType } from '../../dao/direct/schema/Program.ts';
import { ProgramDB } from '../../dao/programDB.ts';
import { GlobalScheduler } from '../../services/scheduler.ts';
import { ReconcileProgramDurationsTask } from '../../tasks/ReconcileProgramDurationsTask.ts';
import { Maybe } from '../../types/util.ts';
import { groupByUniq, isDefined } from '../../util/index.ts';
import { LoggerFactory } from '../../util/logging/LoggerFactory.ts';
import { isQueryError } from '../BaseApiClient.ts';
import { MediaSourceApiFactory } from '../MediaSourceApiFactory.ts';
import { JellyfinGetItemsQuery } from './JellyfinApiClient.ts';

export class JellyfinItemFinder {
  #logger = LoggerFactory.child({ className: this.constructor.name });

  constructor(private programDB: ProgramDB) {}

  async findForProgramAndUpdate(programId: string) {
    const program = await this.programDB.getProgramById(programId);

    if (!program) {
      this.#logger.warn('No program found with ID: %s', programId);
      return;
    }

    const potentialApiMatch = await this.findForProgram(program);

    if (!potentialApiMatch) {
      return;
    }

    const oldExternalId = find(
      program.externalIds,
      (eid) => eid.sourceType === ProgramExternalIdType.JELLYFIN,
    );

    const minter = ProgramMinterFactory.create();
    const newExternalId = minter.mintJellyfinExternalId(
      program.externalSourceId,
      program.uuid,
      potentialApiMatch,
    );

    await this.programDB.replaceProgramExternalId(
      program.uuid,
      newExternalId,
      oldExternalId,
    );

    // Right now just check if the durations are different.
    // otherwise we might blow away details we already have, since
    // Jellyfin collects metadata asynchronously (sometimes)
    const updatedProgram = minter.mint(program.externalSourceId, {
      sourceType: 'jellyfin',
      program: potentialApiMatch,
    });

    if (updatedProgram.duration !== program.duration) {
      await this.programDB.updateProgramDuration(
        program.uuid,
        updatedProgram.duration,
      );
      GlobalScheduler.scheduleOneOffTask(
        ReconcileProgramDurationsTask.name,
        dayjs().add(500, 'ms'),
        new ReconcileProgramDurationsTask(),
      );
    }

    return newExternalId;
  }

  async findForProgramId(programId: string) {
    const program = await this.programDB.getProgramById(programId);
    if (!program) {
      this.#logger.warn('No program found with ID: %s', programId);
      return;
    }
    return this.findForProgram(program);
  }

  async findForProgram(program: ProgramWithExternalIds) {
    if (program.sourceType !== 'jellyfin') {
      this.#logger.warn('Program does not have source type "jellyfin"');
      return;
    }

    const jfClient = await MediaSourceApiFactory().getJellyfinByName(
      program.externalSourceId,
    );

    if (!jfClient) {
      this.#logger.error(
        "Couldn't get jellyfin api client for id: %s",
        program.externalSourceId,
      );
      return;
    }

    // If we can locate the item on JF, there is no problem.
    const existingItem = await jfClient.getItem(program.externalKey);
    if (!isQueryError(existingItem) && isDefined(existingItem.data)) {
      this.#logger.error(
        existingItem,
        'Item exists on Jellyfin - no need to find a new match',
      );
      return;
    }

    // If we find a match we have to:
    // 1. Update the program
    // 2. Update its external IDs
    // 3. Reconcile durations in both the lineup and the guide
    const getPotentialMatchByType = async (type: ProgramExternalIdType) => {
      if (idsBySourceType[type]) {
        const opts: JellyfinGetItemsQuery = {
          nameStartsWithOrGreater: program.title,
          recursive: true,
        };

        switch (type) {
          case ProgramExternalIdType.TMDB: {
            opts.hasTmdbId = true;
            break;
          }
          case ProgramExternalIdType.IMDB: {
            opts.hasImdbId = true;
            break;
          }
          case ProgramExternalIdType.TVDB: {
            opts.hasTvdbId = true;
            break;
          }
          default:
            break;
        }

        const jellyfinItemType: JellyfinItemKind = match(program.type)
          .returnType<JellyfinItemKind>()
          .with(ProgramType.Movie, () => 'Movie')
          .with(ProgramType.Episode, () => 'Episode')
          .with(ProgramType.Track, () => 'Audio')
          .exhaustive();

        const queryResult = await jfClient.getItems(
          null,
          null,
          [jellyfinItemType],
          [],
          null,
          opts,
        );

        if (queryResult.type === 'success') {
          return find(queryResult.data.Items, (match) =>
            some(
              match.ProviderIds,
              (val, key) =>
                programExternalIdTypeFromJellyfinProvider(key) === type &&
                val === idsBySourceType[type].externalKey,
            ),
          );
        } else {
          this.#logger.error(
            { error: queryResult },
            'Error while querying items on Jellyfin',
          );
        }
      }
      return;
    };

    // Match on:
    // 1. Title
    // 2. external ID type
    const idsBySourceType = groupByUniq(
      program.externalIds,
      (p) => p.sourceType,
    );

    let possibleMatch: Maybe<JellyfinItem> = await getPotentialMatchByType(
      ProgramExternalIdType.IMDB,
    );

    if (isUndefined(possibleMatch)) {
      possibleMatch = await getPotentialMatchByType(ProgramExternalIdType.TMDB);
    }

    if (isUndefined(possibleMatch)) {
      possibleMatch = await getPotentialMatchByType(ProgramExternalIdType.TVDB);
    }

    return possibleMatch;
  }
}
