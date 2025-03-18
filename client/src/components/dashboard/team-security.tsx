import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/utils/auth";

export interface TeamMember {
  id: number;
  username: string;
  email: string;
  role: string;
  lastActivity?: string;
  mfaEnabled?: boolean;
  securityStatus?: "Secure" | "At Risk";
}

export function TeamSecurity() {
  const { user } = useAuth();
  const { data: users, isLoading, error } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === "admin",
  });
  
  if (!user || user.role !== "admin") {
    return null;
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Team Security Status</h2>
        <a href="/admin/activity-logs" className="text-primary hover:text-blue-700 text-sm font-medium">
          Security Report
        </a>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8 text-red-500">
            Failed to load team data. Please try again later.
          </div>
        )}
        
        {!isLoading && !error && (!users || users.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No team members found.
          </div>
        )}
        
        {users && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-4 font-medium text-gray-600 text-sm">User</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 text-sm">Role</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 text-sm">MFA</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 text-sm">Last Activity</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-600 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((member) => (
                  <tr key={member.id} className="border-b border-gray-200">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold mr-3">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{member.username}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{member.role}</td>
                    <td className="py-3 px-4">
                      <Badge variant={member.mfaEnabled ? "success" : "destructive"}>
                        {member.mfaEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {member.lastActivity 
                        ? formatDistanceToNow(new Date(member.lastActivity), { addSuffix: true })
                        : "Never"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={member.securityStatus === "Secure" ? "success" : "warning"}>
                        {member.securityStatus || "Unknown"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
