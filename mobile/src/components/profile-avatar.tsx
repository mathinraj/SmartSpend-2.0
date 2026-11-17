import { useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export interface ProfileAvatarProps {
  size?: number;
  /** Remote photo, e.g. the Google account picture once sign-in exists. Falls back to the default. */
  photoUri?: string | null;
}

/** The user's profile picture; a built-in default illustration until a photo is available. */
export function ProfileAvatar({ size = 44, photoUri }: ProfileAvatarProps) {
  const colors = useTheme();
  const [failed, setFailed] = useState(false);

  if (photoUri && !failed) {
    return (
      <Image
        source={{ uri: photoUri }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      accessible
      accessibilityLabel="Profile picture"
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={32} fill={colors.primaryLight} />
        <Circle cx={32} cy={25} r={11} fill={colors.onPrimary} />
        <Path d="M10 58c2-11.5 11-18 22-18s20 6.5 22 18a32 32 0 0 1-44 0z" fill={colors.onPrimary} />
      </Svg>
    </View>
  );
}
