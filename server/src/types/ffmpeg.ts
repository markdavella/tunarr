import { parseIntOrNull } from '@/util/index.ts';
import { isNull, split } from 'lodash-es';
import { z } from 'zod';

const BaseFfprobeMediaStreamSchema = z.object({
  index: z.number(),
  codec_name: z.string(),
  codec_long_name: z.string().optional(),
  profile: z.string().optional(),
  tags: z.record(z.string()).optional(),
});

export const FfprobeVideoStreamSchema = BaseFfprobeMediaStreamSchema.extend({
  codec_type: z.literal('video'),
  // codec_type: z.enum(['video', 'audio', 'subtitle']).catch('video'),
  // codec_tag_string
  width: z.number(),
  height: z.number(),
  coded_width: z.number(),
  coded_height: z.number(),
  has_b_frames: z.number().optional(),
  sample_aspect_ratio: z.string().optional(),
  display_aspect_ratio: z.string(),
  pix_fmt: z.string().optional(),
  level: z.number().optional(),
  color_range: z.string().optional(),
  color_space: z.string().optional(),
  color_transfer: z.string().optional(),
  color_primaries: z.string().optional(),
  chroma_location: z.string().optional(),
  field_order: z.string().optional(), // enum??
  is_avc: z
    .string()
    .optional()
    .transform((s) => s === 'true'),
  r_frame_rate: z.string().transform(parsePossibleFractionToFloat).optional(),
  avg_frame_rate: z.string().transform(parsePossibleFractionToFloat).optional(),
  time_base: z.string().optional(),
  start_pts: z.number().optional(),
  duration_ts: z.number(), // millis
  bit_rate: z.coerce.number(),
  bits_per_raw_sample: z.coerce.number().optional(),
});

export type FfprobeVideoStream = z.infer<typeof FfprobeVideoStreamSchema>;

export const FfprobeAudioStreamSchema = BaseFfprobeMediaStreamSchema.extend({
  codec_type: z.literal('audio'),
  sample_fmt: z.string().optional(),
  sample_rate: z.string().or(z.coerce.number()).optional(),
  channels: z.number().optional(),
  channel_layout: z.string().optional(),
  bits_per_sample: z.number().optional(),
  initial_padding: z.number().optional(),
  time_base: z.string().optional(),
  bit_rate: z.string().transform((s) => parsePossibleFractionToFloat(s)),
});

export type FfprobeAudioStream = z.infer<typeof FfprobeAudioStreamSchema>;

function parsePossibleFractionToFloat(s: string) {
  if (s.includes('/')) {
    const [num, den] = split(s, '/', 2);
    const numD = parseIntOrNull(num);
    const denD = parseIntOrNull(den);
    if (!isNull(numD) && !isNull(denD) && denD !== 0) {
      return numD / denD;
    }
  }

  return parseIntOrNull(s);
}

export const FfprobeMediaStreamSchema = z.discriminatedUnion('codec_type', [
  FfprobeVideoStreamSchema,
  FfprobeAudioStreamSchema,
]);

export const FfprobeMediaFormatSchema = z.object({
  filename: z.string().optional(),
  nb_streams: z.number(),
  format_name: z.string(),
  format_long_name: z.string(),
  start_time: z.string(),
  duration: z.coerce.number(),
  size: z.coerce.number(),
  bit_rate: z.coerce.number(),
  probe_score: z.number().optional(),
});

export const FfprobeMediaInfoSchema = z.object({
  streams: z.array(FfprobeMediaStreamSchema),
  format: FfprobeMediaFormatSchema,
});
