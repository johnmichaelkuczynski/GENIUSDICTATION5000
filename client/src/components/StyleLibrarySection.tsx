import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";

interface StyleReference {
  id: number;
  name: string;
  description: string;
  active: boolean;
  documentCount: number;
}

const StyleLibrarySection = () => {
  const { styleReferences, setStyleReferences } = useAppContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleDescription, setNewStyleDescription] = useState("");

  const toggleStyleActive = (id: number) => {
    setStyleReferences(
      styleReferences.map((style) =>
        style.id === id ? { ...style, active: !style.active } : style
      )
    );
  };

  const addNewStyle = () => {
    if (newStyleName.trim() === "") return;
    
    const newStyle: StyleReference = {
      id: Date.now(),
      name: newStyleName,
      description: newStyleDescription,
      active: false,
      documentCount: 0,
    };
    
    setStyleReferences([...styleReferences, newStyle]);
    setNewStyleName("");
    setNewStyleDescription("");
    setIsAddDialogOpen(false);
  };

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Personal Style Library</h2>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center" size="sm">
                  <i className="ri-add-line mr-1"></i> Add Reference
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Style Reference</DialogTitle>
                  <DialogDescription>
                    Create a new style reference to use for text transformation
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Style Name</Label>
                    <Input 
                      id="name" 
                      value={newStyleName} 
                      onChange={(e) => setNewStyleName(e.target.value)} 
                      placeholder="e.g., Technical Documentation"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={newStyleDescription} 
                      onChange={(e) => setNewStyleDescription(e.target.value)} 
                      placeholder="Describe the key characteristics of this style"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={addNewStyle}>Add Style</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Style References */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styleReferences.map((style) => (
              <div key={style.id} className="border rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-sm">{style.name}</h3>
                    <span 
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        style.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {style.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Based on {style.documentCount} reference document{style.documentCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs line-clamp-3">{style.description}</p>
                  <div className="flex justify-end mt-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => toggleStyleActive(style.id)}
                    >
                      {style.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Add New Style Card */}
            <div className="border border-dashed rounded-lg overflow-hidden flex items-center justify-center h-full py-8">
              <Button 
                variant="ghost" 
                className="flex flex-col items-center text-muted-foreground hover:text-primary"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <i className="ri-add-circle-line text-2xl mb-2"></i>
                <span className="text-xs">Add New Style Reference</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default StyleLibrarySection;
