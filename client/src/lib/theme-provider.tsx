import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Settings } from "@shared/schema";

type ThemeContextType = {
  primaryColor: string;
  secondaryColor: string;
};

const DEFAULT_PRIMARY_COLOR = "#8e2c8e";
const DEFAULT_SECONDARY_COLOR = "#f8bef8";

const ThemeContext = createContext<ThemeContextType>({
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeApplied, setThemeApplied] = useState(false);
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    // Apply default theme immediately
    if (!themeApplied) {
      applyTheme(DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR);
      setThemeApplied(true);
    }
    
    // Then apply custom theme once settings are loaded
    if (!isLoading && settings) {
      const primaryColor = settings.primaryColor || DEFAULT_PRIMARY_COLOR;
      const secondaryColor = settings.secondaryColor || DEFAULT_SECONDARY_COLOR;
      applyTheme(primaryColor, secondaryColor);
    }
  }, [settings, isLoading, themeApplied]);

  function applyTheme(primary: string, secondary: string) {
    const root = document.documentElement;
    
    // Set CSS variables for primary color
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-foreground", "#fff");
    
    // Set CSS variables for secondary color
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--secondary-foreground", "#000");
    
    // Also set accent color to secondary for consistency
    root.style.setProperty("--accent", secondary);
    root.style.setProperty("--accent-foreground", "#000");
    
    // For buttons and UI elements that use these colors
    root.style.setProperty("--btn-primary-bg", primary);
    root.style.setProperty("--btn-primary-hover", adjustColor(primary, -20));
  }

  // Helper function to darken/lighten colors
  function adjustColor(color: string, amount: number): string {
    try {
      // Remove # if present
      color = color.replace(/#/g, '');
      
      let r = parseInt(color.substring(0, 2), 16);
      let g = parseInt(color.substring(2, 4), 16);
      let b = parseInt(color.substring(4, 6), 16);
      
      // Adjust each color channel
      r = Math.max(0, Math.min(255, r + amount));
      g = Math.max(0, Math.min(255, g + amount));
      b = Math.max(0, Math.min(255, b + amount));
      
      // Convert back to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (error) {
      console.error("Error adjusting color:", error);
      return color; // Return original color on error
    }
  }

  const value = {
    primaryColor: settings?.primaryColor || DEFAULT_PRIMARY_COLOR,
    secondaryColor: settings?.secondaryColor || DEFAULT_SECONDARY_COLOR,
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
