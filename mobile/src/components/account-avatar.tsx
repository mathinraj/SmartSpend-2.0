import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/list-row';
import { accountColor, accountEmoji } from '@/lib/accounts';
import type { Account } from '@/types/models';

/** The account's bank logo when it has one that loads, otherwise its emoji avatar. */
export function AccountAvatar({ account, currency }: { account: Account; currency: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (account.logoUrl && account.logoUrl !== failedUrl) {
    return (
      <View style={styles.logoBox}>
        <Image
          source={{ uri: account.logoUrl }}
          onError={() => setFailedUrl(account.logoUrl)}
          style={styles.logo}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }
  return <Avatar emoji={accountEmoji(account, currency)} color={accountColor(account)} />;
}

const styles = StyleSheet.create({
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 40,
    height: 40,
  },
});
