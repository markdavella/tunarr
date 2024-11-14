import { Maybe } from '../../../types/util.ts';
import { VideoFormats } from '../constants.ts';
import { PixelFormat } from '../format/PixelFormat.ts';
import { BaseFfmpegHardwareCapabilities } from './BaseFfmpegHardwareCapabilities.ts';

const MaxwellGm206Models = new Set([
  'GTX 750',
  'GTX 950',
  'GTX 960',
  'GTX 965M',
]);

// https://developer.nvidia.com/video-encode-and-decode-gpu-support-matrix-new
export class NvidiaHardwareCapabilities extends BaseFfmpegHardwareCapabilities {
  readonly type = 'nvidia' as const;

  constructor(
    private model: string,
    private arch: number,
  ) {
    super();
  }

  // Will be used eventually
  canDecode(
    videoFormat: string,
    _videoProfile: Maybe<string>,
    pixelFormat: Maybe<PixelFormat>,
  ): boolean {
    // TODO: Clean this up with ffmpeg builder and consts
    const bitDepth = pixelFormat?.bitDepth ?? 8;

    let canUseHardware = false;

    switch (videoFormat) {
      case VideoFormats.Hevc:
        canUseHardware =
          (this.arch === 52 && MaxwellGm206Models.has(this.model)) ||
          this.arch >= 60;
        break;

      case VideoFormats.H264:
        canUseHardware = bitDepth < 10;
        break;

      case VideoFormats.Mpeg2Video:
        canUseHardware = true;
        break;

      case VideoFormats.Mpeg4:
        canUseHardware = false;
        break;

      case VideoFormats.Av1:
        canUseHardware = this.arch >= 86;
        break;

      case VideoFormats.Vp9:
        canUseHardware =
          bitDepth === 10
            ? this.arch >= 60
            : (this.arch === 52 && MaxwellGm206Models.has(this.model)) ||
              this.arch >= 60;
        break;

      default:
        break;
    }

    // TODO: Check binary capabilities
    return canUseHardware;
  }

  canEncode(
    videoFormat: string,
    _videoProfile: Maybe<string>,
    pixelFormat: Maybe<PixelFormat>,
  ): boolean {
    // TODO: Clean this up with ffmpeg builder and consts
    const bitDepth = pixelFormat?.bitDepth ?? 8;

    if (videoFormat === VideoFormats.Hevc) {
      if (bitDepth === 10) {
        return this.arch >= 60;
      } else {
        return this.arch >= 52;
      }
    } else if (videoFormat === VideoFormats.H264 && bitDepth === 10) {
      return false;
    } else if (videoFormat === VideoFormats.Av1 && this.arch < 80) {
      return false;
    }

    return true;
  }
}
