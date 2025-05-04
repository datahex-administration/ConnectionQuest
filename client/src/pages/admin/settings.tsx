import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { getLogoUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateSettingsSchema, Settings } from "@shared/schema";

type SettingsFormValues = z.infer<typeof FormSchema>;

// Form validation schema
const FormSchema = updateSettingsSchema;

export default function SettingsPage() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // File upload handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only accept image files
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Settings update mutation
  const mutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      // If we have a logo file, upload it first
      let logoUrl = data.logoUrl;

      if (logoFile) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        
        try {
          const uploadRes = await fetch("/api/admin/upload/logo", {
            method: "POST",
            body: formData,
          });
          
          if (!uploadRes.ok) {
            throw new Error("Failed to upload logo");
          }
          
          const uploadData = await uploadRes.json();
          logoUrl = uploadData.url;
        } catch (error) {
          console.error("Error uploading logo:", error);
          throw new Error("Failed to upload logo");
        }
      }

      // Now update settings with all data including the new logo URL if applicable
      const res = await apiRequest("PUT", "/api/admin/settings", {
        ...data,
        logoUrl,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update settings");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your site settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create form with react-hook-form
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      privacyPolicyUrl: settings?.privacyPolicyUrl || "",
      termsAndConditionsUrl: settings?.termsAndConditionsUrl || "",
      logoUrl: settings?.logoUrl || "",
      primaryColor: settings?.primaryColor || "#8e2c8e",
      secondaryColor: settings?.secondaryColor || "#d4a5d4",
    },
  });

  // Update form values when settings are loaded
  React.useEffect(() => {
    if (settings) {
      form.reset({
        privacyPolicyUrl: settings.privacyPolicyUrl || "",
        termsAndConditionsUrl: settings.termsAndConditionsUrl || "",
        logoUrl: settings.logoUrl || "",
        primaryColor: settings.primaryColor || "#8e2c8e",
        secondaryColor: settings.secondaryColor || "#d4a5d4",
      });

      // Set logo preview if logo URL exists
      if (settings.logoUrl) {
        setLogoPreview(settings.logoUrl);
      }
    }
  }, [settings, form]);

  // Form submission handler
  const onSubmit = (data: SettingsFormValues) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Site Settings</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize your application's logo and colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <div className="font-medium">Logo</div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {logoPreview && (
                    <div className="relative w-32 h-32 border rounded overflow-hidden flex items-center justify-center bg-background">
                      <img 
                        src={logoPreview?.startsWith("data:") ? logoPreview : getLogoUrl(logoPreview)} 
                        alt="Logo preview" 
                        className="max-w-full max-h-full object-contain" 
                        onError={(e) => {
                          // Log error and set a fallback image
                          console.error('Error loading logo preview:', logoPreview);
                          e.currentTarget.src = '/placeholder-image.png';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      id="logo-upload"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 p-2 border border-dashed rounded hover:bg-accent w-fit">
                        <Upload className="h-4 w-4" />
                        <span>{logoFile ? logoFile.name : "Upload logo"}</span>
                      </div>
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended size: 200x200 pixels. Max file size: 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo URL (hidden field, updated by the file upload) */}
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Color fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <div className="flex gap-2">
                        <div 
                          className="w-10 h-10 rounded border" 
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input {...field} type="color" className="w-16 h-10" />
                        </FormControl>
                      </div>
                      <FormDescription>
                        Used for buttons, links, and other primary UI elements.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <div className="flex gap-2">
                        <div 
                          className="w-10 h-10 rounded border" 
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input {...field} type="color" className="w-16 h-10" />
                        </FormControl>
                      </div>
                      <FormDescription>
                        Used for backgrounds, accents, and secondary UI elements.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Legal Documents</CardTitle>
              <CardDescription>
                Add links to your privacy policy and terms of service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="privacyPolicyUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Privacy Policy URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/privacy-policy" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      URL to your privacy policy document.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="termsAndConditionsUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms and Conditions URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/terms" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      URL to your terms and conditions document.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="min-w-[120px]"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
