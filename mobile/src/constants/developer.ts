import type { ImageSourcePropType } from 'react-native';

export const CONTRIBUTE_URL = 'https://mathinraj.is-a.dev/contribute/';

export const DEVELOPER = {
  name: 'Mathinraj Ramasamy',
  firstName: 'Mathinraj',
  photo: require('@/assets/images/developer/mathinraj.jpg') as ImageSourcePropType,
  roles: ['Full Stack Developer', 'Browser extension builder', 'Java & Spring Boot', 'React & modern web'],
  bio: 'I turn coffee into code and bugs into features (on a good day). In my free time I build free, privacy-first tools like SpendTrak.',
  stats: [
    { value: '6', label: 'projects shipped' },
    { value: '1,000+', label: 'extension users' },
    { value: '7 days', label: 'to fix bugs' },
  ],
  note: "Almost every feature in my apps has come from people like you. If something doesn't work, or you wish it did something more, tell me. I fix every reported bug within 7 days.",
};

export interface Project {
  name: string;
  description: string;
  url: string;
  icon: ImageSourcePropType | null;
  emoji?: string;
  /** Tint behind an emoji icon. */
  tint?: string;
  current?: boolean;
}

export const PROJECTS: Project[] = [
  {
    name: 'SpendTrak',
    description: 'Privacy-first expense tracker that syncs with Google Drive',
    url: 'https://spendtrak.vercel.app',
    icon: require('@/assets/images/app-icon-small.png'),
    current: true,
  },
  {
    name: 'TouchLock',
    description: 'Lock your browser with Touch ID, Windows Hello or a PIN',
    url: 'https://touchlock.vercel.app',
    icon: require('@/assets/images/developer/touchlock.png'),
  },
  {
    name: 'Bing it',
    description: 'Smart auto-searcher with human-like typing',
    url: 'https://bingit.vercel.app',
    icon: require('@/assets/images/developer/bingit.png'),
  },
  {
    name: 'AutoPrompt for Copilot',
    description: 'Batch prompts for Copilot, with 5,700+ built in',
    url: 'https://auto-prompt-for-copilot.vercel.app',
    icon: require('@/assets/images/developer/autoprompt.png'),
  },
  {
    name: 'Undrive',
    description: 'Private files hidden inside your Google Drive',
    url: 'https://undrive-app.vercel.app',
    icon: null,
    emoji: '🗂️',
    tint: '#3B82F6',
  },
  {
    name: 'AIArena',
    description: 'Compare answers from multiple AI models side by side',
    url: 'https://github.com/mathinraj/tri-llm',
    icon: null,
    emoji: '🤖',
    tint: '#A855F7',
  },
];

export type SocialIcon = 'globe' | 'github' | 'linkedin' | 'medium' | 'mail';

export const SOCIAL_LINKS: { label: string; url: string; icon: SocialIcon }[] = [
  { label: 'Portfolio', url: 'https://mathinraj.is-a.dev/', icon: 'globe' },
  { label: 'GitHub', url: 'https://github.com/mathinraj', icon: 'github' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mathinraj', icon: 'linkedin' },
  { label: 'Medium', url: 'https://medium.com/@mathinraj', icon: 'medium' },
  { label: 'Email', url: 'mailto:mathinraj7@gmail.com', icon: 'mail' },
];
