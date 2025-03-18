import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import { 
  Shield, 
  Home, 
  File, 
  Share, 
  Users, 
  Clock, 
  Trash,
  UserCheck,
  BarChart2,
  Settings,
  LogOut
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  return (
    <aside className="bg-gray-800 text-white w-64 flex-shrink-0 hidden md:flex md:flex-col justify-between transition-all duration-300 ease-in-out h-screen">
      <div>
        <div className="p-4 flex items-center">
          <Shield className="h-6 w-6 text-purple-400 mr-2" />
          <h1 className="text-xl font-bold">SecureFiles</h1>
        </div>
        
        <nav className="mt-4">
          <NavLink href="/" icon={<Home size={18} />} label="Dashboard" isActive={location === "/"} />
          <NavLink href="/my-files" icon={<File size={18} />} label="My Files" isActive={location === "/my-files"} />
          <NavLink href="/shared-files" icon={<Share size={18} />} label="Shared with Me" isActive={location === "/shared-files"} />
          <NavLink href="/mfa-setup" icon={<Shield size={18} />} label="Security Settings" isActive={location === "/mfa-setup"} />
          <NavLink href="/team-files" icon={<Users size={18} />} label="Team Files" isActive={location === "/team-files"} />
          <NavLink href="/" icon={<Clock size={18} />} label="Recent" isActive={location === "/"} />
          <NavLink href="/trash" icon={<Trash size={18} />} label="Trash" isActive={location === "/trash"} />
          
          {user?.role === "admin" && (
            <>
              <div className="pt-4 pb-2 px-4 border-t border-gray-700 mt-4">
                <p className="text-xs text-gray-400 uppercase">Administration</p>
              </div>
              <NavLink 
                href="/admin/users" 
                icon={<UserCheck size={18} />} 
                label="User Management" 
                isActive={location === "/admin/users"} 
              />
              <NavLink 
                href="/admin/activity-logs" 
                icon={<BarChart2 size={18} />} 
                label="Activity Logs" 
                isActive={location === "/admin/activity-logs"} 
              />
              <NavLink href="/admin/settings" icon={<Settings size={18} />} label="Settings" isActive={location === "/admin/settings"} />
            </>
          )}
        </nav>
      </div>
      
      <div className="bg-gray-900 p-4">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold">
            {user?.username?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user?.username || "User"}</p>
            <p className="text-xs text-gray-400">{user?.role || "User"}</p>
          </div>
          <button 
            className="ml-auto text-gray-400 hover:text-white"
            onClick={logout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavLink({ href, icon, label, isActive }: NavLinkProps) {
  return (
    <Link href={href}>
      <a 
        className={cn(
          "block py-2.5 px-4 rounded transition duration-200 flex items-center",
          isActive ? "bg-gray-900 text-white" : "hover:bg-gray-700"
        )}
      >
        <span className="w-6">{icon}</span>
        <span>{label}</span>
      </a>
    </Link>
  );
}
