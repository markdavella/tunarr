import { VideoFormats } from '@/ffmpeg/builder/constants.ts';
import { VideoEncoder } from '@/ffmpeg/builder/encoder/BaseEncoder.ts';
import { Nullable } from '@/types/util.ts';
import { isNonEmptyString } from '@/util/index.ts';

export class NvidiaHevcEncoder extends VideoEncoder {
  protected videoFormat: string = VideoFormats.Hevc;

  constructor(private videoPreset: Nullable<string>) {
    super('hevc_nvenc');
  }

  options(): string[] {
    // TODO add options/support for HEVC b-frames
    const opts = [...super.options(), '-b_ref_mode', '0'];
    if (isNonEmptyString(this.videoPreset)) {
      opts.push('-preset:v', this.videoPreset);
    }
    return opts;
  }
}

export class NvidiaH264Encoder extends VideoEncoder {
  protected videoFormat: string = VideoFormats.H264;

  constructor(
    private videoProfile: Nullable<string>,
    private videoPreset: Nullable<string>,
  ) {
    super('h264_nvenc');
  }

  options(): string[] {
    const opts = super.options();
    if (isNonEmptyString(this.videoProfile)) {
      opts.push('-profile:v', this.videoProfile.toLowerCase());
    }

    if (isNonEmptyString(this.videoPreset)) {
      opts.push('-preset:v', this.videoPreset.toLowerCase());
    }

    return opts;
  }
}
