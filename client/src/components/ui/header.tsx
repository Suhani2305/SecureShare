import { useState } from "react";
import { Menu, Search, Bell, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { user } = useAuth();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
  };
  
  return (
    <header className="bg-white border-b border-gray-200 flex items-center justify-between px-6 py-3">
      <div className="flex items-center md:hidden">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-gray-500">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      <form onSubmit={handleSearch} className="relative w-full max-w-md hidden md:block">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input 
          type="text" 
          className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
          placeholder="Search files and folders..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>
      
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="text-gray-500 mr-2">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500 mr-4">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <div className="md:hidden h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}
