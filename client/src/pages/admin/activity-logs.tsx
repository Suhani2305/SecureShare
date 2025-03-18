import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Filter, 
  Upload, 
  Share2, 
  Eye, 
  Trash2, 
  UserPlus, 
  LogIn, 
  XCircle,
  Clock,
  Calendar,
  ArrowDownToLine,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationEllipsis, 
  PaginationNext, 
  PaginationPrevious
} from "@/components/ui/pagination";

interface ActivityLog {
  id: number;
  userId: number | null;
  action: string;
  resourceId: number | null;
  resourceType: string;
  details: any;
  ipAddress: string | null;
  createdAt: string;
}

interface User {
  id: number;
  username: string;
}

export default function ActivityLogs() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const { data: logs, isLoading: logsLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity-logs"],
  });
  
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });
  
  // Get the username by userId
  const getUsernameById = (userId: number | null) => {
    if (!userId) return "System";
    const user = users?.find(u => u.id === userId);
    return user ? user.username : `User #${userId}`;
  };
  
  const handleMenuClick = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
  // Get action icon based on action type
  const getActionIcon = (action: string) => {
    switch (action) {
      case "upload":
        return <Upload className="h-4 w-4 text-blue-500" />;
      case "download":
        return <Download className="h-4 w-4 text-blue-500" />;
      case "share":
        return <Share2 className="h-4 w-4 text-green-600" />;
      case "unshare":
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case "view":
        return <Eye className="h-4 w-4 text-purple-600" />;
      case "delete":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "register":
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case "login":
        return <LogIn className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };
  
  // Get badge color based on action type
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "upload":
      case "download":
        return "default";
      case "share":
        return "success";
      case "view":
        return "secondary";
      case "delete":
      case "unshare":
        return "destructive";
      case "register":
      case "login":
        return "outline";
      default:
        return "default";
    }
  };
  
  // Filter logs based on search query and action filter
  const filteredLogs = logs?.filter(log => {
    const username = getUsernameById(log.userId);
    const matchesSearch = 
      username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ipAddress && log.ipAddress.includes(searchQuery));
      
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Paginate logs
  const paginatedLogs = filteredLogs?.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = filteredLogs ? Math.ceil(filteredLogs.length / pageSize) : 1;
  
  return (
    <div className="bg-gray-100 font-sans h-screen flex overflow-hidden">
      <Sidebar />
      
      {/* Mobile sidebar */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setShowMobileSidebar(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 flex flex-col z-40 w-64 bg-gray-800 text-white">
            <Sidebar />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={handleMenuClick} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                  <SelectItem value="share">Share</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="register">Register</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Card className="overflow-hidden mb-6">
            <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">System Activity</h2>
              <Button variant="ghost" size="icon">
                <Filter className="h-5 w-5 text-gray-500" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {(logsLoading || usersLoading) && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {paginatedLogs && paginatedLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery || actionFilter !== "all" ? 
                    "No logs match your search criteria." : 
                    "No activity logs found."}
                </div>
              )}
              
              {paginatedLogs && paginatedLogs.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Time</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Action</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Resource</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Details</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-600">
                            <div className="flex flex-col">
                              <span title={format(new Date(log.createdAt), "MMM d, yyyy 'at' h:mm a")}>
                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                              </span>
                              <span className="text-xs text-gray-400">
                                {format(new Date(log.createdAt), "h:mm a")}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold mr-3">
                                {getUsernameById(log.userId).charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{getUsernameById(log.userId)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={getActionBadgeVariant(log.action)}
                              className="flex items-center gap-1 capitalize"
                            >
                              {getActionIcon(log.action)}
                              <span>{log.action}</span>
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-600 capitalize">
                            {log.resourceType}
                            {log.resourceId && <span className="text-xs ml-1">#{log.resourceId}</span>}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {log.details?.filename && (
                              <span title={log.details.filename}>
                                {log.details.filename.length > 20 
                                  ? log.details.filename.substring(0, 20) + '...' 
                                  : log.details.filename}
                              </span>
                            )}
                            {log.details?.sharedWith && (
                              <span className="ml-1">
                                to <span className="font-medium">{log.details.sharedWith}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                            {log.ipAddress || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum;
                  
                  // Logic to show pages around current page
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  if (pageNum === 1 || pageNum === totalPages || 
                     (pageNum >= page - 1 && pageNum <= page + 1)) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setPage(pageNum)}
                          isActive={page === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  
                  // Show ellipsis for skipped pages
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return (
                      <PaginationItem key={`ellipsis-${pageNum}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </main>
      </div>
    </div>
  );
}
