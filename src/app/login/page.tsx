import { Login1 } from '~/components/login1';
import { env } from '~/env';
import { auth } from '~/server/better-auth';

export default function LoginPage() {
  auth.api
    .createUser({
      body: {
        name: 'Default Admin',
        email: env.DEFAULT_ADMIN_EMAIL,
        password: env.DEFAULT_ADMIN_PASSWORD,
        role: 'admin',
      },
    })
    .catch(() => {});

  return <Login1 />;
}
