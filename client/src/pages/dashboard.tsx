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
    <div className="bg-slate-50 font-sans h-screen flex overflow-hidden">
      <Sidebar />
      
      {/* Mobile sidebar */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowMobileSidebar(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 flex flex-col z-40 w-56">
            <Sidebar />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={handleMenuClick} />
        
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            
            <div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center shadow-sm transition-colors"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload className="mr-2 h-5 w-5" />
                <span>Upload Files</span>
              </Button>
            </div>
          </div>
          
          {/* Storage Stats */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <StorageStats />
            <FileStats 
              total={files?.length || 0}
              documents={files?.filter(f => f.mimeType.startsWith('application/')).length || 0}
              images={files?.filter(f => f.mimeType.startsWith('image/')).length || 0}
              other={files?.filter(f => !f.mimeType.startsWith('application/') && !f.mimeType.startsWith('image/')).length || 0}
            />
            <SecurityStats />
          </div>
          
          {/* Recent Activity and Quick Access */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <ActivityList />
            <QuickAccess />
          </div>
          
          {/* Recent Files */}
          <div className="mb-8">
            <RecentFiles />
          </div>
          
          {/* Team Members Security Status - only for admins */}
          {user?.role === "admin" && (
            <div className="mb-8">
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
