import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Download, ArrowUpDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminRoute } from "@/lib/admin-route";

function ParticipantStatusBadge({ status }: { status: string }) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  
  switch (status) {
    case "Voucher Downloaded":
      variant = "default";
      break;
    case "Voucher Generated":
      variant = "secondary";
      break;
    case "No Voucher":
    case "Not Submitted":
      variant = "destructive";
      break;
    case "Waiting for Partner":
    case "Waiting for Partner to Join":
    case "Pending":
      variant = "outline";
      break;
  }
  
  return <Badge variant={variant}>{status}</Badge>;
}

function ParticipantsList() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionInputValue, setSessionInputValue] = useState("");
  
  // Initialize input values on component mount
  useEffect(() => {
    setSearchInputValue(searchTerm);
    setSessionInputValue(sessionSearch);
  }, []);
  
  // Refs for search input elements
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sessionSearchInputRef = useRef<HTMLInputElement>(null);
  
  // References for the tables for PDF export
  const participantsTableRef = useRef<HTMLTableElement>(null);
  const sessionsTableRef = useRef<HTMLTableElement>(null);
  
  // Debounce search terms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSessionSearch(sessionInputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [sessionInputValue]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/participants", page, searchTerm, statusFilter],
    queryFn: async () => {
      let url = `/api/admin/participants?page=${page}&limit=10`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (statusFilter && statusFilter !== "all") {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch participants");
      }
      return response.json();
    }
  });

  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["/api/admin/sessions", page, sessionSearch],
    queryFn: async () => {
      let url = `/api/admin/sessions?page=${page}&limit=10`;
      if (sessionSearch) {
        url += `&search=${encodeURIComponent(sessionSearch)}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      return response.json();
    }
  });
  
  // Function to export participants to PDF
  const exportParticipantsToPDF = async () => {
    // Fetch all participants for export
    let url = `/api/admin/participants?limit=1000`;
    if (searchTerm) {
      url += `&search=${encodeURIComponent(searchTerm)}`;
    }
    if (statusFilter && statusFilter !== "all") {
      url += `&status=${encodeURIComponent(statusFilter)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch all participants");
    }
    const result = await response.json();
    const { participants } = result;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Participants List", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);
    
    // Create table data
    const tableColumn = ["Name", "WhatsApp", "Gender", "Age", "Status", "Session Code", "Voucher"];
    const tableRows: any[] = [];
    
    participants.forEach((participant: any) => {
      const participantData = [
        participant.name,
        participant.whatsappNumber,
        participant.gender,
        participant.age,
        participant.matchStatus,
        participant.sessionCode || "-",
        participant.voucherCode || "-"
      ];
      tableRows.push(participantData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [128, 0, 128] }
    });
    
    doc.save("participants-list.pdf");
  };
  
  // Function to export sessions to PDF
  const exportSessionsToPDF = async () => {
    // Fetch all sessions for export
    let url = `/api/admin/sessions?limit=1000`;
    if (sessionSearch) {
      url += `&search=${encodeURIComponent(sessionSearch)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch all sessions");
    }
    const result = await response.json();
    const { sessions } = result;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Sessions List", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);
    
    // Create table data
    const tableColumn = ["Session Code", "Created Date", "Status", "Participants", "Voucher"];
    const tableRows: any[] = [];
    
    sessions.forEach((session: any) => {
      const participantNames = session.participants
        .map((p: any) => p.user.name)
        .join(", ");
        
      const voucherStatus = session.voucher 
        ? `${session.voucher.voucherCode} (${session.voucher.downloaded ? 'Downloaded' : 'Generated'})` 
        : 'No voucher';
        
      const sessionData = [
        session.sessionCode,
        new Date(session.createdAt).toLocaleDateString(),
        session.completed ? "Completed" : "In Progress",
        participantNames,
        voucherStatus
      ];
      tableRows.push(sessionData);
    });
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [128, 0, 128] }
    });
    
    doc.save("sessions-list.pdf");
  };

  if (isLoading || isLoadingSessions) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { participants, pagination } = data || { participants: [], pagination: { currentPage: 1, totalPages: 1 } };
  const { sessions, pagination: sessionsPagination } = sessionsData || { sessions: [], pagination: { currentPage: 1, totalPages: 1 } };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Participants List</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search participant..."
                className="pl-8"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                ref={searchInputRef}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Voucher Downloaded">Voucher Downloaded</SelectItem>
                <SelectItem value="Voucher Generated">Voucher Generated</SelectItem>
                <SelectItem value="No Voucher">No Voucher</SelectItem>
                <SelectItem value="Not Submitted">Not Submitted</SelectItem>
                <SelectItem value="Waiting for Partner">Waiting for Partner</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={exportParticipantsToPDF}
              className="flex items-center gap-1">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Session Code</TableHead>
                <TableHead>Voucher Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No participants found</TableCell>
                </TableRow>
              ) : (
                participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>{participant.name}</TableCell>
                    <TableCell>{participant.whatsappNumber}</TableCell>
                    <TableCell>{participant.gender}</TableCell>
                    <TableCell>{participant.age}</TableCell>
                    <TableCell>
                      <ParticipantStatusBadge status={participant.matchStatus} />
                    </TableCell>
                    <TableCell>{participant.sessionCode || "—"}</TableCell>
                    <TableCell>{participant.voucherCode || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page > 1 ? page - 1 : 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="px-2">
              Page {pagination.currentPage} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= (pagination.totalPages || 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Sessions with Participants</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search session code..."
                className="pl-8"
                value={sessionInputValue}
                onChange={(e) => setSessionInputValue(e.target.value)}
                ref={sessionSearchInputRef}
              />
            </div>
            <Button
              size="sm"
              onClick={exportSessionsToPDF}
              className="flex items-center gap-1">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Code</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Voucher</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No sessions found</TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.sessionCode}</TableCell>
                    <TableCell>{new Date(session.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={session.completed ? "default" : "outline"}>
                        {session.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc pl-5">
                        {session.participants.map((p) => (
                          <li key={p.userId}>{p.user.name}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>
                      {session.voucher ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{session.voucher.voucherCode}</span>
                          <Badge variant="secondary" className="mt-1 w-fit">
                            {session.voucher.downloaded ? "Downloaded" : "Generated"}
                          </Badge>
                        </div>
                      ) : (
                        "No voucher"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page > 1 ? page - 1 : 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="px-2">
              Page {sessionsPagination.currentPage} of {sessionsPagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= (sessionsPagination.totalPages || 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminParticipants() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Participants & Sessions</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => window.location.href = "/admin/dashboard"}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <ParticipantsList />
    </div>
  );
}

export default function AdminParticipantsPage() {
  return <AdminRoute component={AdminParticipants} />;
}
