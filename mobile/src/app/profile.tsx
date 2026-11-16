import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
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
      <TextField
        label="Your name"
        hint="Shown in the greeting on the Home screen."
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
        autoFocus
        maxLength={40}
        returnKeyType="done"
        onSubmitEditing={save}
      />
    </FormScreen>
  );
}
