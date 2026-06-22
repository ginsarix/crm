'use client';

import { useRouter } from 'next/navigation';
import { Combobox } from '~/components/ui/combobox';

const ALL_KEY = '__all__';

interface Props {
  groups: { name: string }[];
  selected: string | null;
}

export function BusinessGroupFilter({ groups, selected }: Props) {
  const router = useRouter();

  const options = [
    { key: ALL_KEY, label: 'Tümü' },
    ...groups.map((g) => ({ key: g.name, label: g.name })),
  ];

  const handleChange = (key: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('bg', key);
    router.push(`?${params.toString()}`);
  };

  return (
    <Combobox
      className="w-64"
      onChange={handleChange}
      options={options}
      selectedKey={selected ?? ALL_KEY}
    />
  );
}
