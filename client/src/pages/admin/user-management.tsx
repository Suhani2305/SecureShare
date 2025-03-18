import { useState } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Edit, XCircle, RefreshCw, Shield, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export default function UserManagement() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedRole, setEditedRole] = useState("user");
  const { toast } = useToast();

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });
  
  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: () => {
      toast({
        title: "User added",
        description: "The new user has been added successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsAddUserModalOpen(false);
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "user",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add user: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });
  
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number, role: string }) => {
      // This is a placeholder - in a real application, there would be an API endpoint to update user roles
      return apiRequest("PATCH", `/api/admin/users/${userId}`, { role });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user role has been updated successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const handleMenuClick = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };
  
  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    addUserMutation.mutate(newUser);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditedRole(user.role);
    setIsEditModalOpen(true);
  };
  
  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    updateUserMutation.mutate({
      userId: selectedUser.id,
      role: editedRole,
    });
  };
  
  const handleResetPassword = (userId: number) => {
    // This would be implemented with a real API endpoint in a production application
    toast({
      title: "Password Reset",
      description: "Password reset functionality would be implemented in production",
    });
  };
  
  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={() => setIsAddUserModalOpen(true)}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Add User</span>
              </Button>
            </div>
          </div>
          
          <Card className="overflow-hidden">
            <CardHeader className="flex justify-between items-center p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Users</h2>
              <Button variant="ghost" size="icon">
                <Filter className="h-5 w-5 text-gray-500" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {error && (
                <div className="text-center py-8 text-red-500">
                  Failed to load users
                </div>
              )}
              
              {filteredUsers && filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 
                    "No users match your search query." : 
                    "No users found."}
                </div>
              )}
              
              {filteredUsers && filteredUsers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold mr-3">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{user.username}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{user.email}</td>
                          <td className="py-3 px-4">
                            <Badge 
                              variant={user.role === "admin" ? "warning" : "success"}
                              className="capitalize"
                            >
                              {user.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Edit User"
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Reset Password"
                                className="mx-1"
                                onClick={() => handleResetPassword(user.id)}
                              >
                                <RefreshCw className="h-4 w-4 text-gray-500 hover:text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Disable User"
                                disabled
                              >
                                <XCircle className="h-4 w-4 text-gray-500 hover:text-red-500" />
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
      
      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={(open) => !open && setIsAddUserModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value})}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleAddUser}
              disabled={addUserMutation.isPending}
            >
              {addUserMutation.isPending ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Modal */}
      {selectedUser && (
        <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && setIsEditModalOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User: {selectedUser.username}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={selectedUser.username}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  value={selectedUser.email}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editedRole}
                  onValueChange={setEditedRole}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
