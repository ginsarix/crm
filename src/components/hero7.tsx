'use client';

import { Button } from '~/components/ui/button';

interface Hero7Props {
  heading?: string;
  description?: string;
  button?: {
    text: string;
    url: string;
  };
  loggedIn?: boolean;
}

const Hero7 = ({
  heading = 'Profesyonel, Gelişmiş ve Kolay CRM.',
  description = 'NesbirCRM ile müşterilerinizi pratik ve kolay bir şekilde takip edin ve yönetin.',
  button = {
    text: 'Başla',
    url: '/',
  },
  loggedIn = false,
}: Hero7Props) => {
  return (
    <section className="py-32">
      <div className="container text-center">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <h1 className="font-semibold text-3xl lg:text-6xl">{heading}</h1>
          <p className="text-balance text-foreground/70 lg:text-lg">
            {description}
          </p>
        </div>
        <Button asChild className="mt-10 rounded-xl text-lg" size="lg">
          <a
            href={
              loggedIn !== undefined
                ? loggedIn
                  ? '/panel/customer-cards'
                  : '/login'
                : button.url
            }
          >
            {button.text}
          </a>
        </Button>
      </div>
    </section>
  );
};

export { Hero7 };
