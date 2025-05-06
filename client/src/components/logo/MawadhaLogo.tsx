interface MawadhaLogoProps {
  className?: string;
}

export function MawadhaLogo({ className = "h-12 w-12" }: MawadhaLogoProps) {
  // This is the Mawadha logo based on the provided image
  return (
    <svg
      className={className}
      viewBox="0 0 1000 1000"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="1000" height="1000" fill="#b1208e" />
      <path 
        d="M500 190C500 190 440 240 430 290C420 340 430 380 460 430C490 480 520 510 530 580C540 650 520 700 490 750C460 800 430 820 430 820M570 190C570 190 630 240 640 290C650 340 640 380 610 430C580 480 550 510 540 580C530 650 550 700 580 750C610 800 640 820 640 820M360 330C360 330 300 380 290 430C280 480 290 520 320 570C350 620 380 650 390 720C400 790 380 840 350 890C320 940 290 960 290 960M710 330C710 330 770 380 780 430C790 480 780 520 750 570C720 620 690 650 680 720C670 790 690 840 720 890C750 940 780 960 780 960M370 380 A40 40 0 1 1 370 460 A40 40 0 1 1 370 380M370 300 A40 40 0 1 1 370 380 A40 40 0 1 1 370 300" 
        fill="white"
        stroke="white"
        strokeWidth="8"
      />
      <text 
        x="500" 
        y="910" 
        fill="white" 
        textAnchor="middle" 
        fontSize="120" 
        fontFamily="Arial, sans-serif" 
        fontWeight="bold">
        Mawadha
      </text>
      <text 
        x="500" 
        y="960" 
        fill="white" 
        textAnchor="middle" 
        fontSize="60" 
        fontFamily="Arial, sans-serif" 
        fontStyle="italic">
        Be a better half
      </text>
    </svg>
  );
}
