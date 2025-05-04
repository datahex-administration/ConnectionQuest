import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

// Define form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["male", "female"], {
    required_error: "Please select your gender",
  }),
  age: z.coerce.number().min(18, "You must be at least 18 years old").max(100, "Age must be 100 or below"),
  whatsappNumber: z.string().min(8, "Please enter a valid WhatsApp number with country code"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Registration() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, registerMutation } = useAuth();

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      gender: "male", // Default to male selection
      age: 18, // Default to minimum age
      whatsappNumber: "+971", // Default to UAE code
    },
  });

  // Redirect to code session if already logged in
  useEffect(() => {
    if (user) {
      navigate("/code-session");
    }
  }, [user, navigate]);

  // Handle form submission
  function onSubmit(values: FormValues) {
    registerMutation.mutate(values, {
      onSuccess: () => {
        toast({
          title: "Registration Successful",
          description: "You've been registered successfully.",
        });
        
        // Navigation handled in useEffect
      }
    });
  }

  if (user) return null; // Prevent flash of content

  return (
    <div className="animate-fade-in">
      <Header />
      
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold text-primary text-center mb-6">Player Registration</h2>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={18} 
                          max={100} 
                          placeholder="Enter your age"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => {
                    // Split the phone number into country code and number parts
                    const matches = field.value.match(/^(\+\d+)(\d*)$/);
                    const countryCode = matches ? matches[1] : "+971";
                    const phoneNumber = matches ? matches[2] : "";
                    
                    return (
                      <FormItem>
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={countryCode}
                              onValueChange={(newCode) => {
                                field.onChange(`${newCode}${phoneNumber}`);
                              }}
                            >
                              <SelectTrigger className="w-[110px] flex-shrink-0">
                                <SelectValue placeholder="Code" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* GCC Countries */}
                                <SelectItem value="+971">UAE +971</SelectItem>
                                <SelectItem value="+966">KSA +966</SelectItem>
                                <SelectItem value="+973">Bahrain +973</SelectItem>
                                <SelectItem value="+974">Qatar +974</SelectItem>
                                <SelectItem value="+965">Kuwait +965</SelectItem>
                                <SelectItem value="+968">Oman +968</SelectItem>
                                {/* India */}
                                <SelectItem value="+91">India +91</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              type="tel"
                              placeholder="5X XXX XXXX" 
                              value={phoneNumber}
                              onChange={(e) => {
                                // Only allow digits
                                const numbers = e.target.value.replace(/\D/g, '');
                                field.onChange(`${countryCode}${numbers}`);
                              }}
                              className="flex-1"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                
                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    className="btn-primary text-white font-semibold py-3 px-8 rounded-full shadow-lg"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : "Continue"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
