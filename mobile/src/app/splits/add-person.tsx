import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormScreen } from '@/components/ui/form-screen';
import { TextField } from '@/components/ui/text-field';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';

export default function AddPersonScreen() {
  const db = useSQLiteContext();
  const settings = useSettings();
  const [name, setName] = useState('');

  const people = settings?.splitPeople ?? [];
  const trimmed = name.trim();
  const duplicate = people.some((p) => p.toLowerCase() === trimmed.toLowerCase());
  const problem = !trimmed ? 'Enter a name' : duplicate ? 'Already added' : null;

  async function save() {
    if (problem) return;
    await updateSettings(db, { splitPeople: [...people, trimmed] });
    router.back();
  }

  return (
    <FormScreen
      footer={<Button label={problem ?? 'Add person'} icon={problem ? undefined : 'check'} disabled={!!problem} onPress={save} />}>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Priya"
        autoFocus
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={save}
      />
    </FormScreen>
  );
}
