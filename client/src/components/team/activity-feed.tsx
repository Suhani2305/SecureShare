import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/config";
import { format } from "date-fns";
import { Upload, Download, Share2, Edit, Trash2 } from "lucide-react";

interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  resourceId: number;
  resourceType: string;
  metadata: {
    filename?: string;
    sharedWith?: string;
    accessLevel?: string;
  };
  timestamp: string;
  user: {
    username: string;
  };
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case "upload":
      return <Upload className="h-4 w-4" />;
    case "download":
      return <Download className="h-4 w-4" />;
    case "share":
      return <Share2 className="h-4 w-4" />;
    case "edit":
      return <Edit className="h-4 w-4" />;
    case "delete":
      return <Trash2 className="h-4 w-4" />;
    default:
      return null;
  }
};

const getActivityMessage = (activity: ActivityLog) => {
  const { action, metadata, user } = activity;
  
  switch (action) {
    case "upload":
      return `${user.username} uploaded ${metadata.filename}`;
    case "download":
      return `${user.username} downloaded ${metadata.filename}`;
    case "share":
      return `${user.username} shared ${metadata.filename} with ${metadata.sharedWith}`;
    case "edit":
      return `${user.username} edited ${metadata.filename}`;
    case "delete":
      return `${user.username} deleted ${metadata.filename}`;
    default:
      return `${user.username} performed an action`;
  }
};

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const response = await apiRequest("GET", `${API_ENDPOINTS.ADMIN}/activity-logs`);
      if (!response.ok) {
        throw new Error("Failed to fetch activity logs");
      }
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities?.slice(0, 10).map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="mt-1 p-1.5 bg-gray-100 rounded-full">
            {getActivityIcon(activity.action)}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm">{getActivityMessage(activity)}</p>
            <p className="text-xs text-gray-500">
              {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 