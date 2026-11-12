import { profile } from '@/data/profile';

const fromEnv = import.meta.env.VITE_SITE_URL;

/** Absolute origin of the deployed site, without a trailing slash. */
export const siteUrl = (fromEnv !== undefined && fromEnv !== '' ? fromEnv : profile.siteUrl).replace(
  /\/+$/,
  '',
);
