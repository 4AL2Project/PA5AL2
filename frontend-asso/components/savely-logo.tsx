interface SavelyLogoProps {
  size?: number;
  className?: string;
}

export function SavelyLogo({ size = 32, className = '' }: SavelyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="11" fill="#0F0F0F" />
      {/* V gauche */}
      <path
        d="M8 13L16 35L24 13"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Carré avec encoche bas-droite */}
      <path
        d="M28 13H42V35H34L28 29V13Z"
        fill="white"
      />
      <path
        d="M34 35L42 35"
        stroke="#0F0F0F"
        strokeWidth="1"
      />
    </svg>
  );
}
