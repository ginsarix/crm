import { Hero7 } from "~/components/hero7";
import BeamsBackground from "~/components/kokonutui/beams-background";
import { getSession } from "~/server/better-auth/server";

export default async function Home() {
  const session = await getSession();

  return (
    <BeamsBackground className="bg-background">
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <Hero7 loggedIn={!!session} />
        </div>
      </main>
    </BeamsBackground>
  );
}
