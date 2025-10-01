import { Link, useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { useQuery } from "@tanstack/react-query";
import DarkModeToggle from "./DarkModeToggle";
import Auth from "./Auth";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  username: string;
  credits: number;
}

const Navbar = () => {
  const [location, setLocation] = useLocation();
  const { apisConnected } = useAppContext();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  const handleBuyCredits = () => {
    if (user) {
      // User is logged in, go to checkout
      setLocation("/checkout");
    } else {
      // User not logged in, trigger auth dialog
      setShowAuthDialog(true);
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {/* Logo */}
              <div className="flex items-center space-x-2">
                <i className="ri-brain-line text-primary text-2xl"></i>
                <span className="font-semibold text-lg">Genius Dictation</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:ml-8 md:flex md:space-x-6">
              <Link href="/" className={`${location === "/" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                Dictation
              </Link>
              <Link href="/documents" className={`${location === "/documents" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                Documents
              </Link>
              <Link href="/gpt-bypass" className={`${location === "/gpt-bypass" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                GPT Bypass
              </Link>
              <Link href="/checkout" className={`${location === "/checkout" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                Get Credits
              </Link>
              <Link href="/style-library" className={`${location === "/style-library" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                Style Library
              </Link>
              <Link href="/content-library" className={`${location === "/content-library" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                Content Library
              </Link>
              <Link href="/settings" className={`${location === "/settings" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"} px-1 py-2 text-sm font-medium`}>
                Settings
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
            
            {/* Buy Credits Button */}
            <Button 
              onClick={handleBuyCredits}
              className="font-semibold"
              data-testid="button-buy-credits"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Buy Credits
            </Button>
            
            {/* Authentication */}
            <Auth showDialog={showAuthDialog} onDialogChange={setShowAuthDialog} />
            
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
