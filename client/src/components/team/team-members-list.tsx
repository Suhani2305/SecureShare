import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { AddMemberModal } from "@/components/modals/add-member-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMember {
  id: number;
  username: string;
  email: string;
  role: string;
  accessLevel: string;
  lastActive?: string;
}

export function TeamMembersList() {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const response = await apiRequest("GET", `${API_ENDPOINTS.ADMIN}/users`);
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      return response.json();
    }
  });

  const updateAccessMutation = useMutation({
    mutationFn: async ({ userId, accessLevel }: { userId: number; accessLevel: string }) => {
      const response = await apiRequest("PATCH", `${API_ENDPOINTS.ADMIN}/team/members/${userId}`, {
        accessLevel
      });
      if (!response.ok) {
        throw new Error("Failed to update access level");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Success",
        description: "Member access level updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update access level",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `${API_ENDPOINTS.ADMIN}/team/members/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to remove team member");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast({
        title: "Success",
        description: "Team member removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  const handleUpdateAccess = (userId: number, newAccessLevel: string) => {
    updateAccessMutation.mutate({ userId, accessLevel: newAccessLevel });
  };

  const handleRemoveMember = (userId: number) => {
    if (confirm("Are you sure you want to remove this team member?")) {
      removeMemberMutation.mutate(userId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getAccessLevelColor = (accessLevel: string) => {
    switch (accessLevel) {
      case "admin":
        return "default";
      case "write":
        return "success";
      case "read":
      default:
        return "secondary";
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={() => setIsAddMemberOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="space-y-4">
        {members?.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>
                  {member.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{member.username}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getAccessLevelColor(member.accessLevel)}>
                {member.accessLevel}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleUpdateAccess(member.id, "read")}>
                    Set Read Access
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateAccess(member.id, "write")}>
                    Set Write Access
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateAccess(member.id, "admin")}>
                    Set Admin Access
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    Remove Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <AddMemberModal
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
      />
    </div>
  );
} 