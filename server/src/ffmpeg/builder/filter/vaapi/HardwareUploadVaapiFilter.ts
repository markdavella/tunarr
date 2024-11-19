import { FilterOption } from '@/ffmpeg/builder/filter/FilterOption.ts';
import { FrameState } from '@/ffmpeg/builder/state/FrameState.ts';
import { FrameDataLocation } from '@/ffmpeg/builder/types.ts';

export class HardwareUploadVaapiFilter extends FilterOption {
  constructor(
    private setFormat: boolean,
    private extraHardwareFrames?: number,
  ) {
    super();
  }

  get filter() {
    const format = this.setFormat ? 'format=nv12|p010le|vaapi,' : '';
    return `${format}hwupload${
      this.extraHardwareFrames
        ? `=extra_hw_frames=${this.extraHardwareFrames}`
        : ''
    }`;
  }

  nextState(currentState: FrameState): FrameState {
    return currentState.updateFrameLocation(FrameDataLocation.Hardware);
  }
}
