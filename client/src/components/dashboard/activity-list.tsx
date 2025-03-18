import { Clock } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Upload, Share2, Eye, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

export interface Activity {
  id: number;
  action: string;
  details: {
    filename?: string;
    sharedWith?: string;
    accessLevel?: string;
  };
  createdAt: string;
}

function getActivityIcon(action: string) {
  switch (action) {
    case "upload":
      return <Upload className="h-4 w-4 text-primary" />;
    case "share":
      return <Share2 className="h-4 w-4 text-green-600" />;
    case "download":
    case "view":
      return <Eye className="h-4 w-4 text-purple-600" />;
    case "delete":
      return <Trash2 className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
}

function getActivityBgColor(action: string) {
  switch (action) {
    case "upload":
      return "bg-blue-100";
    case "share":
      return "bg-green-100";
    case "download":
    case "view":
      return "bg-purple-100";
    case "delete":
      return "bg-red-100";
    default:
      return "bg-gray-100";
  }
}

function getActivityMessage(activity: Activity) {
  const { action, details } = activity;
  const filename = details?.filename || "a file";

  switch (action) {
    case "upload":
      return <>You uploaded <span className="font-medium">{filename}</span></>;
    case "share":
      return <>You shared <span className="font-medium">{filename}</span> with <span className="font-medium">{details.sharedWith}</span></>;
    case "download":
      return <>You downloaded <span className="font-medium">{filename}</span></>;
    case "delete":
      return <>You deleted <span className="font-medium">{filename}</span></>;
    case "view":
      return <><span className="font-medium">{details.sharedWith}</span> viewed <span className="font-medium">{filename}</span></>;
    default:
      return <>{action} <span className="font-medium">{filename}</span></>;
  }
}

export function ActivityList() {
  const { data: activities, isLoading, error } = useQuery<Activity[]>({
    queryKey: ["/api/activity-logs"],
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        <a href="/admin/activity-logs" className="text-sm text-primary hover:underline">View All</a>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-4 text-red-500">
            Failed to load activities
          </div>
        )}

        {activities && activities.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No recent activities
          </div>
        )}

        {activities && activities.slice(0, 4).map((activity) => (
          <div key={activity.id} className="flex items-start mb-4 last:mb-0">
            <div className={`${getActivityBgColor(activity.action)} p-2 rounded-md`}>
              {getActivityIcon(activity.action)}
            </div>
            <div className="ml-3">
              <p className="text-sm">{getActivityMessage(activity)}</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}