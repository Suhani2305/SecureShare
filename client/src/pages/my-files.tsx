import { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Upload, Download, Share2, Trash2, Filter, List, Plus, X, Calendar, Check, CheckSquare, Square } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileIcon } from "@/components/file/file-icon";
import { format, subDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { UploadModal } from "@/components/modals/upload-modal";
import { ShareModal } from "@/components/modals/share-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { API_ENDPOINTS } from "@/lib/config";

interface FileItem {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  encrypted: boolean;
  ownerId: number;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function MyFiles() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [sizeFilter, setSizeFilter] = useState<string>("");
  const [encryptedFilter, setEncryptedFilter] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isBatchActionMenuOpen, setIsBatchActionMenuOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: files, isLoading, error } = useQuery<FileItem[]>({
    queryKey: [API_ENDPOINTS.FILES],
    onSuccess: (data) => {
      console.log("Files fetched successfully:", {
        count: data?.length,
        files: data?.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.mimeType
        }))
      });
    },
    onError: (error) => {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: "Failed to load files. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // File type categories
  const fileTypeCategories = {
    documents: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"],
    images: ["image/jpeg", "image/png", "image/gif", "image/svg+xml"],
    spreadsheets: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    archives: ["application/zip", "application/x-zip-compressed", "application/x-rar-compressed"],
    code: ["text/html", "application/javascript", "text/css", "application/json"]
  };
  
  // For file size filtering
  const fileSizeRanges = {
    small: { max: 1024 * 1024 }, // < 1MB
    medium: { min: 1024 * 1024, max: 10 * 1024 * 1024 }, // 1MB - 10MB
    large: { min: 10 * 1024 * 1024 } // > 10MB
  };
  
  // Update active filters whenever filter settings change
  useEffect(() => {
    const newActiveFilters: string[] = [];
    
    if (dateRange) {
      newActiveFilters.push(`Date: ${format(dateRange, "MMM d, yyyy")}`);
    }
    
    if (selectedFileTypes.length > 0) {
      newActiveFilters.push(`Types: ${selectedFileTypes.length} selected`);
    }
    
    if (sizeFilter) {
      newActiveFilters.push(`Size: ${sizeFilter}`);
    }
    
    if (encryptedFilter) {
      newActiveFilters.push(`Encrypted: ${encryptedFilter}`);
    }
    
    setActiveFilters(newActiveFilters);
  }, [dateRange, selectedFileTypes, sizeFilter, encryptedFilter]);
  
  const toggleFileType = (fileType: string) => {
    setSelectedFileTypes(prev => 
      prev.includes(fileType) 
        ? prev.filter(type => type !== fileType) 
        : [...prev, fileType]
    );
  };
  
  const clearAllFilters = () => {
    setDateRange(undefined);
    setSelectedFileTypes([]);
    setSizeFilter("");
    setEncryptedFilter("");
    setActiveFilters([]);
  };
  
  const removeFilter = (filter: string) => {
    if (filter.startsWith("Date:")) {
      setDateRange(undefined);
    } else if (filter.startsWith("Types:")) {
      setSelectedFileTypes([]);
    } else if (filter.startsWith("Size:")) {
      setSizeFilter("");
    } else if (filter.startsWith("Encrypted:")) {
      setEncryptedFilter("");
    }
  };
  
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return apiRequest("DELETE", `${API_ENDPOINTS.FILES}/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.FILES] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the file: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    },
  });
  
  const handleMenuClick = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
  const handleDeleteFile = async (fileId: number) => {
    if (confirm("Are you sure you want to delete this file? It will be moved to trash.")) {
      try {
        await apiRequest("DELETE", `/api/files/${fileId}`);
        toast({
          title: "File deleted",
          description: "The file has been moved to trash",
        });
        
        // Refresh the file list
        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.FILES] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the file: " + (error instanceof Error ? error.message : "Unknown error"),
          variant: "destructive",
        });
      }
    }
  };
  
  const handleShareFile = (file: FileItem) => {
    setSelectedFile(file);
    setIsShareModalOpen(true);
  };
  
  const toggleFileSelection = (fileId: number) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };
  
  const toggleSelectAllFiles = () => {
    if (filteredFiles && filteredFiles.length > 0) {
      if (selectedFileIds.length === filteredFiles.length) {
        // Unselect all
        setSelectedFileIds([]);
      } else {
        // Select all
        setSelectedFileIds(filteredFiles.map(file => file.id));
      }
    }
  };
  
  const handleBatchDelete = async () => {
    if (selectedFileIds.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedFileIds.length} files?`)) {
      try {
        // Create an array of delete promises
        const deletePromises = selectedFileIds.map(fileId => 
          apiRequest("DELETE", `${API_ENDPOINTS.FILES}/${fileId}`)
        );
        
        // Execute all delete operations
        await Promise.all(deletePromises);
        
        toast({
          title: "Files deleted",
          description: `Successfully deleted ${selectedFileIds.length} files`,
        });
        
        // Clear selection and exit select mode
        setSelectedFileIds([]);
        setIsSelectMode(false);
        
        // Refresh the file list
        queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.FILES] });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete selected files: " + (error instanceof Error ? error.message : "Unknown error"),
          variant: "destructive",
        });
      }
    }
  };
  
  const handleBatchDownload = () => {
    if (selectedFileIds.length === 0) return;
    
    // Create and download each file in sequence
    selectedFileIds.forEach(fileId => {
      window.open(`/api/files/${fileId}/download`, '_blank');
    });
    
    toast({
      title: "Download started",
      description: `Downloading ${selectedFileIds.length} files`,
    });
  };
  
  const getFileCategory = (mimeType: string): string => {
    for (const [category, mimeTypes] of Object.entries(fileTypeCategories)) {
      if (mimeTypes.some(type => mimeType.includes(type))) {
        return category;
      }
    }
    return "other";
  };
  
  const getFileSizeCategory = (size: number): string => {
    if (size < fileSizeRanges.small.max) return "small";
    if (size < fileSizeRanges.medium.max) return "medium";
    return "large";
  };
  
  const filteredFiles = files?.filter(file => {
    // Text search filter
    if (searchQuery && !file.originalName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Date filter
    if (dateRange) {
      const fileDate = new Date(file.createdAt);
      const filterDate = new Date(dateRange);
      
      // Set hours to 0 to compare just the dates
      fileDate.setHours(0, 0, 0, 0);
      filterDate.setHours(0, 0, 0, 0);
      
      if (fileDate.getTime() !== filterDate.getTime()) {
        return false;
      }
    }
    
    // File type filter
    if (selectedFileTypes.length > 0) {
      const fileCategory = getFileCategory(file.mimeType);
      if (!selectedFileTypes.includes(fileCategory)) {
        return false;
      }
    }
    
    // Size filter
    if (sizeFilter) {
      const fileSizeCategory = getFileSizeCategory(file.size);
      if (fileSizeCategory !== sizeFilter) {
        return false;
      }
    }
    
    // Encryption filter
    if (encryptedFilter === "yes" && !file.encrypted) {
      return false;
    } else if (encryptedFilter === "no" && file.encrypted) {
      return false;
    }
    
    return true;
  });
  
  const handleDownload = async (file: FileItem) => {
    try {
      // First try to download without password
      let response = await apiRequest("GET", `/api/files/${file.id}/download`);
      
      if (response.status === 401) {
        // If unauthorized, check if password is required
        const errorData = await response.json();
        if (errorData.requiresPassword) {
          const password = prompt("This file is password protected. Please enter the password:");
          if (!password) return;
          
          // Retry with password
          response = await apiRequest("GET", `/api/files/${file.id}/download?password=${encodeURIComponent(password)}`);
          if (!response.ok) {
            throw new Error(errorData.message || "Download failed");
          }
        }
      } else if (!response.ok) {
        throw new Error("Download failed");
      }
      
      // If we get here, the response is OK and we can download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      });
    }
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">My Files</h1>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Button 
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                <span>Upload</span>
              </Button>
            </div>
          </div>
          
          <Card className="overflow-hidden">
            <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">All Files</h2>
              <div className="flex">
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="mr-2 relative">
                      <Filter className="h-5 w-5 text-gray-500" />
                      {activeFilters.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {activeFilters.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Filters</h3>
                        {activeFilters.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs">
                            Clear all
                          </Button>
                        )}
                      </div>
                      
                      {/* Active filters */}
                      {activeFilters.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-2">
                          {activeFilters.map((filter, i) => (
                            <Badge key={i} variant="secondary" className="px-2 py-1">
                              {filter}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 ml-1" 
                                onClick={() => removeFilter(filter)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Date filter */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Date</h4>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`w-full justify-start text-left font-normal ${!dateRange ? "text-muted-foreground" : ""}`}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateRange ? format(dateRange, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateRange}
                              onSelect={setDateRange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* File type filter */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">File Type</h4>
                        <div className="space-y-2">
                          {Object.keys(fileTypeCategories).map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`type-${type}`} 
                                checked={selectedFileTypes.includes(type)}
                                onCheckedChange={() => toggleFileType(type)}
                              />
                              <label
                                htmlFor={`type-${type}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </label>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="type-other" 
                              checked={selectedFileTypes.includes("other")}
                              onCheckedChange={() => toggleFileType("other")}
                            />
                            <label
                              htmlFor="type-other"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Other
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      {/* Size filter */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Size</h4>
                        <Select value={sizeFilter} onValueChange={setSizeFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Any size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Any size</SelectItem>
                            <SelectItem value="small">Small (less than 1MB)</SelectItem>
                            <SelectItem value="medium">Medium (1MB - 10MB)</SelectItem>
                            <SelectItem value="large">Large (more than 10MB)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Encrypted filter */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Encrypted</h4>
                        <Select value={encryptedFilter} onValueChange={setEncryptedFilter}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All files" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All files</SelectItem>
                            <SelectItem value="yes">Encrypted only</SelectItem>
                            <SelectItem value="no">Non-encrypted only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsSelectMode(!isSelectMode)}
                >
                  <CheckSquare className={`h-5 w-5 ${isSelectMode ? "text-primary" : "text-gray-500"}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {error && (
                <div className="text-center py-8 text-red-500">
                  Failed to load files
                </div>
              )}
              
              {filteredFiles && filteredFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 
                    "No files match your search query." : 
                    "No files available. Upload some files to see them here."}
                  <div className="mt-4">
                    <Button 
                      onClick={() => setIsUploadModalOpen(true)}
                      className="flex items-center"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Files
                    </Button>
                  </div>
                </div>
              )}
              
              {filteredFiles && filteredFiles.length > 0 && (
                <div className="overflow-x-auto">
                  {/* Batch operation controls */}
                  {isSelectMode && selectedFileIds.length > 0 && (
                    <div className="p-4 bg-blue-50 border-b border-blue-100 flex flex-wrap items-center gap-3">
                      <span className="text-blue-700 font-semibold">
                        {selectedFileIds.length} files selected
                      </span>
                      <div className="flex gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center"
                          onClick={handleBatchDownload}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex items-center"
                          onClick={handleBatchDelete}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedFileIds([]);
                            setIsSelectMode(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        {isSelectMode && (
                          <th className="text-center py-3 px-4 w-10">
                            <div className="flex justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={toggleSelectAllFiles}
                              >
                                {filteredFiles && selectedFileIds.length === filteredFiles.length ? (
                                  <CheckSquare className="h-5 w-5 text-primary" />
                                ) : (
                                  <Square className="h-5 w-5 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </th>
                        )}
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">File Size</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Encrypted</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map((file) => (
                        <tr key={file.id} className="border-b border-gray-200 hover:bg-gray-50">
                          {isSelectMode && (
                            <td className="text-center py-3 px-4">
                              <div className="flex justify-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => toggleFileSelection(file.id)}
                                >
                                  {selectedFileIds.includes(file.id) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <FileIcon mimeType={file.mimeType} className="mr-3" />
                              <span className="font-medium">{file.originalName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {format(new Date(file.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{formatFileSize(file.size)}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {file.encrypted ? 
                              <span className="text-green-600">Yes</span> : 
                              <span className="text-yellow-600">No</span>
                            }
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Download"
                                onClick={() => handleDownload(file)}
                              >
                                <Download className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Share"
                                className="mx-1"
                                onClick={() => handleShareFile(file)}
                              >
                                <Share2 className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Delete"
                                onClick={() => handleDeleteFile(file.id)}
                              >
                                <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
      
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
      
      {selectedFile && (
        <ShareModal
          file={selectedFile}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
