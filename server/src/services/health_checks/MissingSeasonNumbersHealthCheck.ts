import { getDatabase } from '@/db/DBAccess.ts';
import { ProgramType } from '@/db/schema/Program.ts';
import { ProgramGroupingType } from '@/db/schema/ProgramGrouping.ts';
import {
  HealthCheck,
  HealthCheckResult,
  HealthyHealthCheckResult,
} from './HealthCheck.ts';

export class MissingSeasonNumbersHealthCheck implements HealthCheck {
  readonly id = 'MissingSeasonNumbers';

  async getStatus(): Promise<HealthCheckResult> {
    const missingFromProgramTable = await getDatabase()
      .selectFrom('program')
      .select((eb) => eb.fn.count<number>('uuid').as('count'))
      .where('type', '=', ProgramType.Episode)
      .where((eb) => eb.or([eb('seasonNumber', 'is', null)]))
      .executeTakeFirst();

    const missingFromGroupingTable = await getDatabase()
      .selectFrom('programGrouping')
      .select((eb) => eb.fn.count<number>('uuid').as('count'))
      .where('type', '=', ProgramGroupingType.Season)
      .where('index', 'is', null)
      .executeTakeFirst();

    const totalMissing =
      (missingFromProgramTable?.count ?? 0) +
      (missingFromGroupingTable?.count ?? 0);

    if (totalMissing === 0) {
      return HealthyHealthCheckResult;
    }

    return {
      type: 'warning',
      context: `There are ${totalMissing} program(s) missing a season number`,
    };
  }
}
