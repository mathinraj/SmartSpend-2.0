import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useEffectEvent, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { BetaBadge } from '@/components/sms/beta-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SwitchRow } from '@/components/ui/switch-row';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { clearSmsData, countPendingSms, deleteAccountHint, deleteMerchantMemory, listAccountHints, listMerchantMemory } from '@/db/sms';
import { useDbQuery } from '@/hooks/use-db-query';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { showDialog } from '@/lib/dialog';
import { ensureNotificationPermission } from '@/lib/notifications';
import { autoAddReady } from '@/lib/sms/ingest';
import { SmsReader } from '@/lib/sms/native';
import { disableSmsImport, enableSmsImport, hasSmsPermission, requestSmsPermission, scanSmsInbox, smsImportAvailable } from '@/lib/sms/scan';

type HistoryDays = '7' | '30' | '90';

const HISTORY_OPTIONS: { value: HistoryDays; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const PROMISES: [IconName, string][] = [
  ['sms', 'Reads only messages from banks and other business senders. Messages from people are never read.'],
  ['verified', 'Everything is read on this phone. No message is uploaded or shared, and SpendTrak has no server.'],
  ['check', "Nothing is added without you: each transaction waits for your OK (unless you turn on automatic adding)."],
  ['delete', 'Message text is deleted once you act on it. Turn this off and clear the data any time.'],
];

export default function SmsSettingsScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const settings = useSettings();
  const pending = useDbQuery(countPendingSms, ['sms_messages']);
  const hints = useDbQuery(listAccountHints, ['sms_account_hints', 'accounts']);
  const merchants = useDbQuery(listMerchantMemory, ['merchant_categories', 'categories']);
  const [days, setDays] = useState<HistoryDays>('30');
  const [guide, setGuide] = useState(false);
  const [permission, setPermission] = useState(hasSmsPermission);
  const [busy, setBusy] = useState(false);

  async function finishEnable() {
    setGuide(false);
    setPermission(true);
    await enableSmsImport(db, Number(days));
    if (settings?.smsNotify) await ensureNotificationPermission();
    await scanSmsInbox(db);
    router.replace('/sms');
  }

  // Back from App info: carry on by itself if the user allowed SMS access there.
  const onReturn = useEffectEvent(() => {
    const granted = hasSmsPermission();
    setPermission(granted);
    if (granted && guide) void finishEnable();
  });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onReturn();
    });
    return () => subscription.remove();
  }, []);

  if (!settings) return null;

  if (!smsImportAvailable) {
    return (
      <Screen variant="stack">
        <EmptyState emoji="✉️" title="Not available here" message="SMS import needs the SpendTrak Android app (iPhones don't let apps read messages)." />
      </Screen>
    );
  }

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    try {
      if (hasSmsPermission() || (await requestSmsPermission()) === 'granted') await finishEnable();
      else setGuide(true);
    } finally {
      setBusy(false);
    }
  }

  function confirmTurnOff() {
    showDialog('Turn off SMS import?', 'SpendTrak stops reading bank messages. Items waiting for review stay until you clear the data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Turn off', style: 'destructive', onPress: () => void disableSmsImport(db) },
    ]);
  }

  function confirmClear() {
    showDialog(
      'Clear SMS import data?',
      'Deletes the waiting items, the list of messages SpendTrak looked at, and the accounts and categories it learned. Transactions you added stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => void clearSmsData(db) },
      ]
    );
  }

  async function setNotify(value: boolean) {
    await updateSettings(db, { smsNotify: value });
    if (value) await ensureNotificationPermission();
  }

  const restrictedGuide = (
    <Card style={styles.guide}>
      <View style={styles.row}>
        <Icon name="lock" color={colors.warning} />
        <Text variant="bodyStrong" style={styles.flex}>
          Allow SMS access in App info
        </Text>
      </View>
      <Text variant="caption" tone="secondary">
        Android didn&apos;t let SpendTrak ask. On Android 15 and later, apps installed outside the Play Store need one extra step first.
      </Text>
      {[
        'Tap Open App info below.',
        'Tap ⋮ (top right), then Allow restricted settings, and confirm.',
        'Tap Permissions → SMS → Allow.',
        'Come back here. SpendTrak carries on by itself.',
      ].map((step, i) => (
        <View key={step} style={styles.row}>
          <View style={[styles.step, { backgroundColor: `${colors.primary}1F` }]}>
            <Text variant="caption" tone="primary">
              {i + 1}
            </Text>
          </View>
          <Text variant="body" style={styles.flex}>
            {step}
          </Text>
        </View>
      ))}
      <Text variant="caption" tone="secondary">
        If you tapped Deny earlier, step 3 is enough. The menus differ slightly between phone makers.
      </Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button label="Open App info" icon="openInNew" onPress={() => SmsReader?.openSettings('app')} />
        </View>
        <Button label="Try again" variant="secondary" onPress={turnOn} />
      </View>
    </Card>
  );

  if (!settings.smsImportEnabled) {
    return (
      <Screen variant="stack">
        <View style={styles.row}>
          <Text variant="title" style={styles.flex}>
            Add transactions from bank SMS
          </Text>
          <BetaBadge />
        </View>
        <Text variant="body" tone="secondary">
          When your bank texts you about a payment, SpendTrak reads the amount, account and merchant and offers it as a transaction.
        </Text>
        <Card style={styles.promises}>
          {PROMISES.map(([icon, text]) => (
            <View key={text} style={styles.row}>
              <Icon name={icon} size={20} color={colors.primary} />
              <Text variant="body" style={styles.flex}>
                {text}
              </Text>
            </View>
          ))}
        </Card>
        <SectionHeader title="Start with messages from the last" />
        <SegmentedControl options={HISTORY_OPTIONS} value={days} onChange={setDays} />
        {guide ? restrictedGuide : <Button label={busy ? 'Setting up…' : 'Turn on SMS import'} icon="sms" disabled={busy} onPress={turnOn} />}
        <Text variant="caption" tone="secondary">
          Android&apos;s prompt says &quot;send and view SMS messages&quot;, its name for all SMS access. SpendTrak never sends a message. It&apos;s a
          beta: some banks&apos; messages may be read wrongly, and you can report those from the review list.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen variant="stack">
      {!permission ? (
        <>
          <Card style={[styles.warning, { borderColor: colors.warning }]}>
            <Text variant="bodyStrong">SMS access is off</Text>
            <Text variant="caption" tone="secondary">
              SpendTrak can&apos;t read new bank messages until you allow SMS access again.
            </Text>
          </Card>
          {restrictedGuide}
        </>
      ) : null}

      <Card flush>
        <SwitchRow title="SMS import" subtitle="Read bank messages and offer them as transactions" value onValueChange={confirmTurnOff} leading={<Icon name="sms" color={colors.primary} />} />
        <SwitchRow divider title="Notify me when a bank SMS arrives" value={settings.smsNotify} onValueChange={setNotify} leading={<Icon name="bell" color={colors.primary} />} />
        <SwitchRow
          divider
          title="Add confident ones automatically"
          subtitle="When the account and category are known. They stay in the list for a day, with Undo."
          value={settings.smsAutoAdd}
          onValueChange={async (value) => {
            await updateSettings(db, { smsAutoAdd: value });
            if (value) await autoAddReady(db);
          }}
          leading={<Icon name="sparkles" color={colors.primary} />}
        />
      </Card>

      <Card flush>
        <ListRow
          leading={<Icon name="receipt" color={colors.primary} />}
          title="Review bank transactions"
          subtitle={pending ? `${pending} waiting` : 'Nothing waiting'}
          onPress={() => router.push('/sms')}
        />
        <ListRow
          divider
          leading={<Icon name="history" color={colors.primary} />}
          title="Messages SpendTrak looked at"
          subtitle="What was added, ignored, and why"
          onPress={() => router.push('/sms/messages')}
        />
        <ListRow
          divider
          leading={<Icon name="battery" color={colors.primary} />}
          title="Make alerts reliable on this phone"
          subtitle="Battery and autostart settings some phones need"
          onPress={() => router.push('/sms/reliable')}
        />
      </Card>

      {hints && hints.length > 0 ? (
        <>
          <SectionHeader title="Accounts SpendTrak learned" />
          <Card flush>
            {hints.map((h, i) => (
              <ListRow
                key={`${h.institution}-${h.digits}`}
                divider={i > 0}
                title={`${h.institution} ••${h.digits}`}
                subtitle={`→ ${h.accountName ?? 'Deleted account'}`}
                showChevron={false}
                onPress={() =>
                  showDialog('Forget this account?', `Messages about ${h.institution} ••${h.digits} will ask for the account again.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Forget', style: 'destructive', onPress: () => void deleteAccountHint(db, h.institution, h.digits) },
                  ])
                }
              />
            ))}
          </Card>
        </>
      ) : null}

      {merchants && merchants.length > 0 ? (
        <>
          <SectionHeader title="Merchant categories" />
          <Card flush>
            {merchants.map((m, i) => (
              <ListRow
                key={m.key}
                divider={i > 0}
                title={m.key}
                subtitle={m.categoryName ? `${m.categoryIcon ?? ''} ${m.categoryName}` : 'Deleted category'}
                showChevron={false}
                onPress={() =>
                  showDialog('Forget this merchant?', `SpendTrak will suggest a category for "${m.key}" again.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Forget', style: 'destructive', onPress: () => void deleteMerchantMemory(db, m.key) },
                  ])
                }
              />
            ))}
          </Card>
        </>
      ) : null}

      {settings.smsIgnoredSenders.length > 0 ? (
        <>
          <SectionHeader title="Ignored senders" />
          <Card flush>
            {settings.smsIgnoredSenders.map((code, i) => (
              <ListRow
                key={code}
                divider={i > 0}
                title={code}
                subtitle="Tap to read its messages again"
                showChevron={false}
                onPress={() => updateSettings(db, { smsIgnoredSenders: settings.smsIgnoredSenders.filter((c) => c !== code) })}
              />
            ))}
          </Card>
        </>
      ) : null}

      <Card flush>
        <ListRow leading={<Icon name="delete" color={colors.danger} />} title="Clear SMS import data" subtitle="Waiting items, the message list, and what was learned" onPress={confirmClear} />
      </Card>

      <View style={styles.row}>
        <Text variant="caption" tone="secondary" style={styles.flex}>
          Messages are read on this phone only. Nothing is uploaded.
        </Text>
        <BetaBadge />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
  promises: {
    gap: Spacing.md,
  },
  guide: {
    gap: Spacing.md,
  },
  step: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: {
    gap: Spacing.xs,
    borderWidth: 1,
  },
});
