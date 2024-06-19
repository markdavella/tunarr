import { EditChannelTabs } from '@/components/channel_config/EditChannelTabPanel.tsx';
import { useChannelSuspense } from '@/hooks/useChannels.ts';
import { Route } from '@/routes/channels_/$channelId/edit/index.tsx';
import Edit from '@mui/icons-material/Edit';
import { Box, Button, Stack } from '@mui/material';
import Typography from '@mui/material/Typography';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import Breadcrumbs from '../../components/Breadcrumbs.tsx';
import { EditChannelForm } from '../../components/channel_config/EditChannelForm.tsx';
import useStore from '../../store/index.ts';
import {
  ChannelEditContext,
  ChannelEditContextState,
} from './EditChannelContext.ts';

type Props = {
  initialTab?: EditChannelTabs;
};

export default function EditChannelPage({ initialTab }: Props) {
  const { channelId } = Route.useParams();
  const { data: channel } = useChannelSuspense(channelId);
  const { currentEntity: workingChannel } = useStore((s) => s.channelEditor);

  const [channelEditorState, setChannelEditorState] =
    useState<ChannelEditContextState>({
      currentTabValid: true,
      isNewChannel: false,
    });

  return (
    <>
      <Breadcrumbs />
      {workingChannel && (
        <div>
          <Stack direction="row">
            <Typography variant="h4" sx={{ mb: 2, flex: 1 }}>
              {channel.name}
            </Typography>
            <Box>
              <Button
                component={Link}
                to="../programming"
                variant="outlined"
                startIcon={<Edit />}
              >
                Programming
              </Button>
            </Box>
          </Stack>
          <ChannelEditContext.Provider
            value={{ channelEditorState, setChannelEditorState }}
          >
            <EditChannelForm
              channel={channel}
              isNew={false}
              initialTab={initialTab}
            />
          </ChannelEditContext.Provider>
        </div>
      )}
    </>
  );
}
