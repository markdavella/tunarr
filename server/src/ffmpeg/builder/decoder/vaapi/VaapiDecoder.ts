import { BaseDecoder } from '@/ffmpeg/builder/decoder/BaseDecoder.ts';
import {
  PixelFormatNv12,
  PixelFormatVaapi,
} from '@/ffmpeg/builder/format/PixelFormat.ts';
import { FrameState } from '@/ffmpeg/builder/state/FrameState.ts';

export class VaapiDecoder extends BaseDecoder {
  readonly name: string = 'implicit_vaapi';

  protected outputFrameDataLocation = 'hardware' as const;

  options(): string[] {
    return ['-hwaccel_output_format', 'vaapi'];
  }

  nextState(currentState: FrameState): FrameState {
    const nextState = super.nextState(currentState);
    if (!currentState.pixelFormat) {
      return nextState;
    }

    return nextState.update({
      pixelFormat:
        currentState.pixelFormat.bitDepth === 8
          ? new PixelFormatNv12(currentState.pixelFormat.name)
          : new PixelFormatVaapi(currentState.pixelFormat.name, 10),
    });
  }
}
