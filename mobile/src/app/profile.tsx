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
import type { Settings } from '@/types/models';

export default function ProfileScreen() {
  const settings = useSettings();
  if (!settings) return null;
  return <ProfileForm settings={settings} />;
}

function ProfileForm({ settings }: { settings: Settings }) {
  const db = useSQLiteContext();
  const [name, setName] = useState(settings.profileName ?? '');

  async function save() {
    await updateSettings(db, { profileName: name.trim() || null });
    router.back();
  }

  return (
    <FormScreen footer={<Button label="Save" icon="check" onPress={save} />}>
      <View style={styles.photo}>
        <ProfileAvatar size={96} />
        <Text variant="caption" tone="secondary" style={styles.center}>
          Your Google profile photo will appear here once Google sign-in is added.
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
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  center: {
    textAlign: 'center',
  },
});
