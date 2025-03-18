import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { StorageStats, FileStats, SecurityStats } from "@/components/dashboard/stats-card";
import { ActivityList } from "@/components/dashboard/activity-list";
import { QuickAccess } from "@/components/dashboard/quick-access";
import { RecentFiles } from "@/components/dashboard/recent-files";
import { TeamSecurity } from "@/components/dashboard/team-security";
import { UploadModal } from "@/components/modals/upload-modal";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useAuth } from "@/utils/auth";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { user } = useAuth();
  
  const { data: files, isLoading: isLoadingFiles } = useQuery({
    queryKey: ["/api/files"],
    enabled: !!user,
  });

  const handleMenuClick = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            
            <div>
              <Button 
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                <span>Upload Files</span>
              </Button>
            </div>
          </div>
          
          {/* Storage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StorageStats />
            <FileStats 
              total={files?.length || 0}
              documents={files?.filter(f => f.type.startsWith('application/')).length || 0}
              images={files?.filter(f => f.type.startsWith('image/')).length || 0}
              other={files?.filter(f => !f.type.startsWith('application/') && !f.type.startsWith('image/')).length || 0}
            />
            <SecurityStats />
          </div>
          
          {/* Recent Activity and Quick Access */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ActivityList />
            <QuickAccess />
          </div>
          
          {/* Recent Files */}
          <div className="mb-6">
            <RecentFiles />
          </div>
          
          {/* Team Members Security Status - only for admins */}
          {user?.role === "admin" && (
            <div>
              <TeamSecurity />
            </div>
          )}
        </main>
      </div>
      
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </div>
  );
}
