import React from 'react';

const PATHS: Record<string, React.ReactNode> = {
  trilha: <path d="M5 20c0-4 3-5 7-5s7-1 7-5-3-5-7-5M5 5h.01M19 20h.01" />,
  biblioteca: (
    <>
      <path d="M4 4h4v16H4zM10 4h4v16h-4z" />
      <path d="M16.5 5.2l3.6-.9 3 15.5-3.7.9z" transform="translate(-2.5 0)" />
    </>
  ),
  agenda: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  evolucao: (
    <>
      <path d="M12 21v-7" />
      <path d="M12 14c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5zM12 12c0-3-2-5-6-5 0 3.5 2 5 6 5z" />
    </>
  ),
  simulados: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  flashcards: (
    <>
      <rect x="3.5" y="7" width="13" height="13" rx="2.5" />
      <path d="M8 4h10a2.5 2.5 0 0 1 2.5 2.5V16" />
    </>
  ),
  config: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" />,
  chevronL: <path d="M15 5l-7 7 7 7" />,
  chevronR: <path d="M9 5l7 7-7 7" />,
  chevronD: <path d="M5 9l7 7 7-7" />,
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  flame: <path d="M12 21c-4 0-7-2.8-7-6.6 0-3.2 2.2-5 3.6-7 .4 2 1.4 3 2.4 3.4C11 7 12.4 4.5 15 3c-.3 3 1.2 4.6 2.6 6.4 1 1.3 1.4 2.8 1.4 4.6 0 4-3 7-7 7z" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />,
  drop: <path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  upload: <path d="M12 16V5M7 9.5L12 5l5 4.5M5 19h14" />,
  download: <path d="M12 5v11M7 11.5L12 16l5-4.5M5 19h14" />,
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M16 10.5l5-3v9l-5-3z" />
    </>
  ),
  questoes: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4M12 16.8h.01" />
    </>
  ),
  revisao: <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1M17.5 3.5v3.6h-3.6M6.5 20.5v-3.6h3.6" />,
  leitura: <path d="M3.5 6c3-1 6-1 8.5 1 2.5-2 5.5-2 8.5-1v12c-3-1-6-1-8.5 1-2.5-2-5.5-2-8.5-1zM12 7v12" />,
  outro: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
  sound: <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
  note: <path d="M5 4.5h14v10l-5 5H5zM14 19.5v-5h5" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
  brain: <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1" />,
  room: <path d="M3 11l9-7 9 7v9H3zM9 20v-6h6v6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01" />
    </>
  ),
  book: <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19" />,
  cloudCheck: <path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18zM9.5 13.5l2 2 3.5-3.5" />,
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M3 9h18M12 9v11M12 9c-1.5-3-5-4-5-1.5S12 9 12 9zM12 9c1.5-3 5-4 5-1.5S12 9 12 9z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  restore: <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4" />,
  hospital: <path d="M12 7v6M9 10h6M4 20V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V20M3 20h18" />,
};

export const ACTIVITY_ICON: Record<string, string> = {
  videoaula: 'video',
  questoes: 'questoes',
  revisao: 'revisao',
  flashcards: 'flashcards',
  leitura: 'leitura',
  outro: 'outro',
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
