import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CurrencyList } from '@/components/currency-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormScreen } from '@/components/ui/form-screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { updateSettings } from '@/db/settings';
import { useTheme } from '@/hooks/use-theme';

type Step = 'welcome' | 'name' | 'currency';

const PREVIOUS: Record<Step, Step | null> = { welcome: null, name: 'welcome', currency: 'name' };

const FEATURES = [
  { emoji: '💸', title: 'Track every expense', text: 'Expenses, income, and transfers across all your accounts.' },
  { emoji: '📊', title: 'See where it goes', text: 'Category breakdowns and monthly summaries.' },
  { emoji: '🔒', title: 'Private by design', text: 'No sign-up. Everything stays on this phone.' },
];

export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    const previous = PREVIOUS[step];
    if (!previous) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep(previous);
      return true;
    });
    return () => subscription.remove();
  }, [step]);

  // Finishing flips the `onboarded` guard in the root layout, which swaps this screen for the tabs.
  function finish() {
    updateSettings(db, { profileName: name.trim() || null, currency, onboarded: true });
  }

  if (step === 'welcome') {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.welcome,
          { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xl },
        ]}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoEmoji}>🪙</Text>
          </View>
          <Text variant="display">SpendTrak</Text>
          <Text tone="secondary" style={styles.center}>
            The simple way to track spending and take control of your money.
          </Text>
        </View>
        <Card style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.flex}>
                <Text variant="bodyStrong">{f.title}</Text>
                <Text variant="caption" tone="secondary">
                  {f.text}
                </Text>
              </View>
            </View>
          ))}
        </Card>
        <Button label="Get started" onPress={() => setStep('name')} />
      </ScrollView>
    );
  }

  if (step === 'name') {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <FormScreen footer={<Button label={name.trim() ? 'Continue' : 'Skip'} onPress={() => setStep('currency')} />}>
          <StepHeader step={1} title="What should we call you?" subtitle="Used for your greeting on the Home screen." />
          <TextField
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            autoFocus
            maxLength={40}
            returnKeyType="next"
            onSubmitEditing={() => setStep('currency')}
          />
        </FormScreen>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.currencyHeader}>
        <StepHeader step={2} title="Choose your currency" subtitle="You can change this later in Settings." />
      </View>
      <CurrencyList style={styles.flex} selected={currency} onSelect={setCurrency} />
      <View
        style={[
          styles.currencyFooter,
          { borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.lg },
        ]}>
        <Button label="Finish" icon="check" onPress={finish} />
      </View>
    </View>
  );
}

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <View style={styles.stepHeader}>
      <Text variant="label" tone="primary">
        Step {step} of 2
      </Text>
      <Text variant="title">{title}</Text>
      <Text tone="secondary">{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  welcome: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(108, 92, 231, 0.35)',
  },
  logoEmoji: {
    fontSize: 48,
    lineHeight: 58,
  },
  features: {
    gap: Spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  stepHeader: {
    gap: Spacing.xs,
  },
  currencyHeader: {
    padding: Spacing.lg,
  },
  currencyFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
