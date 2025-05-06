import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Info } from "lucide-react";
import { getLogoUrl } from "@/lib/utils";
import { useLocation } from "wouter";

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
  const [, navigate] = useLocation();
  
  // Fetch current settings
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  // Settings update mutation
  const mutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      // Update settings with the form data
      const res = await apiRequest("PUT", "/api/admin/settings", {
        ...data,
        // Keep the logoUrl field but don't modify it
        logoUrl: data.logoUrl,
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Site Settings</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 border-gray-300 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

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
              {/* Note about logo */}
              <div className="rounded-md bg-muted p-4 text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <p className="font-medium">Mawadha Logo</p>
                </div>
                <p className="mt-2 text-muted-foreground">
                  The Mawadha logo is now managed automatically through the system.
                </p>
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
              className="min-w-[120px] bg-[#8e2c8e] text-white hover:bg-[#8e2c8e]/90"
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
