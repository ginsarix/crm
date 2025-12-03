import { redirect } from "next/navigation";
import { Login1 } from "~/components/login1";
import { auth } from "~/server/better-auth";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await auth.api.signInEmail({
        body: {
          email,
          password,
        },
      });
    } catch (error) {
      console.error(error);
      return;
    }
    redirect("/panel/dashboard");
  }

  return <Login1 action={login} />;
}
