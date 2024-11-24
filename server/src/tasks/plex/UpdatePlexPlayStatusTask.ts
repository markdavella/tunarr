import type { MediaSource } from '@/db/schema/MediaSource.ts';
import { MediaSourceApiFactory } from '@/external/MediaSourceApiFactory.ts';
import { GlobalScheduler } from '@/services/Scheduler.ts';
import { ScheduledTask } from '@/tasks/ScheduledTask.ts';
import { Task } from '@/tasks/Task.ts';
import { run } from '@/util/index.ts';
import { getTunarrVersion } from '@/util/version.ts';
import { PlexClientIdentifier } from '@tunarr/shared/constants';
import dayjs from 'dayjs';
import { RecurrenceRule } from 'node-schedule';
import { v4 } from 'uuid';

type UpdatePlexPlayStatusScheduleRequest = {
  ratingKey: string;
  startTime: number;
  duration: number;
  channelNumber: number;
  updateIntervalSeconds?: number;
};

type UpdatePlexPlayStatusInvocation = UpdatePlexPlayStatusScheduleRequest & {
  playState: PlayState;
  sessionId: string;
};

type PlayState = 'playing' | 'stopped';

const StaticPlexHeaders = {
  'X-Plex-Product': 'Tunarr',
  'X-Plex-Platform': 'Generic',
  'X-Plex-Client-Platform': 'Generic',
  'X-Plex-Client-Profile-Name': 'Generic',
};

export class UpdatePlexPlayStatusScheduledTask extends ScheduledTask {
  private playState: PlayState = 'playing';

  constructor(
    private plexServer: MediaSource,
    private request: UpdatePlexPlayStatusScheduleRequest,
    public sessionId: string = v4(),
  ) {
    super(
      UpdatePlexPlayStatusScheduledTask.name,
      run(() => {
        const rule = new RecurrenceRule();
        rule.second = request.updateIntervalSeconds ?? 10;
        return rule;
      }),
      () => this.getNextTask(),
      { visible: false },
    );
    // Kick off leading edge task
    GlobalScheduler.scheduleOneOffTask(
      UpdatePlexPlayStatusTask.name,
      dayjs().add(1, 'second'),
      this.getNextTask(),
    );
  }

  get id() {
    return `${this.name}_${this.sessionId}`;
  }

  stop() {
    this.scheduledJob.cancel(false);
    this.playState = 'stopped';
    GlobalScheduler.scheduleOneOffTask(
      UpdatePlexPlayStatusTask.name,
      dayjs().add(5, 'seconds').toDate(),
      this.getNextTask(),
    );
  }

  private getNextTask(): UpdatePlexPlayStatusTask {
    const task = new UpdatePlexPlayStatusTask(this.plexServer, {
      ...this.request,
      playState: this.playState,
      sessionId: this.sessionId,
    });

    this.request = {
      ...this.request,
      startTime: Math.min(
        this.request.startTime +
          (this.request.updateIntervalSeconds ?? 10) * 1000,
        this.request.duration,
      ),
    };

    return task;
  }
}

class UpdatePlexPlayStatusTask extends Task {
  public ID: string = UpdatePlexPlayStatusTask.name;

  get taskName(): string {
    return this.ID;
  }

  constructor(
    private plexServer: MediaSource,
    private request: UpdatePlexPlayStatusInvocation,
  ) {
    super();
  }

  protected async runInternal(): Promise<boolean> {
    const plex = MediaSourceApiFactory().get(this.plexServer);

    const deviceName = `tunarr-channel-${this.request.channelNumber}`;
    const params = {
      ...StaticPlexHeaders,
      ratingKey: this.request.ratingKey,
      state: this.request.playState,
      key: `/library/metadata/${this.request.ratingKey}`,
      time: this.request.startTime,
      duration: this.request.duration,
      'X-Plex-Product': 'Tunarr',
      'X-Plex-Version': getTunarrVersion(),
      'X-Plex-Device-Name': deviceName,
      'X-Plex-Device': deviceName,
      'X-Plex-Client-Identifier': PlexClientIdentifier,
    };

    try {
      await plex.doPost({ url: '/:/timeline', params });
    } catch (error) {
      this.logger.warn(
        error,
        `Problem updating Plex status using status URL for item ${this.request.ratingKey}: `,
      );
      return false;
    }

    return true;
  }
}
