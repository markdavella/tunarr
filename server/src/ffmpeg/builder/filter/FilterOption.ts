import { FrameState } from '../state/FrameState.ts';
import {
  FilterOptionPipelineStep,
  HasFilterOption,
} from '../types/PipelineStep.ts';

export abstract class FilterOption
  implements FilterOptionPipelineStep, HasFilterOption
{
  public readonly type = 'filter';

  public readonly affectsFrameState: boolean = false;
  public abstract readonly filter: string;

  nextState(currentState: FrameState): FrameState {
    return currentState;
  }

  options(): string[] {
    return [this.filter];
  }
}
