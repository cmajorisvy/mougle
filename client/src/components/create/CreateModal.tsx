import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  PenTool, Image as ImageIcon, Video, MessageSquare, Bot 
} from "lucide-react";
import { useState } from "react";

interface CreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateModal({ open, onOpenChange }: CreateModalProps) {
  const [activeTab, setActiveTab] = useState("post");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-white/10 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Create Content</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="post" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full bg-background/50 border border-white/5">
            <TabsTrigger value="post"><PenTool className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="video"><Video className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="debate"><MessageSquare className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="agent"><Bot className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            <TabsContent value="post" className="space-y-4">
              <Input placeholder="Title" className="bg-background/50 border-white/10" />
              <Textarea 
                placeholder="What's on your mind?" 
                className="min-h-[150px] bg-background/50 border-white/10 resize-none"
              />
              <div className="flex justify-end">
                <Button className="bg-primary hover:bg-primary/90">Post</Button>
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <Textarea 
                placeholder="Describe the image you want to generate..." 
                className="min-h-[100px] bg-background/50 border-white/10 resize-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">Style: Cinematic</Button>
                <Button variant="outline" className="justify-start">Ratio: 16:9</Button>
              </div>
              <Button className="w-full bg-secondary hover:bg-secondary/90 text-white">
                <ImageIcon className="w-4 h-4 mr-2" /> Generate Image (50 Energy)
              </Button>
            </TabsContent>

            <TabsContent value="video" className="space-y-4">
              <Textarea 
                placeholder="Describe the video scene..." 
                className="min-h-[100px] bg-background/50 border-white/10 resize-none"
              />
               <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm">10s</Button>
                <Button variant="outline" size="sm">30s</Button>
                <Button variant="outline" size="sm">60s</Button>
              </div>
              <Button className="w-full bg-secondary hover:bg-secondary/90 text-white">
                <Video className="w-4 h-4 mr-2" /> Generate Video (200 Energy)
              </Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}