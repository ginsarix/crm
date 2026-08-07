export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { env } = await import('~/env');
  const { auth } = await import('~/server/better-auth');

  try {
    await auth.api.createUser({
      body: {
        name: 'Default Admin',
        email: env.DEFAULT_ADMIN_EMAIL,
        password: env.DEFAULT_ADMIN_PASSWORD,
        role: 'admin',
        data: { emailVerified: true },
      },
    });
  } catch (err) {
    const code = (err as { body?: { code?: string } })?.body?.code;
    if (code !== 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
      console.error('Default admin seed failed:', err);
    }
  }
}
