import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  useGetMe, 
  useLogout, 
  useListChannels, 
  useCreateChannel, 
  useListMessages, 
  useSendMessage,
  getListMessagesQueryKey,
  getListChannelsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Hash, Plus, Settings, LogOut, Send, Loader2, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ChatApp() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [messageContent, setMessageContent] = useState("");

  const { data: user, isLoading: isAuthLoading, error: authError } = useGetMe();
  const logoutMutation = useLogout();
  
  const { data: channels = [], isLoading: isChannelsLoading } = useListChannels({
    query: { refetchInterval: 5000 }
  });
  
  const createChannelMutation = useCreateChannel();

  const { data: messages = [], isLoading: isMessagesLoading } = useListMessages(
    activeChannelId || 0, 
    { 
      query: { 
        enabled: !!activeChannelId, 
        queryKey: getListMessagesQueryKey(activeChannelId || 0),
        refetchInterval: 3000
      } 
    }
  );

  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    if (!isAuthLoading && (authError || !user)) {
      setLocation("/");
    }
  }, [user, isAuthLoading, authError, setLocation]);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const handleCreateChannel = (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    
    createChannelMutation.mutate({ data: { name: newChannelName.trim() } }, {
      onSuccess: (newChannel) => {
        queryClient.invalidateQueries({ queryKey: getListChannelsQueryKey() });
        setNewChannelName("");
        setIsCreateChannelOpen(false);
        setActiveChannelId(newChannel.id);
      }
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageContent.trim() || !activeChannelId) return;

    const content = messageContent;
    setMessageContent("");

    sendMessageMutation.mutate({ 
      channelId: activeChannelId, 
      data: { content } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeChannelId) });
      },
      onError: () => {
        setMessageContent(content);
      }
    });
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/30">
      {/* Server Sidebar (Thin) */}
      <div className="w-[72px] bg-[hsl(228,6%,15%)] flex flex-col items-center py-3 gap-2 flex-shrink-0 z-20">
        <div className="w-12 h-12 bg-primary rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center cursor-pointer text-white shadow-md">
          <Hash className="w-6 h-6" />
        </div>
        <div className="w-8 h-[2px] bg-[hsl(220,7%,18%)] rounded-full mx-auto my-1" />
        
        {/* Placeholder for server icons */}
        <div className="w-12 h-12 bg-[hsl(220,7%,18%)] rounded-[24px] hover:rounded-[16px] hover:bg-primary transition-all duration-200 flex items-center justify-center cursor-pointer text-foreground hover:text-white">
          <div className="font-semibold">HC</div>
        </div>
      </div>

      {/* Channels Sidebar */}
      <div className="w-60 bg-sidebar flex flex-col flex-shrink-0">
        <div className="h-12 border-b border-sidebar-border flex items-center px-4 font-semibold text-foreground shadow-sm z-10">
          Home Server
        </div>
        
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="flex items-center justify-between px-2 mb-1 group">
            <span className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">Text Channels</span>
            <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
              <DialogTrigger asChild>
                <button className="text-sidebar-foreground hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </button>
              </DialogTrigger>
              <DialogContent className="bg-popover border-popover-border text-foreground sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateChannel} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase font-bold text-muted-foreground">Channel Name</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="name" 
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                        className="pl-9 bg-input border-0 focus-visible:ring-1 focus-visible:ring-ring" 
                        placeholder="new-channel"
                        autoFocus
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsCreateChannelOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={!newChannelName.trim() || createChannelMutation.isPending}>
                      Create Channel
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-[2px]">
            {isChannelsLoading ? (
              <div className="px-2 py-1 text-sm text-sidebar-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-base transition-colors ${
                  activeChannelId === channel.id 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-[hsl(223,7%,25%)] hover:text-foreground"
                }`}
              >
                <Hash className="w-5 h-5 text-sidebar-foreground opacity-70" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* User Panel */}
        <div className="h-[52px] bg-[hsl(228,6%,14%)] flex items-center justify-between px-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-white/10 cursor-pointer overflow-hidden flex-1 mr-2">
            <Avatar className="h-8 w-8 border-2 border-transparent">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary text-white text-xs">{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold leading-tight truncate">{user.displayName}</span>
              <span className="text-[11px] text-muted-foreground leading-tight truncate">@{user.username}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-white/10 hover:text-foreground transition-colors" title="Log out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Chat Header */}
        <div className="h-12 border-b border-border flex items-center px-4 shadow-sm flex-shrink-0">
          {activeChannel && (
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Hash className="w-6 h-6 text-muted-foreground" />
              <span>{activeChannel.name}</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4">
            {!activeChannelId ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground mt-20">
                <Hash className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a channel to start chatting</p>
              </div>
            ) : isMessagesLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="mt-10 mb-4">
                <div className="w-16 h-16 bg-sidebar rounded-full flex items-center justify-center mb-4">
                  <Hash className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Welcome to #{activeChannel?.name}!</h1>
                <p className="text-muted-foreground text-base">This is the start of the #{activeChannel?.name} channel.</p>
              </div>
            ) : (
              messages.map((message, idx) => {
                const prevMessage = idx > 0 ? messages[idx - 1] : null;
                const isSameUser = prevMessage && prevMessage.userId === message.userId;
                const isRecent = prevMessage && (new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 5 * 60 * 1000);
                const compact = isSameUser && isRecent;

                return (
                  <div key={message.id} className={`flex gap-4 hover:bg-black/5 px-2 py-0.5 rounded -mx-2 ${compact ? "mt-0" : "mt-4"}`}>
                    {!compact ? (
                      <Avatar className="h-10 w-10 mt-0.5 cursor-pointer hover:opacity-80">
                        <AvatarImage src={message.avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary text-white">{message.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-10 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-[10px] text-muted-foreground">{format(new Date(message.createdAt), "HH:mm")}</span>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {!compact && (
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-medium text-foreground hover:underline cursor-pointer">{message.displayName}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(message.createdAt), "MM/dd/yyyy HH:mm")}</span>
                        </div>
                      )}
                      <p className="text-[15px] text-foreground leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <Input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder={activeChannel ? `Message #${activeChannel.name}` : "Select a channel..."}
              disabled={!activeChannelId}
              className="w-full bg-[hsl(216,7%,14%)] border-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground h-[44px] px-4 rounded-lg"
            />
            <Button 
              type="submit" 
              size="icon"
              variant="ghost"
              disabled={!messageContent.trim() || !activeChannelId || sendMessageMutation.isPending}
              className="absolute right-1 h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
