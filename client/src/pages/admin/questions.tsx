import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Plus, Edit, RefreshCw, Trash } from "lucide-react";
import { Question, QuestionOption } from "@shared/schema";

interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

const questionFormSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  questionType: z.enum(["common", "individual"]),
  options: z.array(
    z.object({
      optionText: z.string().min(1, "Option text is required")
    })
  ).min(2, "At least 2 options are required")
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

export default function AdminQuestions() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithOptions | null>(null);
  
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      text: "",
      questionType: "common",
      options: [{ optionText: "" }, { optionText: "" }]
    }
  });
  
  // Load questions from the server
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/questions");
        
        if (!response.ok) {
          // If unauthorized, redirect to login
          if (response.status === 401) {
            toast({
              title: "Session Expired",
              description: "Please log in again to access the admin dashboard.",
              variant: "destructive",
            });
            navigate("/admin/login");
            return;
          }
          throw new Error("Failed to fetch questions");
        }
        
        const data = await response.json();
        setQuestions(data);
      } catch (error) {
        console.error("Error loading questions:", error);
        toast({
          title: "Failed to Load Questions",
          description: error instanceof Error ? error.message : "An error occurred while loading questions",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuestions();
  }, [toast, navigate]);
  
  // Filter questions based on active tab
  const filteredQuestions = activeTab === "all" 
    ? questions 
    : questions.filter(q => q.questionType === activeTab);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (response.ok) {
        navigate("/admin/login");
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "There was an issue logging out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Edit question
  const handleEditQuestion = (question: QuestionWithOptions) => {
    setEditingQuestion(question);
    
    // Reset form values with the question data
    form.reset({
      text: question.text,
      questionType: question.questionType as "common" | "individual",
      options: question.options.map(opt => ({ optionText: opt.optionText }))
    });
    
    setIsDialogOpen(true);
  };
  
  // Add new question
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    
    // Reset form with default values
    form.reset({
      text: "",
      questionType: "common",
      options: [{ optionText: "" }, { optionText: "" }]
    });
    
    setIsDialogOpen(true);
  };
  
  // Add option field
  const addOption = () => {
    const currentOptions = form.getValues().options || [];
    form.setValue("options", [...currentOptions, { optionText: "" }]);
  };
  
  // Remove option field
  const removeOption = (index: number) => {
    const currentOptions = form.getValues().options || [];
    if (currentOptions.length > 2) {
      form.setValue(
        "options", 
        currentOptions.filter((_, i) => i !== index)
      );
    } else {
      toast({
        title: "Cannot Remove Option",
        description: "At least 2 options are required for a question.",
        variant: "destructive",
      });
    }
  };
  
  // Submit question form
  const onSubmit = async (values: QuestionFormValues) => {
    try {
      const url = editingQuestion 
        ? `/api/admin/questions/${editingQuestion.id}` 
        : "/api/admin/questions";
      
      const method = editingQuestion ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        throw new Error("Failed to save question");
      }
      
      // Refresh questions list
      const updatedQuestionsResponse = await fetch("/api/admin/questions");
      const updatedQuestions = await updatedQuestionsResponse.json();
      setQuestions(updatedQuestions);
      
      // Close dialog and show success message
      setIsDialogOpen(false);
      toast({
        title: editingQuestion ? "Question Updated" : "Question Added",
        description: editingQuestion 
          ? "The question has been updated successfully." 
          : "The new question has been added successfully."
      });
    } catch (error) {
      console.error("Error saving question:", error);
      toast({
        title: "Failed to Save Question",
        description: error instanceof Error ? error.message : "An error occurred while saving the question",
        variant: "destructive",
      });
    }
  };
  
  // Delete question
  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete question");
      }
      
      // Remove question from state
      setQuestions(questions.filter(q => q.id !== questionId));
      
      toast({
        title: "Question Deleted",
        description: "The question has been deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        title: "Failed to Delete Question",
        description: error instanceof Error ? error.message : "An error occurred while deleting the question",
        variant: "destructive",
      });
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header />
        <div className="max-w-6xl mx-auto text-center py-10">
          <div className="animate-pulse">
            <div className="h-4 bg-primary/20 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-24 bg-primary/10 rounded mb-4"></div>
            <div className="h-12 bg-primary/20 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="mt-6 text-gray-600">Loading questions...</p>
        </div>
        <Footer showAdminLink={false} />
      </div>
    );
  }
  
  return (
    <div className="animate-fade-in">
      <Header />
      
      <div className="max-w-6xl mx-auto mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-primary">Question Management</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/dashboard")}
                  className="text-sm"
                >
                  Back to Dashboard
                </Button>
              </div>
              <Button 
                onClick={handleLogout}
                className="text-sm text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20"
              >
                Logout
              </Button>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All Questions</TabsTrigger>
                  <TabsTrigger value="common">Common Questions</TabsTrigger>
                  <TabsTrigger value="individual">Individual Questions</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button onClick={handleAddQuestion} className="flex items-center gap-2">
                <Plus size={16} />
                Add Question
              </Button>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead>Question Text</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                        No questions found. Click "Add Question" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell>{question.id}</TableCell>
                        <TableCell>{question.text}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${question.questionType === 'common' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {question.questionType === 'common' ? 'Common' : 'Individual'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-h-20 overflow-y-auto text-sm">
                            {question.options.map((opt, i) => (
                              <div key={opt.id} className="mb-1 last:mb-0">
                                {i+1}. {opt.optionText}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditQuestion(question)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit size={16} />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteQuestion(question.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash size={16} />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter the question text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="questionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <FormLabel>Options</FormLabel>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addOption}
                    className="text-xs"
                  >
                    Add Option
                  </Button>
                </div>
                
                {form.watch("options")?.map((_, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <FormField
                      control={form.control}
                      name={`options.${index}.optionText`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input placeholder={`Option ${index + 1}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="h-10 w-10 p-0"
                    >
                      <X size={18} />
                    </Button>
                  </div>
                ))}
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingQuestion ? "Update Question" : "Save Question"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Footer showAdminLink={false} />
    </div>
  );
}
