interface MawadhaLogoProps {
  className?: string;
}

export function MawadhaLogo({ className = "h-12 w-12" }: MawadhaLogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="300" height="300" fill="#8e2c8e" />
      <path
        d="M150 30C150 30 105 75 105 150C105 225 150 270 150 270C150 270 195 225 195 150C195 75 150 30 150 30Z"
        fill="white"
      />
      <path
        d="M150 60C150 60 120 90 120 150C120 210 150 240 150 240C150 240 180 210 180 150C180 90 150 60 150 60Z"
        fill="#8e2c8e"
      />
      <path
        d="M50 90C50 90 95 135 95 210C95 285 50 330 50 330C50 330 95 285 95 210C95 135 50 90 50 90Z"
        transform="translate(150 -60)"
        fill="white"
      />
      <circle cx="65" cy="150" r="15" fill="white" />
      <circle cx="65" cy="195" r="15" fill="white" />
    </svg>
  );
}
