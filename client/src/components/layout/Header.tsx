import { MawadhaLogo } from "@/components/logo/MawadhaLogo";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Settings } from "@shared/schema";

export function Header() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  return (
    <header className="flex justify-center mb-6 pt-4">
      <div className="text-center">
        {settings?.logoUrl ? (
          <img src={settings.logoUrl} alt="Mawadha Logo" className="h-20 mx-auto mb-2 object-contain" />
        ) : (
          <MawadhaLogo className="h-20 mx-auto mb-2" />
        )}
        <h1 className="text-3xl font-bold text-primary mt-2">Mawadha</h1>
        <p className="text-sm text-primary/80 italic">Be a better half</p>
      </div>
    </header>
  );
}
