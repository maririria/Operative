"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function RoleBasedNavbar() {
  const [roles, setRoles] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isLoggingOut) {
          if (event === "SIGNED_OUT" || event === "USER_DELETED") {
            setRoles([]);
            setIsAdmin(false);
            setUserEmail("");
            router.push("/login");
          } else if (event === "SIGNED_IN" && session) {
            await fetchUserProfile(session.user.id);
          } else if (event === "TOKEN_REFRESHED") {
            await fetchUserData();
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, isLoggingOut]);

  const fetchUserProfile = async (userId) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, roles, employee_code")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          await supabase.auth.signOut();
          router.push("/login");
        }
        return;
      }

      const arrayRoles = Array.isArray(profile.roles) ? profile.roles : (profile.roles ? [profile.roles] : []);
      const adminFlag = profile.role === "admin" || arrayRoles.includes("admin");

      setIsAdmin(adminFlag);
      setRoles(arrayRoles.filter(r => r !== "admin"));

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || "");
    } catch (err) {
      console.error("Error fetching user profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthAndRedirect = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return false;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return false;
      }
      
      setUserEmail(user.email || '');
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, roles, employee_code')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const employeeCode = user.email.split('@')[0];
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            employee_code: employeeCode,
            role: 'worker',
            roles: ['printing']
          });

        if (insertError) {
          await supabase.auth.signOut();
          router.push('/login');
          return false;
        }
        
        setIsAdmin(false);
        setRoles(['printing']);
        return true;
      } else if (error) {
        await supabase.auth.signOut();
        router.push('/login');
        return false;
      }

      const arrayRoles = Array.isArray(profile.roles) ? 
        profile.roles : 
        (profile.roles ? [profile.roles] : []);
      
      const adminFlag = profile.role === 'admin' || arrayRoles.includes('admin');
      
      setIsAdmin(adminFlag);
      setRoles(arrayRoles.filter(r => r !== 'admin'));
      return true;
      
    } catch (err) {
      router.push('/login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserData = async () => {
    await checkAuthAndRedirect();
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Main pages to show in horizontal navbar
  const mainPages = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Job Form", path: "/main/jobForm" },
    { name: "Pre-Press", path: "/pre_press" },
    { name: "Printing", path: "/printing" },
    { name: "Pasting", path: "/pasting" },
    { name: "Sorting", path: "/sorting" },
    { name: "Reports", path: "/reports" },
    { name: "MachineInfo", path: "/machineinfo" },

  ];

  // Additional pages to show only in the side menu
  const additionalPages = [
    { name: "Plates", path: "/plates" },
    { name: "Card Cutting", path: "/card_cutting" },
    { name: "Varnish", path: "/varnish" },
    { name: "Lamination", path: "/lamination" },
    { name: "Joint", path: "/joint" },
    { name: "Die Cutting", path: "/die_cutting" },
    { name: "Foil", path: "/foil" },
    { name: "Screen Printing", path: "/screen_printing" },
    { name: "Embose", path: "/embose" },
    { name: "Double Tape", path: "/double_tape" },
  ];

  // Role → page map
  const roleToPage = {
    printing:     { name: "Printing", path: "/printing" },
    cutting:      { name: "Cutting", path: "/cutting" },
    pasting:      { name: "Pasting", path: "/pasting" },
    lamination:   { name: "Lamination", path: "/lamination" },
    prepress:     { name: "Pre-Press", path: "/pre_press" },
    plates:       { name: "Plates", path: "/plates" },
    card_cutting: { name: "Card Cutting", path: "/card_cutting" },
    sorting:      { name: "Sorting", path: "/sorting" },
    machineinfo:  { name: "MachineInfo", path: "/machineinfo" },
  };

  const workerPages = roles
    .map(r => roleToPage[r])
    .filter(Boolean);

  // Pages to show in horizontal navbar
  const navbarPages = isAdmin ? mainPages : workerPages.slice(0, 7);
  
  // All pages to show in side menu
  const allMenuPages = isAdmin ? [...mainPages, ...additionalPages] : workerPages;

  const panelTitle = isAdmin
    ? "ADMIN PANEL"
    : (roles.length === 1 ? `${(roles[0] || "").toUpperCase()} PANEL` : "WORKER PANEL");

  if (isLoading) {
    return (
      <div className="bg-blue-500 text-white py-3 px-4">
        <div className="flex justify-between items-center">
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin && roles.length === 0) {
    return (
      <div className="bg-blue-500 text-white py-3 px-4">
        <div className="flex justify-between items-center">
          <span className="text-sm">Redirecting to login...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Left Side Menu */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-blue-500 text-white z-50
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-blue-600 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Navigation Menu</h2>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="text-white hover:text-blue-200 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="overflow-y-auto h-full pb-20">
          <div className="p-4">
            <div className="mb-6">
              <h3 className="text-sm uppercase tracking-wider text-blue-200 mb-3">Main Pages</h3>
              <div className="space-y-2">
                {allMenuPages.map((page) => (
                  <Link
                    key={page.path}
                    href={page.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-2 rounded text-sm transition-colors ${
                      pathname === page.path
                        ? "bg-blue-700 text-white font-medium shadow-md" // Darker blue for active page
                        : "text-white hover:bg-blue-600" // Lighter blue for hover
                    }`}
                  >
                    {page.name}
                  </Link>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-blue-600">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-blue-200">Logged in as: {(userEmail || "").split("@")[0]}</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  isLoggingOut 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-blue-700 text-white hover:bg-blue-800"
                }`}
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Navbar */}
      <div className="bg-blue-500 text-white py-3 px-4 relative z-50">
        <div className="flex justify-between items-center">
          {/* Left - Title and Menu Button */}
          <div className="flex items-center gap-4">
            {/* 3-line menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded hover:bg-blue-600 flex flex-col justify-center items-center w-8 h-8 transition-colors"
              aria-label="Menu"
            >
              <span className="block h-0.5 w-6 bg-white mb-1"></span>
              <span className="block h-0.5 w-6 bg-white mb-1"></span>
              <span className="block h-0.5 w-6 bg-white"></span>
            </button>
            
            <span className="text-sm font-medium">{panelTitle}</span>
          </div>

          {/* Center - Links (hidden on mobile) */}
          <div className="hidden md:flex gap-2 flex-wrap">
            {navbarPages.map((page) => (
              <Link
                key={page.path}
                href={page.path}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  pathname === page.path
                    ? "bg-blue-700 text-white font-medium shadow-md" // Darker blue for active page
                    : "bg-blue-400 text-white hover:bg-blue-600" // Lighter blue for other pages
                }`}
              >
                {page.name}
              </Link>
            ))}
          </div>

          {/* Right - user + logout */}
          <div className="flex items-center gap-3">
            <span className="text-xs md:inline text-blue-100">
              {(userEmail || "").split("@")[0]}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                isLoggingOut 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isLoggingOut ? "..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}