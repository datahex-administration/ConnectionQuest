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
import React, { useEffect, useState } from "react";

// Define form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  gender: z.enum(["male", "female"], {
    required_error: "Please select your gender",
  }),
  age: z.string().refine(val => /^\d+$/.test(val), "Age must be a number"), // Only check that it consists of digits
  whatsappNumber: z.string().refine(
    (val) => {
      // Validate country code first
      const countryCodes = ["+971", "+966", "+973", "+974", "+965", "+968", "+91"];
      const hasValidCode = countryCodes.some(code => val.startsWith(code));
      if (!hasValidCode) return false;
      
      // Extract the part after country code
      let number = "";
      if (val.startsWith("+971")) number = val.substring(4); // UAE
      else if (val.startsWith("+966")) number = val.substring(4); // KSA
      else if (val.startsWith("+973")) number = val.substring(4); // Bahrain
      else if (val.startsWith("+974")) number = val.substring(4); // Qatar
      else if (val.startsWith("+965")) number = val.substring(4); // Kuwait
      else if (val.startsWith("+968")) number = val.substring(4); // Oman
      else if (val.startsWith("+91")) number = val.substring(3); // India
      
      // Validate the phone number based on country
      if (val.startsWith("+971")) return /^\d{9}$/.test(number); // UAE: 9 digits
      if (val.startsWith("+966")) return /^\d{9}$/.test(number); // KSA: 9 digits
      if (val.startsWith("+973")) return /^\d{8}$/.test(number); // Bahrain: 8 digits
      if (val.startsWith("+974")) return /^\d{8}$/.test(number); // Qatar: 8 digits
      if (val.startsWith("+965")) return /^\d{8}$/.test(number); // Kuwait: 8 digits
      if (val.startsWith("+968")) return /^\d{8}$/.test(number); // Oman: 8 digits
      if (val.startsWith("+91")) return /^\d{10}$/.test(number); // India: 10 digits
      
      return false;
    },
    "Please enter a valid mobile number for the selected country"
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function Registration() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, registerMutation } = useAuth();
  const [countryCode, setCountryCode] = useState("+971");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      gender: "male", // Default to male selection
      age: "18", // Default to minimum age as string
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
    // Convert age to number for API call
    const formattedValues = {
      ...values,
      age: parseInt(values.age, 10) || 0
    };
    registerMutation.mutate(formattedValues, {
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
                          type="text" 
                          placeholder="Enter your age"
                          {...field}
                          onChange={(e) => {
                            // Only allow digits
                            const onlyDigits = e.target.value.replace(/\D/g, '');
                            field.onChange(onlyDigits);
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Select defaultValue="+971" onValueChange={val => {
                          setCountryCode(val);
                          // Clear the phone number when country changes
                          setPhoneNumber("");
                          // Set the form field with the new country code
                          field.onChange(`${val}`);
                        }}>
                          <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+971">UAE +971</SelectItem>
                            <SelectItem value="+966">KSA +966</SelectItem>
                            <SelectItem value="+973">Bahrain +973</SelectItem>
                            <SelectItem value="+974">Qatar +974</SelectItem>
                            <SelectItem value="+965">Kuwait +965</SelectItem>
                            <SelectItem value="+968">Oman +968</SelectItem>
                            <SelectItem value="+91">India +91</SelectItem>
                          </SelectContent>
                        </Select>

                        <FormControl>
                          <Input
                            placeholder="Enter phone number"
                            type="text"
                            onChange={(e) => {
                              // Only allow numbers
                              const onlyNumbers = e.target.value.replace(/\D/g, '');
                              setPhoneNumber(onlyNumbers);
                              
                              // Update the form field with country code + phone number
                              field.onChange(`${countryCode}${onlyNumbers}`);
                            }}
                            value={phoneNumber}
                          />
                        </FormControl>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {countryCode === "+971" && "Format: 5XXXXXXXX (9 digits)"}
                        {countryCode === "+966" && "Format: 5XXXXXXXX (9 digits)"}
                        {countryCode === "+973" && "Format: XXXXXXXX (8 digits)"}
                        {countryCode === "+974" && "Format: XXXXXXXX (8 digits)"}
                        {countryCode === "+965" && "Format: XXXXXXXX (8 digits)"}
                        {countryCode === "+968" && "Format: XXXXXXXX (8 digits)"}
                        {countryCode === "+91" && "Format: XXXXXXXXXX (10 digits)"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    className="bg-[#8e2c8e] hover:bg-[#742374] text-white font-semibold py-3 px-8 rounded-full shadow-lg"
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
