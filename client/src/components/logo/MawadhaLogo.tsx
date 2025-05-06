interface MawadhaLogoProps {
  className?: string;
}

export function MawadhaLogo({ className = "h-12 w-12" }: MawadhaLogoProps) {
  // Using the actual Mawadha logo image
  return (
    <img 
      src="/images/mawadha-logo.png?v=1746530162" 
      alt="Mawadha Logo" 
      className={className} 
      style={{ objectFit: 'contain' }}
    />
  );
}
