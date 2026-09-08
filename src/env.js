import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === 'production'
        ? z.string()
        : z.string().optional(),

    DEFAULT_ADMIN_EMAIL: z.string().email(),
    DEFAULT_ADMIN_PASSWORD: z.string().min(8),
    CROSS_ORIGIN_URL: z.string().url().optional(),
    APP_URL: z.string().url().optional(),

    // SMTP configuration for sending emails
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    // Email address to send verification emails from (e.g., "noreply@yourdomain.com")
    EMAIL_FROM: z.string().email().optional(),

    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_APP_TITLE: z.string().default('CRM'),

    // Customer card color hints (e.g. "(Biz)", "(M.A.Ö)") — deployment-specific labels
    NEXT_PUBLIC_COLOR_HINT_GREEN: z.string().optional(),
    NEXT_PUBLIC_COLOR_HINT_BLUE: z.string().optional(),
    NEXT_PUBLIC_COLOR_HINT_ORANGE: z.string().optional(),
    NEXT_PUBLIC_COLOR_HINT_YELLOW: z.string().optional(),
    NEXT_PUBLIC_COLOR_HINT_PURPLE: z.string().optional(),
    NEXT_PUBLIC_COLOR_HINT_GRAY: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
    DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
    CROSS_ORIGIN_URL: process.env.CROSS_ORIGIN_URL,
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_APP_TITLE: process.env.NEXT_PUBLIC_APP_TITLE,
    NEXT_PUBLIC_COLOR_HINT_GREEN: process.env.NEXT_PUBLIC_COLOR_HINT_GREEN,
    NEXT_PUBLIC_COLOR_HINT_BLUE: process.env.NEXT_PUBLIC_COLOR_HINT_BLUE,
    NEXT_PUBLIC_COLOR_HINT_ORANGE: process.env.NEXT_PUBLIC_COLOR_HINT_ORANGE,
    NEXT_PUBLIC_COLOR_HINT_YELLOW: process.env.NEXT_PUBLIC_COLOR_HINT_YELLOW,
    NEXT_PUBLIC_COLOR_HINT_PURPLE: process.env.NEXT_PUBLIC_COLOR_HINT_PURPLE,
    NEXT_PUBLIC_COLOR_HINT_GRAY: process.env.NEXT_PUBLIC_COLOR_HINT_GRAY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
