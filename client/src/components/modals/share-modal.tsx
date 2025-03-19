import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: number;
    originalName: string;
  };
}

export function ShareModal({ isOpen, onClose, file }: ShareModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [accessLevel, setAccessLevel] = useState("view");
  const [expiresAt, setExpiresAt] = useState("");

  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/files/${file.id}/share`, {
        method: "POST",
        body: JSON.stringify({
          userId: parseInt(userId),
          accessLevel,
          expiresAt: expiresAt || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to share file");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Success",
        description: "File shared successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to share file: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    },
  });

  const handleShare = () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "Please select a user to share with",
        variant: "destructive",
      });
      return;
    }
    shareMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share File</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>File Name</Label>
            <Input value={file?.originalName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Share with User ID</Label>
            <Input
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>
          <div className="space-y-2">
            <Label>Access Level</Label>
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View Only</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Expires At (Optional)</Label>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={shareMutation.isPending}>
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
