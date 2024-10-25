import dayjs, { Dayjs } from 'dayjs';
import { Nullable } from './util';

export class DateTimeRange {
  private constructor(
    public from: Dayjs,
    public to: Dayjs,
  ) {}

  static create(
    from: dayjs.ConfigType | Dayjs,
    to: Date | Dayjs,
  ): Nullable<DateTimeRange> {
    from = dayjs.isDayjs(from) ? from : dayjs(from);
    to = dayjs.isDayjs(to) ? to : dayjs(to);

    if (to.isBefore(from)) {
      return null;
    }
    return new DateTimeRange(from, to);
  }
}
