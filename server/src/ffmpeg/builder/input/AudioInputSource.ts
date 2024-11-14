import { FilterStreamSource } from '../../../stream/types.ts';
import { AudioStream } from '../MediaStream.ts';
import { SineWaveGeneratorFilter } from '../filter/SineWaveGeneratorFilter.ts';
import { LavfiInputOption } from '../options/input/LavfiInputOption.ts';
import { AudioState } from '../state/AudioState.ts';
import { HasFilterOption } from '../types/PipelineStep.ts';
import {
  InputSource,
  InputSourceContinuity,
  StreamSource,
} from './InputSource.ts';

export class AudioInputSource<
  StreamType extends AudioStream = AudioStream,
> extends InputSource<StreamType> {
  readonly type = 'audio';

  constructor(
    source: StreamSource,
    public streams: StreamType[],
    public desiredState: AudioState,
    continuity: InputSourceContinuity = 'discrete',
  ) {
    super(source, continuity);
  }
}

export class NullAudioInputSource extends AudioInputSource {
  constructor(desiredState: AudioState) {
    super(
      new FilterStreamSource('anullsrc'),
      [AudioStream.create({ index: 0, channels: -1, codec: 'unknown' })],
      desiredState,
    );
    this.inputOptions.push(new LavfiInputOption());
  }
}

export class AudioInputFilterSource extends AudioInputSource {
  constructor(
    desiredState: AudioState,
    filter: string = 'aevalsrc=0',
    initialFilters: HasFilterOption[] = [],
  ) {
    super(
      new FilterStreamSource(filter),
      [AudioStream.create({ index: 0, channels: -1, codec: 'unknown' })],
      desiredState,
    );
    this.inputOptions.push(new LavfiInputOption());
    this.filterSteps.push(...initialFilters);
  }

  static sine(outState: AudioState) {
    return new AudioInputFilterSource(
      outState,
      new SineWaveGeneratorFilter(400).filter,
    );
  }

  static noise(outState: AudioState) {
    return new AudioInputFilterSource(outState, 'anoisesrc=c=white:a=0.7');
  }
}
