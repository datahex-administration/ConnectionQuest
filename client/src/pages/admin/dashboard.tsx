import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download } from "lucide-react";

interface AnalyticsData {
  totalParticipants: number;
  completedMatches: number;
  voucherCount: number;
  genderDistribution: { gender: string; count: number }[];
  ageDistribution: { ageGroup: string; count: number }[];
}

interface Participant {
  id: number;
  name: string;
  gender: string;
  age: number;
  whatsappNumber: string;
  matchStatus: string;
}

const COLORS = ['#8e2c8e', '#d4a5d4', '#e0e0e0', '#8e2c8e80'];

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch analytics data
        const analyticsResponse = await fetch("/api/admin/analytics");
        if (!analyticsResponse.ok) {
          // If unauthorized, redirect to login
          if (analyticsResponse.status === 401) {
            toast({
              title: "Session Expired",
              description: "Please log in again to access the admin dashboard.",
              variant: "destructive",
            });
            navigate("/admin/login");
            return;
          }
          throw new Error("Failed to fetch analytics data");
        }
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
        
        // Fetch participants data
        const participantsResponse = await fetch("/api/admin/participants?limit=5");
        if (!participantsResponse.ok) {
          throw new Error("Failed to fetch participants data");
        }
        const participantsData = await participantsResponse.json();
        setParticipants(participantsData.participants || []);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast({
          title: "Data Loading Failed",
          description: error instanceof Error ? error.message : "Failed to load dashboard data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDashboardData();
  }, [navigate, toast]);
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout", {});
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: error instanceof Error ? error.message : "Failed to log out.",
        variant: "destructive",
      });
    }
  };
  
  const handleExportData = () => {
    if (!participants.length) return;
    
    setIsExporting(true);
    
    try {
      // Create CSV data
      const headers = ["Name", "Gender", "Age", "WhatsApp Number", "Match Status"];
      const csvRows = [
        headers.join(","),
        ...participants.map(p => [
          `"${p.name}"`,
          `"${p.gender}"`,
          p.age,
          `"${p.whatsappNumber}"`,
          `"${p.matchStatus}"`
        ].join(","))
      ];
      const csvData = csvRows.join("\n");
      
      // Create and download the file
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mawadha-participants-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Data Exported",
        description: "Participant data has been exported successfully.",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <Header />
        <div className="text-center py-10">
          <div className="animate-pulse">
            <div className="h-8 bg-primary/20 rounded w-1/3 mx-auto mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-4xl mx-auto">
              <div className="h-24 bg-primary/10 rounded"></div>
              <div className="h-24 bg-primary/10 rounded"></div>
              <div className="h-24 bg-primary/10 rounded"></div>
            </div>
            <div className="h-60 bg-primary/5 rounded max-w-4xl mx-auto"></div>
          </div>
          <p className="mt-6 text-gray-600">Loading dashboard data...</p>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary mb-3 md:mb-0">Admin Dashboard</h2>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/questions")}
                  className="text-xs sm:text-sm flex-grow md:flex-grow-0"
                >
                  Questions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/participants")}
                  className="text-xs sm:text-sm flex-grow md:flex-grow-0"
                >
                  Participants
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/coupon-templates")}
                  className="text-xs sm:text-sm flex-grow md:flex-grow-0"
                >
                  Coupons
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/settings")}
                  className="text-xs sm:text-sm flex-grow md:flex-grow-0"
                >
                  Settings
                </Button>
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  className="text-xs sm:text-sm flex-grow md:flex-grow-0 text-red-500 border-red-200 hover:bg-red-50"
                >
                  Logout
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Total Participants</h3>
                <p className="text-3xl font-bold text-primary">{analytics?.totalParticipants || 0}</p>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Completed Matches</h3>
                <p className="text-3xl font-bold text-primary">{analytics?.completedMatches || 0}</p>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Vouchers Generated</h3>
                <p className="text-3xl font-bold text-primary">{analytics?.voucherCount || 0}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4">Gender Distribution</h3>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.genderDistribution.map(item => ({
                          name: item.gender === 'prefer-not-to-say' 
                            ? 'Prefer Not To Say' 
                            : item.gender.charAt(0).toUpperCase() + item.gender.slice(1),
                          value: item.count
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics?.genderDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-4">Age Distribution</h3>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics?.ageDistribution.map(item => ({
                        ageGroup: item.ageGroup,
                        count: item.count
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis dataKey="ageGroup" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8e2c8e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="mb-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Recent Participants</h3>
              <Button 
                onClick={handleExportData}
                className="text-primary bg-primary/10 text-sm px-3 py-1 rounded hover:bg-primary/20 flex items-center"
                disabled={isExporting || !participants.length}
              >
                <Download className="h-4 w-4 mr-1" /> {isExporting ? "Exporting..." : "Export Data"}
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-primary/5 text-primary">
                  <tr>
                    <th className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                    <th className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider">Gender</th>
                    <th className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider">Age</th>
                    <th className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider">WhatsApp</th>
                    <th className="py-2 px-3 text-left text-xs font-medium uppercase tracking-wider">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {participants.length > 0 ? (
                    participants.map((participant) => (
                      <tr key={participant.id}>
                        <td className="py-3 px-3 whitespace-nowrap">{participant.name}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {participant.gender === 'prefer-not-to-say'
                            ? 'Prefer Not To Say'
                            : participant.gender.charAt(0).toUpperCase() + participant.gender.slice(1)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">{participant.age}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{participant.whatsappNumber}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            participant.matchStatus === 'Completed' 
                              ? 'bg-green-100 text-green-600' 
                              : participant.matchStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-600'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {participant.matchStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        No participants found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer showAdminLink={false} />
    </div>
  );
}
