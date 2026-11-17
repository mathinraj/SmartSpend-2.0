import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { FormScreen } from '@/components/ui/form-screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SwitchRow } from '@/components/ui/switch-row';
import { Field, TextField } from '@/components/ui/text-field';
import { listAccounts } from '@/db/accounts';
import { getPersonBalance, recordSettlement } from '@/db/splits';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { accountEmoji } from '@/lib/accounts';
import { parseAmount, sanitizeAmountInput } from '@/lib/format';
import type { Account } from '@/types/models';

export default function SettleScreen() {
  const { person } = useLocalSearchParams<{ person: string }>();
  const balance = useDbQuery(getPersonBalance, ['split_entries'], person);
  const accounts = useDbQuery(listAccounts, ['accounts']);
  if (balance === undefined || !accounts) return null;
  return <SettleForm person={person} balance={balance} accounts={accounts} />;
}

function SettleForm({ person, balance, accounts }: { person: string; balance: number; accounts: Account[] }) {
  const db = useSQLiteContext();
  const settings = useSettings();
  const currency = settings?.currency ?? 'INR';
  const [direction, setDirection] = useState<'received' | 'paid'>(balance < 0 ? 'paid' : 'received');
  const [amount, setAmount] = useState(balance !== 0 ? String(Math.abs(balance)) : '');
  const [recordInAccount, setRecordInAccount] = useState(accounts.length > 0);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? null);
  const [note, setNote] = useState('');

  const value = parseAmount(amount);
  const problem = value <= 0 ? 'Enter an amount' : null;

  async function save() {
    if (problem) return;
    await recordSettlement(db, {
      person,
      amount: value,
      direction,
      note: note.trim() || null,
      accountId: recordInAccount ? accountId : null,
    });
    router.back();
  }

  return (
    <FormScreen
      footer={<Button label={problem ?? 'Record settlement'} icon={problem ? undefined : 'check'} disabled={!!problem} onPress={save} />}>
      <SegmentedControl
        options={[
          { value: 'received', label: `${person} paid me` },
          { value: 'paid', label: `I paid ${person}` },
        ]}
        value={direction}
        onChange={setDirection}
      />
      <TextField
        label="Amount"
        value={amount}
        onChangeText={(text) => setAmount(sanitizeAmountInput(text))}
        placeholder="0"
        keyboardType="decimal-pad"
      />
      {accounts.length > 0 ? (
        <Card flush>
          <SwitchRow
            title={direction === 'received' ? 'Add to an account' : 'Take from an account'}
            subtitle={direction === 'received' ? 'Logs the money as income.' : 'Logs the money as an expense.'}
            value={recordInAccount}
            onValueChange={setRecordInAccount}
          />
        </Card>
      ) : null}
      {recordInAccount ? (
        <Field label="Account">
          <ChipGroup>
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                emoji={accountEmoji(a, currency)}
                selected={a.id === accountId}
                onPress={() => setAccountId(a.id)}
              />
            ))}
          </ChipGroup>
        </Field>
      ) : null}
      <TextField label="Note" hint="Optional" value={note} onChangeText={setNote} placeholder="e.g. UPI transfer" maxLength={80} />
    </FormScreen>
  );
}
