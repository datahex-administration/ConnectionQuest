import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
  
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/participants", page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/participants?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error("Failed to fetch participants");
      }
      return response.json();
    }
  });

  const { data: sessionsData, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["/api/admin/sessions", page],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sessions?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      return response.json();
    }
  });

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
        <CardHeader>
          <CardTitle>Participants List</CardTitle>
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
        <CardHeader>
          <CardTitle>Sessions with Participants</CardTitle>
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
