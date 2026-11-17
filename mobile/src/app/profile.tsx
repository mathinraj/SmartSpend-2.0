import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { showDialog } from '@/lib/dialog';
import { deleteProfilePhoto, pickProfilePhoto } from '@/lib/profile-photo';
import type { Settings } from '@/types/models';

export default function ProfileScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return <ProfileForm settings={settings} />;
}

function ProfileForm({ settings }: { settings: Settings }) {
  const db = useSQLiteContext();
  const [name, setName] = useState(settings.profileName ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    await updateSettings(db, { profileName: name.trim() || null });
    router.back();
  }

  async function choosePhoto() {
    setBusy(true);
    try {
      const uri = await pickProfilePhoto();
      if (uri) {
        const previous = settings.profilePhotoUri;
        await updateSettings(db, { profilePhotoUri: uri });
        deleteProfilePhoto(previous);
      }
    } catch (error) {
      showDialog('Could not use that photo', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function removePhoto() {
    showDialog('Remove profile photo?', 'The default picture will be shown instead.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const previous = settings.profilePhotoUri;
          await updateSettings(db, { profilePhotoUri: null });
          deleteProfilePhoto(previous);
        },
      },
    ]);
  }

  return (
    <FormScreen footer={<Button label="Save" icon="check" onPress={save} />}>
      <View style={styles.photo}>
        <ProfileAvatar size={112} photoUri={settings.profilePhotoUri} />
        <View style={styles.photoActions}>
          <Button
            label={busy ? 'Preparing…' : settings.profilePhotoUri ? 'Change photo' : 'Choose from gallery'}
            icon="photo"
            size="small"
            variant="secondary"
            disabled={busy}
            onPress={choosePhoto}
          />
          {settings.profilePhotoUri ? (
            <Button label="Remove" icon="delete" size="small" variant="destructive" disabled={busy} onPress={removePhoto} />
          ) : null}
        </View>
        <Text variant="caption" tone="secondary" style={styles.center}>
          Large photos are resized automatically. The photo stays on this phone and isn&apos;t included in backups.
        </Text>
      </View>
      <TextField
        label="Your name"
        hint="Shown in the greeting on the Home screen."
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={save}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
