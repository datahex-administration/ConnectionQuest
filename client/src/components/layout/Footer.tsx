import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Settings } from "@shared/schema";

interface FooterProps {
  showAdminLink?: boolean;
}

export function Footer({ showAdminLink = true }: FooterProps) {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  return (
    <footer className="mt-12 text-center text-gray-500 text-sm">
      <div className="flex justify-center items-center space-x-2 mb-2">
        {showAdminLink && (
          <>
            <Link href="/admin/login" className="text-primary hover:text-primary/80">
              Admin
            </Link>
            <span>|</span>
          </>
        )}
        {settings?.privacyPolicyUrl && (
          <a 
            href={settings.privacyPolicyUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:text-primary/80"
          >
            Privacy Policy
          </a>
        )}
        {settings?.privacyPolicyUrl && settings?.termsAndConditionsUrl && <span>|</span>}
        {settings?.termsAndConditionsUrl && (
          <a 
            href={settings.termsAndConditionsUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-primary hover:text-primary/80"
          >
            Terms of Service
          </a>
        )}
      </div>
      <p>© {new Date().getFullYear()} Mawadha. All rights reserved.</p>
      <p className="mt-1 text-xs">
        Powered by <a href="https://eventhex.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">EventHex</a>
      </p>
    </footer>
  );
}
