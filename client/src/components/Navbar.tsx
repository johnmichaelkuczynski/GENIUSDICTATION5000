import { Link, useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import DarkModeToggle from "./DarkModeToggle";

const Navbar = () => {
  const [location] = useLocation();
  const { apisConnected } = useAppContext();

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {/* Logo */}
              <div className="flex items-center space-x-2">
                <i className="ri-voiceprint-fill text-primary text-2xl"></i>
                <span className="font-semibold text-lg">VoiceForge</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-6">
              <Link href="/">
                <a className={`${location === "/" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                  Dictation
                </a>
              </Link>
              <Link href="/documents">
                <a className={`${location === "/documents" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                  Documents
                </a>
              </Link>
              <Link href="/style-library">
                <a className={`${location === "/style-library" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                  Style Library
                </a>
              </Link>
              <Link href="/settings">
                <a className={`${location === "/settings" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                  Settings
                </a>
              </Link>
            </nav>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* API Status Indicator */}
            <div className="flex items-center space-x-1">
              <div className={`h-2 w-2 rounded-full ${apisConnected ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-xs text-muted-foreground">
                {apisConnected ? "APIs Connected" : "APIs Disconnected"}
              </span>
            </div>
            
            {/* Dark mode toggle */}
            <DarkModeToggle />
            
            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-accent/10 focus:outline-none">
              <i className="ri-menu-line text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
