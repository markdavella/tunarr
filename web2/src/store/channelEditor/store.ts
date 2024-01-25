import {
  Channel,
  ChannelProgram,
  ContentProgram,
  CustomProgram,
  CustomShow,
} from '@tunarr/types';
import { StateCreator } from 'zustand';

// Represents a program listing in the editor
export interface ProgrammingEditorStateInner<
  EntityType,
  ProgramType extends ChannelProgram = ChannelProgram,
> {
  // Original state of the working entity. Used to reset state
  originalEntity?: EntityType;
  // The working entity - edits should be made directly here
  currentEntity?: EntityType;
  // The programs in the state they were when we fetched them
  // This can be used to reset the state of the editor and
  // start over changes without having to close/enter the page
  originalProgramList: ProgramType[];
  // The actively edited list
  programList: ProgramType[];
  // slot schedule preview list -- this may have A LOT of programs
  // in it, so we should be sure to clear it out when the page is
  // not currently being viewed
  schedulePreviewList: ProgramType[];
  dirty: {
    programs: boolean;
  };
}

export interface ChannelEditorState {
  channelEditor: ProgrammingEditorStateInner<Channel>;
  customShowEditor: ProgrammingEditorStateInner<
    CustomShow,
    ContentProgram | CustomProgram // You cannot add Flex to custom shows
  >;
}

export const initialChannelEditorState: ChannelEditorState = {
  channelEditor: {
    originalProgramList: [],
    programList: [],
    schedulePreviewList: [],
    dirty: {
      programs: false,
    },
  },
  customShowEditor: {
    originalProgramList: [],
    programList: [],
    schedulePreviewList: [],
    dirty: {
      programs: false,
    },
  },
};

export const createChannelEditorState: StateCreator<
  ChannelEditorState
> = () => {
  return initialChannelEditorState;
};
