interface MawadhaLogoProps {
  className?: string;
}

export function MawadhaLogo({ className = "h-12 w-12" }: MawadhaLogoProps) {
  return (
    <img
      src="/images/mawadha-logo.png"
      alt="Mawadha Logo"
      className={className}
    />
  );
}
