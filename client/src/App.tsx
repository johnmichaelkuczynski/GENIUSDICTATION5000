import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Documents from "@/pages/Documents";
import StyleLibrary from "@/pages/StyleLibrary";
import ContentLibrary from "@/pages/ContentLibrary";
import Settings from "@/pages/Settings";
import Navbar from "@/components/Navbar";
import { AppProvider } from "./context/AppContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/documents" component={Documents} />
      <Route path="/style-library" component={StyleLibrary} />
      <Route path="/content-library" component={ContentLibrary} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <div className="bg-background min-h-screen">
            <Navbar />
            <Toaster />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <Router />
            </main>
          </div>
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
