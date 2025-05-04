import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Settings } from "@shared/schema";

type ThemeContextType = {
  primaryColor: string;
  secondaryColor: string;
};

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: "#8e2c8e", // Default primary color
  secondaryColor: "#f8bef8", // Default secondary color
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (settings?.primaryColor || settings?.secondaryColor) {
      const root = document.documentElement;
      
      if (settings.primaryColor) {
        // Set CSS variables for primary color
        root.style.setProperty("--primary", settings.primaryColor);
        root.style.setProperty("--primary-foreground", "#fff");
      }
      
      if (settings.secondaryColor) {
        // Set CSS variables for secondary color
        root.style.setProperty("--secondary", settings.secondaryColor);
        root.style.setProperty("--secondary-foreground", "#000");
        
        // Also set accent color to secondary for consistency
        root.style.setProperty("--accent", settings.secondaryColor);
        root.style.setProperty("--accent-foreground", "#000");
      }
    }
  }, [settings]);

  const value = {
    primaryColor: settings?.primaryColor || "#8e2c8e",
    secondaryColor: settings?.secondaryColor || "#f8bef8",
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
