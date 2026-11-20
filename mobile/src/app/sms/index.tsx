import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BetaBadge } from '@/components/sms/beta-badge';
import { SmsReviewCard } from '@/components/sms/sms-review-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { listAccounts } from '@/db/accounts';
import { listCategories } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { showDialog } from '@/lib/dialog';
import { addAllReady, loadSmsReview } from '@/lib/sms/review';
import { scanSmsInbox } from '@/lib/sms/scan';

/** Bank messages waiting to become transactions. Opened from Home, Settings, and the "new bank transaction" notification. */
export default function SmsReviewScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const items = useDbQuery(loadSmsReview, ['sms_messages', 'accounts', 'categories', 'subcategories', 'sms_account_hints', 'merchant_categories', 'transactions']);
  const accounts = useDbQuery(listAccounts, ['accounts']);
  const expenseCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'expense');
  const incomeCategories = useDbQuery(listCategories, ['categories', 'subcategories'], 'income');
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);

  if (!settings || !items || !accounts || !expenseCategories || !incomeCategories) return null;

  if (!settings.smsImportEnabled) {
    return (
      <Screen variant="stack">
        <EmptyState
          emoji="✉️"
          title="SMS import is off"
          message="Turn it on to add transactions from your bank messages."
          actions={<Button label="Set up SMS import" onPress={() => router.replace('/sms/settings')} />}
        />
      </Screen>
    );
  }

  const ready = items.filter((i) => i.message.status === 'pending' && i.suggestion.ready);
  const waiting = items.filter((i) => i.message.status === 'pending').length;

  async function addAll() {
    setAdding(true);
    try {
      await addAllReady(db, items!);
    } catch (error) {
      showDialog('Some items could not be added', error instanceof Error ? error.message : String(error));
    } finally {
      setAdding(false);
    }
  }

  async function checkNow() {
    setScanning(true);
    try {
      await scanSmsInbox(db);
    } finally {
      setScanning(false);
    }
  }

  return (
    <Screen variant="stack">
      <View style={styles.heading}>
        <Text variant="caption" tone="secondary" style={styles.flex}>
          {waiting === 0 ? 'Nothing waiting' : `${waiting} waiting for you`}
        </Text>
        <BetaBadge />
      </View>

      {ready.length > 1 ? (
        <Button label={adding ? 'Adding…' : `Add all ready (${ready.length})`} icon="check" disabled={adding} onPress={addAll} />
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          emoji="✅"
          title="All caught up"
          message="New bank messages show up here. You'll get a notification when one arrives."
          actions={<Button label={scanning ? 'Checking…' : 'Check messages now'} variant="secondary" disabled={scanning} onPress={checkNow} />}
        />
      ) : (
        items.map((item) => (
          <SmsReviewCard
            key={item.message.id}
            item={item}
            accounts={accounts}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            settings={settings}
          />
        ))
      )}

      <Card flush>
        <ListRow
          leading={<Icon name="history" color={colors.primary} />}
          title="Messages SpendTrak looked at"
          subtitle="What was added, ignored, and why"
          onPress={() => router.push('/sms/messages')}
        />
        <ListRow
          divider
          leading={<Icon name="settings" color={colors.primary} />}
          title="SMS import settings"
          onPress={() => router.push('/sms/settings')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
