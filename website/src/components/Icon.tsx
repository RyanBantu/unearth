const paths = {
  food: (
    <>
      <path d="M4 3v6a3 3 0 0 0 6 0V3" />
      <path d="M7 3v18" />
      <path d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 7 0 2 1.2 3 3.5 3" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V9Z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 3c-.8 1 .8 2 0 3M12 3c-.8 1 .8 2 0 3" />
    </>
  ),
  viewpoint: (
    <>
      <path d="m2 20 6.5-11 4 6.5L15 12l7 8H2Z" />
      <circle cx="17" cy="6" r="2" />
    </>
  ),
  map: (
    <>
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  notes: (
    <>
      <path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4A8 8 0 1 1 20 12Z" />
      <path d="M9 10.5h6M9 13.5h4" />
    </>
  ),
  match: (
    <>
      <circle cx="9" cy="12" r="5.5" />
      <circle cx="15" cy="12" r="5.5" />
    </>
  ),
  stash: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
  activity: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  gem: (
    <>
      <path d="M7 4h10l4 5.5L12 20 3 9.5 7 4Z" />
      <path d="M3 9.5h18M9.5 4 8 9.5l4 10.5 4-10.5L14.5 4" />
    </>
  ),
  share: (
    <>
      <path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" />
      <path d="m8 7 4-4 4 4M12 3v12" />
    </>
  ),
  thumbs: (
    <>
      <path d="M7 10v11" />
      <path d="M14.5 5.5 13.5 10h5.3a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 17.3 21H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3l3.8-6.6A1.9 1.9 0 0 1 14.5 5.5Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 21s8-3.5 8-10V5.5L12 3 4 5.5V11c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
}

export type IconName = keyof typeof paths | 'apple'

type Props = { name: IconName; size?: number }

export function Icon({ name, size = 24 }: Props) {
  if (name === 'apple') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.37 12.62c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.39-2.85 1.42-2.92-.03-.01-2.72-1.04-2.71-4.13ZM13.79 5c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.09 3.18 1.15.09 2.33-.58 3.05-1.46Z"
        />
      </svg>
    )
  }
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
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
