const paths = {
  cross: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  pill: <><path d="m10 14 4-4M8.5 3.5a7.1 7.1 0 0 1 10 10l-5 5a7.1 7.1 0 0 1-10-10Z" /><path d="m8 8 8 8" /></>,
  pulse: <path d="M2 12h5l3-8 4 16 3-8h5" />,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  play: <path d="m8 5 11 7-11 7Z" />,
}

export function MedicalIcon({ name = 'cross', className = '' }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>
}
