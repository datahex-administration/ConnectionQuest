import { MawadhaLogo } from "@/components/logo/MawadhaLogo";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { getLogoUrl } from "@/lib/utils";
import { Settings } from "@shared/schema";

export function Header() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  return (
    <header className="flex justify-center mb-6 pt-4">
      <div className="text-center">
        <div className="h-20 mx-auto mb-2 relative">
          {settings?.logoUrl && (
            <img 
              src={getLogoUrl(settings.logoUrl)} 
              alt="Custom Logo" 
              className="h-full mx-auto object-contain z-10 relative" 
              onError={(e) => {
                // Hide this image and show the default logo
                e.currentTarget.style.display = 'none';
                const defaultLogo = document.querySelector('.default-logo');
                if (defaultLogo) {
                  defaultLogo.classList.remove('hidden');
                }
              }}
            />
          )}
          {/* Default logo always present but hidden when custom logo exists and loads */}
          <div className={`absolute inset-0 flex justify-center items-center ${settings?.logoUrl ? 'hidden' : ''} default-logo`}>
            <MawadhaLogo className="h-full" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary mt-2">Mawadha</h1>
        <p className="text-sm text-primary/80 italic">Be a better half</p>
      </div>
    </header>
  );
}
