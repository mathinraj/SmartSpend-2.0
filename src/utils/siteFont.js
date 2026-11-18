import { Geist } from 'next/font/google';

/** The marketing site's one typeface (the app itself keeps its own). */
export const siteFont = Geist({ subsets: ['latin'], display: 'swap', variable: '--st-font' });
