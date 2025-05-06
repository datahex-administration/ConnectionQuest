import { MawadhaLogo } from "@/components/logo/MawadhaLogo";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { getLogoUrl } from "@/lib/utils";
import { Settings } from "@shared/schema";
import { useEffect, useState } from "react";

export function Header() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  const [logoError, setLogoError] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  
  // Update logo URL whenever settings change
  useEffect(() => {
    if (settings?.logoUrl) {
      const url = getLogoUrl(settings.logoUrl);
      setLogoUrl(url);
      setLogoError(false); // Reset error state when URL changes
      
      // Preload the image to check if it loads correctly
      const img = new Image();
      img.onload = () => setLogoError(false);
      img.onerror = () => {
        console.log("Logo failed to load:", url);
        setLogoError(true);
      };
      img.src = url;
    }
  }, [settings?.logoUrl]);
  
  return (
    <header className="flex justify-center mb-6 pt-4">
      <div className="text-center">
        <div className="h-20 mx-auto mb-2 relative">
          {logoUrl && !logoError ? (
            <img 
              src={logoUrl} 
              alt="Custom Logo" 
              className="h-full mx-auto object-contain z-10 relative" 
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex justify-center items-center h-full">
              <MawadhaLogo className="h-full" />
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-primary mt-2">Mawadha</h1>
        <p className="text-sm text-primary/80 italic">Be a better half</p>
      </div>
    </header>
  );
}
