import { MediaStream } from '@/ffmpeg/builder/MediaStream.ts';
import { InputSource } from '@/ffmpeg/builder/input/InputSource.ts';
import { InputOption } from './InputOption.ts';

export class HttpReconnectOptions extends InputOption {
  appliesToInput(input: InputSource<MediaStream>): boolean {
    return input.protocol === 'http' && input.continuity === 'discrete';
  }

  options(): string[] {
    return [
      '-reconnect',
      '1',
      '-reconnect_on_network_error',
      '1',
      '-reconnect_streamed',
      '1',
      '-multiple_requests',
      '1',
    ];
  }

  affectsFrameState: boolean = false;
}
