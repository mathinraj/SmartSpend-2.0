import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SwitchRow } from '@/components/ui/switch-row';
import { Field, Input } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { useSettings } from '@/hooks/use-settings';
import { MASKED_AMOUNT } from '@/lib/balance-privacy';

export default function CustomizeScreen() {
  const db = useSQLiteContext();
  const settings = useSettings();
  const [newApp, setNewApp] = useState('');
  if (!settings) return null;

  function addApp() {
    const name = newApp.trim();
    if (!name || !settings) return;
    if (!settings.paymentApps.some((a) => a.toLowerCase() === name.toLowerCase())) {
      updateSettings(db, { paymentApps: [...settings.paymentApps, name] });
    }
    setNewApp('');
  }

  return (
    <Screen variant="stack">
      <View style={styles.section}>
        <SectionHeader title="Theme" />
        <SegmentedControl
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={settings.theme}
          onChange={(theme) => updateSettings(db, { theme })}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Home screen" />
        <Field label="Top card shows">
          <SegmentedControl
            options={[
              { value: 'balance', label: 'Total balance' },
              { value: 'expenses', label: 'Month’s spending' },
            ]}
            value={settings.homeView}
            onChange={(homeView) => updateSettings(db, { homeView })}
          />
        </Field>
        <Card flush>
          <SwitchRow
            title="Income and spending stats"
            subtitle={
              settings.homeView === 'balance'
                ? 'This month’s income and expenses under the balance'
                : 'This month’s income and your total balance under the spending'
            }
            value={settings.showBalanceStats}
            onValueChange={(showBalanceStats) => updateSettings(db, { showBalanceStats })}
          />
          <SwitchRow
            divider
            title="Accounts"
            subtitle="A row of your accounts and their balances"
            value={settings.showAccountsOnHome}
            onValueChange={(showAccountsOnHome) => updateSettings(db, { showAccountsOnHome })}
          />
          <SwitchRow
            divider
            title="Split money card"
            subtitle="Who owes whom, next to Planned"
            value={settings.showSplitOnHome}
            onValueChange={(showSplitOnHome) => updateSettings(db, { showSplitOnHome })}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Balances" />
        <Card flush>
          <SwitchRow
            title="Hide balances"
            subtitle={`Show ${MASKED_AMOUNT} on Home and Accounts. Tap the eye to see them for a minute.`}
            value={settings.hideBalances}
            onValueChange={(hideBalances) => updateSettings(db, { hideBalances })}
          />
          <SwitchRow
            divider
            title="Leave credit cards out of the total"
            subtitle="Card dues don’t reduce the total balance on Home"
            value={settings.excludeCCFromBalance}
            onValueChange={(excludeCCFromBalance) => updateSettings(db, { excludeCCFromBalance })}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="New transactions" />
        <Field label="Start as" hint="The type selected when you tap + to add a transaction.">
          <SegmentedControl
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
              { value: 'transfer', label: 'Transfer' },
            ]}
            value={settings.defaultTxnType}
            onChange={(defaultTxnType) => updateSettings(db, { defaultTxnType })}
          />
        </Field>
        <Card flush>
          <SwitchRow
            title="Ask how I paid"
            subtitle="Show payment app choices (GPay, Card Swipe, ...) when adding a transaction"
            value={settings.trackPaymentApp}
            onValueChange={(trackPaymentApp) => updateSettings(db, { trackPaymentApp })}
          />
        </Card>
        {settings.trackPaymentApp ? (
          <Field label="Payment apps" hint="Tap an app to remove it from the list. Past transactions keep it.">
            <ChipGroup>
              {settings.paymentApps.map((app) => (
                <Chip
                  key={app}
                  label={app}
                  removable
                  onPress={() => updateSettings(db, { paymentApps: settings.paymentApps.filter((a) => a !== app) })}
                />
              ))}
            </ChipGroup>
            <View style={styles.row}>
              <Input
                style={styles.flex}
                value={newApp}
                onChangeText={setNewApp}
                placeholder="Add an app"
                maxLength={20}
                accessibilityLabel="New payment app"
              />
              <Button label="Add" icon="add" disabled={!newApp.trim()} onPress={addApp} />
            </View>
          </Field>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
