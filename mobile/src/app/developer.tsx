import { router } from 'expo-router';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { SocialIcon } from '@/components/social-icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { CONTRIBUTE_URL, DEVELOPER, PROJECTS, SOCIAL_LINKS, type Project } from '@/constants/developer';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { showDialog } from '@/lib/dialog';
import { APP_VERSION } from '@/lib/updates';

function open(url: string) {
  Linking.openURL(url).catch(() => showDialog("Couldn't open the link", url));
}

/** A full-bleed gradient behind a card's content. */
function GradientFill({ from, to, id }: { from: string; to: string; id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100" height="100" fill={`url(#${id})`} />
      <Circle cx="96" cy="4" r="30" fill="#FFFFFF" opacity={0.09} />
      <Circle cx="2" cy="100" r="24" fill="#FFFFFF" opacity={0.07} />
    </Svg>
  );
}

function ProjectRow({ project, divider }: { project: Project; divider: boolean }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${project.name}: ${project.description}`}
      onPress={() => open(project.url)}
      android_ripple={{ color: colors.border }}
      style={[styles.project, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      {project.icon ? (
        <Image source={project.icon} style={styles.projectIcon} />
      ) : (
        <View style={[styles.projectIcon, styles.projectEmoji, { backgroundColor: `${project.tint}26` }]}>
          <Text style={styles.emoji}>{project.emoji}</Text>
        </View>
      )}
      <View style={styles.flex}>
        <View style={styles.projectTitle}>
          <Text variant="bodyStrong">{project.name}</Text>
          {project.current ? (
            <View style={[styles.hereTag, { backgroundColor: `${colors.primary}1F` }]}>
              <Text variant="caption" tone="primary" style={styles.bold}>
                You&apos;re here
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" tone="secondary">
          {project.description}
        </Text>
      </View>
      <Icon name="openInNew" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function DeveloperScreen() {
  const colors = useTheme();

  return (
    <Screen variant="stack">
      <View style={styles.hero}>
        <GradientFill id="hero" from="#6C5CE7" to="#A855F7" />
        <View style={styles.avatarWrap}>
          <Image source={DEVELOPER.photo} style={styles.avatar} accessibilityLabel={DEVELOPER.name} />
          <View style={styles.wave}>
            <Text style={styles.waveEmoji}>👋</Text>
          </View>
        </View>
        <Text style={styles.hello}>Hi, I&apos;m</Text>
        <Text variant="title" tone="onPrimary" style={styles.center}>
          {DEVELOPER.name}
        </Text>
        <View style={styles.roles}>
          {DEVELOPER.roles.map((role) => (
            <View key={role} style={styles.role}>
              <Text variant="caption" tone="onPrimary" style={styles.bold}>
                {role}
              </Text>
            </View>
          ))}
        </View>
        <Text tone="onPrimary" style={[styles.center, styles.bio]}>
          {DEVELOPER.bio}
        </Text>
      </View>

      <View style={styles.stats}>
        {DEVELOPER.stats.map((stat) => (
          <Card key={stat.label} style={styles.stat}>
            <Text variant="heading" tone="primary" numberOfLines={1} adjustsFontSizeToFit>
              {stat.value}
            </Text>
            <Text variant="caption" tone="secondary" style={styles.center}>
              {stat.label}
            </Text>
          </Card>
        ))}
      </View>

      <Card style={styles.note}>
        <Text style={[styles.quote, { color: colors.primaryLight }]}>“</Text>
        <Text>{DEVELOPER.note}</Text>
        <View style={styles.noteFooter}>
          <Text tone="secondary" style={styles.flex}>
            — {DEVELOPER.firstName}
          </Text>
          <Button label="Send feedback" icon="feedback" size="small" variant="secondary" onPress={() => router.push('/feedback')} />
        </View>
      </Card>

      <SectionHeader title="Things I've built" />
      <Card flush>
        {PROJECTS.map((project, i) => (
          <ProjectRow key={project.name} project={project} divider={i > 0} />
        ))}
      </Card>

      <SectionHeader title="Say hello" />
      <View style={styles.links}>
        {SOCIAL_LINKS.map((link) => (
          <Pressable
            key={link.label}
            accessibilityRole="link"
            accessibilityLabel={link.label}
            onPress={() => open(link.url)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <View style={[styles.linkIcon, { backgroundColor: colors.card, boxShadow: colors.shadow }]}>
              <SocialIcon name={link.icon} color={colors.primary} />
            </View>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {link.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Contribute to SpendTrak"
        onPress={() => open(CONTRIBUTE_URL)}
        style={({ pressed }) => [styles.support, pressed && styles.pressed]}>
        <GradientFill id="support" from="#F59E0B" to="#F97316" />
        <View style={styles.supportIcon}>
          <Text style={styles.supportEmoji}>☕</Text>
        </View>
        <View style={styles.flex}>
          <Text variant="heading" tone="onPrimary">
            Fuel the next build
          </Text>
          <Text tone="onPrimary" style={styles.supportText}>
            SpendTrak is free and ad-free. If it helps you, a small contribution keeps the coffee and the commits flowing.
          </Text>
          <View style={styles.cta}>
            <Text variant="bodyStrong" style={styles.ctaText}>
              Contribute
            </Text>
            <Icon name="arrowForward" size={16} color="#C2410C" />
          </View>
        </View>
      </Pressable>

      <Text variant="caption" tone="muted" style={styles.center}>
        Made with 💚 by {DEVELOPER.firstName} · SpendTrak v{APP_VERSION}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  bold: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  hero: {
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  avatarWrap: {
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  wave: {
    position: 'absolute',
    right: -4,
    bottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  waveEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  hello: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
  },
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  role: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  bio: {
    marginTop: Spacing.sm,
    opacity: 0.95,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm,
  },
  note: {
    gap: Spacing.sm,
  },
  quote: {
    fontSize: 48,
    lineHeight: 48,
    height: 32,
    fontWeight: '700',
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  project: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  projectEmoji: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  projectTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hereTag: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  link: {
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  linkIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  support: {
    flexDirection: 'row',
    gap: Spacing.md,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: Spacing.lg,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  supportText: {
    marginTop: Spacing.xs,
    opacity: 0.95,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  ctaText: {
    color: '#C2410C',
  },
});
