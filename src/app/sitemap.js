export default function sitemap() {
  const baseUrl = 'https://spendtrak.vercel.app';

  const routes = [
    { path: '/', priority: 1.0, changeFrequency: 'daily' },
    { path: '/add', priority: 0.9, changeFrequency: 'daily' },
    { path: '/transactions', priority: 0.8, changeFrequency: 'daily' },
    { path: '/accounts', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/analytics', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/splits', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/planned', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/preferences', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/feedback', priority: 0.3, changeFrequency: 'monthly' },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
