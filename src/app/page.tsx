import { redirect } from 'next/navigation';
import BeamsBackground from '~/components/kokonutui/beams-background';

export default async function Home() {
  redirect('/panel/dashboard');

  return (
    <BeamsBackground className="bg-background">
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          Panele Yönlendiriliyorsunuz...
        </div>
      </main>
    </BeamsBackground>
  );
}
