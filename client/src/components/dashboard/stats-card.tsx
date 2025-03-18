import { HardDrive, FileText, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth";
import { formatDistanceToNow } from "date-fns";

interface FileItem {
  id: number;
  name: string;
  size: number;
  type: string;
  path: string;
  encrypted: boolean;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLog {
  id: number;
  userId: number;
  action: string;
  resourceId: number;
  resourceType: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface StorageStatsProps {
  used: string;
  total: string;
  percentage: number;
}

export function StorageStats() {
  const { data: files } = useQuery<FileItem[]>({
    queryKey: ["/api/files"],
  });

  const totalStorage = 10 * 1024 * 1024 * 1024; // 10GB in bytes
  const usedStorage = files?.reduce((acc, file) => acc + file.size, 0) || 0;
  const usedGB = (usedStorage / (1024 * 1024 * 1024)).toFixed(2);
  const percentage = Math.min((usedStorage / totalStorage) * 100, 100);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-primary">
            <HardDrive className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Storage Used</p>
            <h3 className="text-xl font-bold">{usedGB} GB / 10 GB</h3>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={percentage} className="h-2.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export interface FileStatsProps {
  total: number;
  documents: number;
  images: number;
  other: number;
}

export function FileStats({ total, documents, images, other }: FileStatsProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Total Files</p>
            <h3 className="text-xl font-bold">{total}</h3>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs text-gray-500">Documents</p>
            <p className="font-bold">{documents}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Images</p>
            <p className="font-bold">{images}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Other</p>
            <p className="font-bold">{other}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SecurityStats() {
  const { user } = useAuth();
  const { data: activityLogs } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
    enabled: !!user,
  });

  const lastLogin = activityLogs?.find(log => log.action === "login")?.timestamp;
  const mfaEnabled = user?.mfaEnabled || false;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className="p-3 rounded-full bg-purple-100 text-purple-600">
            <Shield className="h-5 w-5" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Security Status</p>
            <h3 className="text-xl font-bold text-green-500">Protected</h3>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            <p className="text-sm">JWT Authentication</p>
          </div>
          <div className="flex items-center mt-1">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            <p className="text-sm">Encryption Active</p>
          </div>
          <div className="flex items-center mt-1">
            <Check className={`h-4 w-4 ${mfaEnabled ? 'text-green-500' : 'text-red-500'} mr-2`} />
            <p className="text-sm">Two-Factor Auth: {mfaEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div className="flex items-center mt-1">
            <Check className="h-4 w-4 text-green-500 mr-2" />
            <p className="text-sm">
              Last Login: {lastLogin ? formatDistanceToNow(new Date(lastLogin), { addSuffix: true }) : 'Never'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
