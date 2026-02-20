import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentUserId } from "@/lib/mockData";
import {
  MessageSquare, Mic, Brain, CheckSquare, Wifi, DollarSign,
  Send, Plus, Trash2, Check, X, Volume2, AlertTriangle,
  Clock, Loader2, Settings, Download, Shield, Zap,
  Home, Briefcase, GraduationCap, Wallet, BookOpen,
  Star, ChevronRight, RefreshCw, Power, Lock,
  Calendar, Bell, Edit2, MoreVertical, Play
} from "lucide-react";

type Tab = "chat" | "voice" | "memory" | "truth" | "tasks" | "devices" | "finance";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "chat", label: "Interaction", icon: MessageSquare },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "truth", label: "Truth Core", icon: Shield },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "devices", label: "Devices", icon: Wifi },
  { id: "finance", label: "Finance", icon: DollarSign },
];

const DOMAIN_ICONS: Record<string, any> = {
  personal: Home, work: Briefcase, study: GraduationCap,
  home: Home, finance: Wallet, conversation: MessageSquare,
};

const DOMAIN_COLORS: Record<string, string> = {
  personal: "text-blue-400", work: "text-purple-400", study: "text-green-400",
  home: "text-orange-400", finance: "text-yellow-400", conversation: "text-cyan-400",
};

function fetchPA(path: string, userId: string, options?: RequestInit) {
  return fetch(`/api/personal-agent${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "x-user-id": userId, ...(options?.headers || {}) },
  }).then(async r => {
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: "Request failed" }));
      throw { status: r.status, ...err };
    }
    return r.json();
  });
}

export default function MyPersonalAgent() {
  const [tab, setTab] = useState<Tab>("chat");
  const userId = getCurrentUserId();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading, isError, error } = useQuery({
    queryKey: ["pa-dashboard", userId],
    queryFn: () => fetchPA("/dashboard", userId!),
    enabled: !!userId,
    retry: false,
  });

  if (!userId) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center" data-testid="pa-login-required">
          <div className="text-center max-w-md mx-auto p-8">
            <Lock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
            <p className="text-gray-400 mb-6">Please sign in to access your Personal Intelligence.</p>
            <Button onClick={() => window.location.href = "/auth/signin"} data-testid="button-signin">Sign In</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isError && (error as any)?.status === 403) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center" data-testid="pa-pro-required">
          <div className="text-center max-w-md mx-auto p-8">
            <Star className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Pro Feature</h2>
            <p className="text-gray-400 mb-6">Personal Intelligence is available exclusively for Pro users. Upgrade to unlock your personal intelligence layer.</p>
            <Button onClick={() => window.location.href = "/billing"} className="bg-yellow-600 hover:bg-yellow-700" data-testid="button-upgrade">Upgrade to Pro</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <div className="max-w-7xl mx-auto px-4 py-6 w-full flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-pa-title">Personal Intelligence</h1>
              <p className="text-gray-400 text-sm mt-1">{dashboard?.profile?.agentName || "Personal Intelligence"} • Pro</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-green-400 border-green-800" data-testid="badge-messages-remaining">
                <MessageSquare className="w-3 h-3 mr-1" />{dashboard?.stats?.messagesRemaining || 0} msgs left
              </Badge>
              <Badge variant="outline" className="text-purple-400 border-purple-800" data-testid="badge-voice-remaining">
                <Mic className="w-3 h-3 mr-1" />{dashboard?.stats?.voiceRemaining || 0} voice left
              </Badge>
            </div>
          </div>

          {dashboard?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 shrink-0">
              <StatCard label="Memories" value={dashboard.stats.confirmedMemories} icon={Brain} color="text-blue-400" testId="stat-memories" />
              <StatCard label="Conversations" value={dashboard.stats.totalConversations} icon={MessageSquare} color="text-cyan-400" testId="stat-conversations" />
              <StatCard label="Pending Tasks" value={dashboard.stats.pendingTasks} icon={CheckSquare} color="text-orange-400" testId="stat-pending-tasks" />
              <StatCard label="Completed" value={dashboard.stats.completedTasks} icon={Check} color="text-green-400" testId="stat-completed-tasks" />
              <StatCard label="Devices" value={dashboard.stats.connectedDevices} icon={Wifi} color="text-purple-400" testId="stat-devices" />
              <StatCard label="Upcoming Bills" value={dashboard.stats.upcomingBills} icon={DollarSign} color="text-yellow-400" testId="stat-bills" />
            </div>
          )}

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 shrink-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`tab-${t.id}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                  tab === t.id ? "bg-blue-600 text-white" : "bg-[#1a1a2e] text-gray-400 hover:bg-[#252545] hover:text-white"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 pb-16 md:pb-0">
            {tab === "chat" && <ChatTab userId={userId} />}
            {tab === "voice" && <VoiceTab userId={userId} />}
            {tab === "memory" && <MemoryTab userId={userId} />}
            {tab === "truth" && <TruthCoreTab userId={userId} dashboard={dashboard} />}
            {tab === "tasks" && <TasksTab userId={userId} />}
            {tab === "devices" && <DevicesTab userId={userId} />}
            {tab === "finance" && <FinanceTab userId={userId} />}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, color, testId }: { label: string; value: number; icon: any; color: string; testId: string }) {
  return (
    <div className="bg-[#1a1a2e] rounded-lg p-3 border border-gray-800" data-testid={testId}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function ChatTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["pa-conversations", userId],
    queryFn: () => fetchPA("/conversations", userId),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["pa-messages", activeConv],
    queryFn: () => fetchPA(`/conversations/${activeConv}/messages`, userId),
    enabled: !!activeConv,
  });

  const createConvMutation = useMutation({
    mutationFn: () => fetchPA("/conversations", userId, { method: "POST", body: JSON.stringify({ title: "New Interaction" }) }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["pa-conversations"] });
      setActiveConv(conv.id);
    },
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => fetchPA("/chat", userId, { method: "POST", body: JSON.stringify({ conversationId: activeConv, message: msg }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-messages", activeConv] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: (id: string) => fetchPA(`/conversations/${id}`, userId, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-conversations"] });
      setActiveConv(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || !activeConv) return;
    const msg = message;
    setMessage("");
    chatMutation.mutate(msg);
  };

  return (
    <div className="grid grid-cols-12 gap-4 h-[calc(100vh-22rem)] min-h-[400px]" data-testid="chat-tab-content">
      <div className="col-span-12 md:col-span-3 bg-[#1a1a2e] rounded-lg border border-gray-800 flex flex-col max-h-[200px] md:max-h-none">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between shrink-0">
          <span className="text-sm font-medium text-white">Conversations</span>
          <button onClick={() => createConvMutation.mutate()} className="text-blue-400 hover:text-blue-300" data-testid="button-new-conversation">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-6">No conversations yet</p>
          ) : (
            conversations.map((conv: any) => (
              <div
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                data-testid={`conv-item-${conv.id}`}
                className={cn(
                  "px-3 py-2 cursor-pointer border-b border-gray-800/50 flex items-center justify-between group",
                  activeConv === conv.id ? "bg-blue-900/30" : "hover:bg-[#252545]"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{conv.title}</p>
                  <p className="text-xs text-gray-500">{new Date(conv.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConvMutation.mutate(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="col-span-12 md:col-span-9 bg-[#1a1a2e] rounded-lg border border-gray-800 flex flex-col min-h-[300px]">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">Select or start a conversation</p>
              <Button size="sm" onClick={() => createConvMutation.mutate()} data-testid="button-start-chat">
                <Plus className="w-4 h-4 mr-1" /> New Interaction
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg: any) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")} data-testid={`message-${msg.id}`}>
                  <div className={cn(
                    "max-w-[75%] rounded-lg px-4 py-2 text-sm",
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-[#252545] text-gray-200"
                  )}>
                    {msg.content}
                    <div className="text-xs mt-1 opacity-50">{new Date(msg.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-[#252545] rounded-lg px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2 shrink-0">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                data-testid="input-chat-message"
              />
              <Button onClick={handleSend} disabled={!message.trim() || chatMutation.isPending} size="sm" data-testid="button-send-message">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const VOICE_OPTIONS = [
  { id: "nova", label: "Nova", gender: "Female", description: "Warm & friendly" },
  { id: "shimmer", label: "Shimmer", gender: "Female", description: "Soft & expressive" },
  { id: "alloy", label: "Alloy", gender: "Neutral", description: "Balanced & clear" },
  { id: "echo", label: "Echo", gender: "Male", description: "Smooth & natural" },
  { id: "onyx", label: "Onyx", gender: "Male", description: "Deep & authoritative" },
  { id: "fable", label: "Fable", gender: "Male", description: "Warm & narrative" },
];

function VoiceTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [chatText, setChatText] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [voiceChatMessages, setVoiceChatMessages] = useState<{ role: string; content: string }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingMessageRef = useRef<string | null>(null);

  const { data: dashboard } = useQuery({
    queryKey: ["pa-dashboard", userId],
    queryFn: () => fetchPA("/dashboard", userId),
  });

  const currentVoice = dashboard?.profile?.voicePreference || "alloy";

  const voiceUpdateMutation = useMutation({
    mutationFn: (voice: string) => fetchPA("/profile", userId, {
      method: "PATCH",
      body: JSON.stringify({ voicePreference: voice }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
    },
  });

  const ttsMutation = useMutation({
    mutationFn: async ({ inputText, voice }: { inputText: string; voice: string }) => {
      const res = await fetch("/api/personal-agent/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({ text: inputText, voice }),
      });
      if (!res.ok) throw new Error("TTS failed");
      return res.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      setIsPlaying(true);
      audio.play();
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
    },
  });

  const sendMessageToConv = (convId: string, msg: string) => {
    setVoiceChatMessages(prev => [...prev, { role: "user", content: msg }]);
    chatMutation.mutate({ convId, msg });
  };

  const chatMutation = useMutation({
    mutationFn: ({ convId, msg }: { convId: string; msg: string }) =>
      fetchPA("/chat", userId, { method: "POST", body: JSON.stringify({ conversationId: convId, message: msg }) }),
    onSuccess: (result) => {
      setVoiceChatMessages(prev => [...prev, { role: "assistant", content: result.reply }]);
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
      ttsMutation.mutate({ inputText: result.reply, voice: currentVoice });
    },
  });

  const createConvMutation = useMutation({
    mutationFn: () => fetchPA("/conversations", userId, { method: "POST", body: JSON.stringify({ title: "Voice Chat" }) }),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["pa-conversations"] });
      setActiveConv(conv.id);
      setVoiceChatMessages([]);
      if (pendingMessageRef.current) {
        const msg = pendingMessageRef.current;
        pendingMessageRef.current = null;
        sendMessageToConv(conv.id, msg);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [voiceChatMessages]);

  const startRecording = async () => {
    if (!activeConv) {
      pendingMessageRef.current = "__RECORDING__";
      createConvMutation.mutate();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        try {
          const res = await fetch("/api/personal-agent/voice/stt", {
            method: "POST",
            headers: { "x-user-id": userId },
            body: formData,
          });
          if (res.ok) {
            const { text: transcribedText } = await res.json();
            if (transcribedText && activeConv) {
              sendMessageToConv(activeConv, transcribedText);
            }
          }
        } catch (err) {
          console.error("STT failed:", err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTextSend = () => {
    if (!chatText.trim()) return;
    const msg = chatText;
    setChatText("");
    if (!activeConv) {
      pendingMessageRef.current = msg;
      createConvMutation.mutate();
      return;
    }
    sendMessageToConv(activeConv, msg);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4" data-testid="voice-tab-content">
      <div className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" /> Voice Preference
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {VOICE_OPTIONS.map(v => (
            <button
              key={v.id}
              onClick={() => voiceUpdateMutation.mutate(v.id)}
              data-testid={`voice-option-${v.id}`}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                currentVoice === v.id
                  ? "border-blue-500 bg-blue-900/30"
                  : "border-gray-700 bg-[#0a0a0f] hover:border-gray-500"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{v.label}</span>
                <Badge variant="outline" className={cn("text-xs", v.gender === "Female" ? "text-pink-400 border-pink-800" : v.gender === "Male" ? "text-blue-400 border-blue-800" : "text-gray-400 border-gray-700")}>
                  {v.gender}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">{v.description}</p>
              {currentVoice === v.id && <Check className="w-3 h-3 text-blue-400 mt-1" />}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1a1a2e] rounded-lg border border-gray-800 flex flex-col" style={{ height: "calc(100vh - 34rem)", minHeight: "300px" }}>
        <div className="p-3 border-b border-gray-800 flex items-center justify-between shrink-0">
          <span className="text-sm font-medium text-white">Voice Chat</span>
          {!activeConv && (
            <Button size="sm" variant="outline" onClick={() => createConvMutation.mutate()} data-testid="button-start-voice-chat">
              <Plus className="w-3 h-3 mr-1" /> Start Voice Session
            </Button>
          )}
        </div>

        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-center p-6">
            <div>
              <Mic className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-1">Start a voice session to chat with your intelligence</p>
              <p className="text-gray-500 text-xs">You can type or use your microphone</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {voiceChatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-lg px-4 py-2 text-sm",
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-[#252545] text-gray-200"
                  )}>
                    {msg.role === "assistant" && <Volume2 className="w-3 h-3 inline mr-1 text-blue-400" />}
                    {msg.content}
                  </div>
                </div>
              ))}
              {(chatMutation.isPending || ttsMutation.isPending) && (
                <div className="flex justify-start">
                  <div className="bg-[#252545] rounded-lg px-4 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-xs text-gray-400">{ttsMutation.isPending ? "Speaking..." : "Thinking..."}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-gray-800 flex gap-2 shrink-0">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => isRecording && stopRecording()}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={chatMutation.isPending || isPlaying}
                data-testid="button-voice-record"
                className={cn(
                  "p-2 rounded-lg transition-all",
                  isRecording ? "bg-red-600 text-white animate-pulse" : "bg-[#252545] text-gray-400 hover:text-white hover:bg-[#353565]"
                )}
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleTextSend()}
                placeholder="Type or hold mic to speak..."
                className="flex-1 bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                data-testid="input-voice-text"
              />
              <Button onClick={handleTextSend} disabled={!chatText.trim() || chatMutation.isPending} size="sm" data-testid="button-voice-send">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-3">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Quick Text-to-Speech</h4>
        <div className="flex gap-2">
          <input
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="Type anything to hear it spoken..."
            className="flex-1 bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-testid="input-quick-tts"
          />
          <Button
            onClick={() => ttsMutation.mutate({ inputText: ttsText, voice: currentVoice })}
            disabled={!ttsText.trim() || ttsMutation.isPending || isPlaying}
            size="sm"
            data-testid="button-speak"
          >
            {isPlaying ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MemoryTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [newDomain, setNewDomain] = useState("personal");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: memories = [] } = useQuery({
    queryKey: ["pa-memories", userId, selectedDomain],
    queryFn: () => fetchPA(`/memories${selectedDomain ? `?domain=${selectedDomain}` : ""}`, userId),
  });

  const addMemoryMutation = useMutation({
    mutationFn: (data: { domain: string; content: string }) =>
      fetchPA("/memories", userId, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-memories"] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
      setNewContent("");
      setShowAddForm(false);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => fetchPA(`/memories/${id}/confirm`, userId, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pa-memories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchPA(`/memories/${id}`, userId, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-memories"] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
    },
  });

  const domains = ["personal", "work", "study", "home", "finance", "conversation"];

  return (
    <div data-testid="memory-tab-content">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDomain(null)}
            className={cn("px-3 py-1 rounded-full text-xs font-medium", !selectedDomain ? "bg-blue-600 text-white" : "bg-[#1a1a2e] text-gray-400 hover:text-white")}
            data-testid="filter-all-domains"
          >All</button>
          {domains.map(d => {
            const Icon = DOMAIN_ICONS[d] || Brain;
            return (
              <button
                key={d}
                onClick={() => setSelectedDomain(d)}
                data-testid={`filter-domain-${d}`}
                className={cn("px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1", selectedDomain === d ? "bg-blue-600 text-white" : "bg-[#1a1a2e] text-gray-400 hover:text-white")}
              >
                <Icon className="w-3 h-3" />{d}
              </button>
            );
          })}
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} data-testid="button-add-memory">
          <Plus className="w-4 h-4 mr-1" /> Add Memory
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-4 mb-4">
          <div className="flex gap-3">
            <select value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="select-memory-domain">
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What should your agent remember?"
              className="flex-1 bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
              data-testid="input-memory-content"
            />
            <Button size="sm" onClick={() => addMemoryMutation.mutate({ domain: newDomain, content: newContent })} disabled={!newContent.trim()} data-testid="button-save-memory">
              Save
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {memories.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a2e] rounded-lg border border-gray-800">
            <Brain className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No memories stored yet</p>
            <p className="text-gray-500 text-xs mt-1">Interact with your intelligence or add memories manually</p>
          </div>
        ) : (
          memories.map((mem: any) => {
            const Icon = DOMAIN_ICONS[mem.domain] || Brain;
            return (
              <div key={mem.id} className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-3 flex items-start gap-3" data-testid={`memory-item-${mem.id}`}>
                <Icon className={cn("w-5 h-5 mt-0.5", DOMAIN_COLORS[mem.domain] || "text-gray-400")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{mem.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{mem.domain}</Badge>
                    {!mem.confirmed && <Badge className="bg-yellow-900/50 text-yellow-400 text-xs">Suggested</Badge>}
                    {mem.confirmed && <Badge className="bg-green-900/50 text-green-400 text-xs">Confirmed</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!mem.confirmed && (
                    <button onClick={() => confirmMutation.mutate(mem.id)} className="text-green-400 hover:text-green-300 p-1" data-testid={`button-confirm-memory-${mem.id}`}>
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteMutation.mutate(mem.id)} className="text-red-400 hover:text-red-300 p-1" data-testid={`button-delete-memory-${mem.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TasksTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<string | null>(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ["pa-tasks", userId, filter],
    queryFn: () => fetchPA(`/tasks${filter ? `?status=${filter}` : ""}`, userId),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetchPA("/tasks", userId, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
      setTitle(""); setDescription(""); setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetchPA(`/tasks/${id}`, userId, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchPA(`/tasks/${id}`, userId, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
    },
  });

  const priorityColor = (p: string) => p === "high" ? "text-red-400" : p === "medium" ? "text-yellow-400" : "text-green-400";

  return (
    <div data-testid="tasks-tab-content">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {[null, "pending", "in_progress", "completed"].map(f => (
            <button
              key={f || "all"}
              onClick={() => setFilter(f)}
              data-testid={`filter-tasks-${f || "all"}`}
              className={cn("px-3 py-1 rounded-full text-xs font-medium", filter === f ? "bg-blue-600 text-white" : "bg-[#1a1a2e] text-gray-400 hover:text-white")}
            >{f || "All"}</button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-add-task">
          <Plus className="w-4 h-4 mr-1" /> Add Task
        </Button>
      </div>

      {showForm && (
        <div className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-4 mb-4 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" data-testid="input-task-title" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none" data-testid="input-task-description" />
          <div className="flex gap-3">
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="select-task-priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="select-task-category">
              <option value="general">General</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="study">Study</option>
              <option value="home">Home</option>
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="input-task-due-date" />
            <Button size="sm" onClick={() => createMutation.mutate({ title, description, priority, category, dueDate: dueDate || undefined })} disabled={!title.trim()} data-testid="button-create-task">Create</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a2e] rounded-lg border border-gray-800">
            <CheckSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No tasks yet</p>
          </div>
        ) : (
          tasks.map((task: any) => (
            <div key={task.id} className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-3 flex items-center gap-3" data-testid={`task-item-${task.id}`}>
              <button
                onClick={() => updateMutation.mutate({ id: task.id, data: { status: task.status === "completed" ? "pending" : "completed" } })}
                className={cn("w-5 h-5 rounded border flex items-center justify-center", task.status === "completed" ? "bg-green-600 border-green-600" : "border-gray-600 hover:border-blue-500")}
                data-testid={`button-toggle-task-${task.id}`}
              >
                {task.status === "completed" && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", task.status === "completed" ? "text-gray-500 line-through" : "text-white")}>{task.title}</p>
                {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xs", priorityColor(task.priority))}>{task.priority}</span>
                  <Badge variant="outline" className="text-xs">{task.category}</Badge>
                  {task.dueDate && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => deleteMutation.mutate(task.id)} className="text-gray-500 hover:text-red-400" data-testid={`button-delete-task-${task.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DevicesTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState("light");
  const [provider, setProvider] = useState("generic");

  const { data: devices = [] } = useQuery({
    queryKey: ["pa-devices", userId],
    queryFn: () => fetchPA("/devices", userId),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => fetchPA("/devices", userId, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-devices"] });
      setDeviceName(""); setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetchPA(`/devices/${id}`, userId, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pa-devices"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchPA(`/devices/${id}`, userId, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pa-devices"] }),
  });

  const deviceTypeIcons: Record<string, any> = {
    light: Zap, thermostat: Home, lock: Lock, camera: Shield, speaker: Volume2, switch: Power, sensor: Wifi,
  };

  return (
    <div data-testid="devices-tab-content">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Smart Home Devices</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-add-device">
          <Plus className="w-4 h-4 mr-1" /> Add Device
        </Button>
      </div>

      {showForm && (
        <div className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-4 mb-4 space-y-3">
          <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Device name" className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" data-testid="input-device-name" />
          <div className="flex gap-3">
            <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="select-device-type">
              {Object.keys(deviceTypeIcons).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="select-device-provider">
              <option value="generic">Generic</option>
              <option value="smartthings">SmartThings</option>
              <option value="homeassistant">Home Assistant</option>
              <option value="tuya">Tuya</option>
              <option value="philips_hue">Philips Hue</option>
            </select>
            <Button size="sm" onClick={() => addMutation.mutate({ deviceName, deviceType, provider })} disabled={!deviceName.trim()} data-testid="button-save-device">Add</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-[#1a1a2e] rounded-lg border border-gray-800">
            <Wifi className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No devices connected</p>
            <p className="text-gray-500 text-xs mt-1">Add your smart home devices to control them via your AI agent</p>
          </div>
        ) : (
          devices.map((device: any) => {
            const DevIcon = deviceTypeIcons[device.deviceType] || Wifi;
            return (
              <div key={device.id} className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-4" data-testid={`device-card-${device.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DevIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium text-white">{device.deviceName}</span>
                  </div>
                  <Badge className={cn("text-xs", device.status === "connected" ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-400")}>
                    {device.status}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  <p>Type: {device.deviceType} • Provider: {device.provider}</p>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={device.allowControl}
                      onChange={(e) => updateMutation.mutate({ id: device.id, data: { allowControl: e.target.checked } })}
                      className="rounded"
                      data-testid={`checkbox-allow-control-${device.id}`}
                    />
                    Allow AI Control
                  </label>
                  <button onClick={() => deleteMutation.mutate(device.id)} className="text-gray-500 hover:text-red-400" data-testid={`button-remove-device-${device.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 p-4 bg-[#1a1a2e] rounded-lg border border-yellow-900/50">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-400 font-medium">Permission Required</p>
            <p className="text-xs text-gray-400 mt-1">Your AI agent will never control devices without your explicit permission. Enable "Allow AI Control" for each device individually.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TruthCoreTab({ userId, dashboard }: { userId: string; dashboard: any }) {
  const { data: truthData, isLoading } = useQuery({
    queryKey: ["pa-truth-metrics", userId],
    queryFn: () => fetchPA("/truth-metrics", userId),
    enabled: !!userId,
    refetchInterval: 30000,
  });

  const te = dashboard?.truthEvolution || truthData || {};
  const dist = te.distribution || { personal_truth: 0, objective_fact: 0, contextual_interpretation: 0 };
  const totalDist = dist.personal_truth + dist.objective_fact + dist.contextual_interpretation;

  return (
    <div className="space-y-6" data-testid="truth-core-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4" data-testid="truth-total-memories">
          <div className="flex items-center gap-2 mb-2 text-gray-400"><Brain className="w-4 h-4" /><span className="text-xs">Truth Memories</span></div>
          <span className="text-2xl font-bold text-white">{te.totalTruthMemories || 0}</span>
        </div>
        <div className="glass-card rounded-xl p-4" data-testid="truth-avg-confidence">
          <div className="flex items-center gap-2 mb-2 text-gray-400"><Zap className="w-4 h-4" /><span className="text-xs">Avg Confidence</span></div>
          <span className="text-2xl font-bold text-white">{((te.avgConfidence || 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="glass-card rounded-xl p-4" data-testid="truth-high-confidence">
          <div className="flex items-center gap-2 mb-2 text-gray-400"><Star className="w-4 h-4" /><span className="text-xs">High Confidence</span></div>
          <span className="text-2xl font-bold text-white">{te.highConfidenceCount || 0}</span>
        </div>
        <div className="glass-card rounded-xl p-4" data-testid="truth-reliability">
          <div className="flex items-center gap-2 mb-2 text-gray-400"><Shield className="w-4 h-4" /><span className="text-xs">Factual Reliability</span></div>
          <span className="text-2xl font-bold text-white">{((te.factualReliability || 0) * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Truth Type Distribution</h3>
        <div className="space-y-3">
          {[
            { key: "personal_truth", label: "Personal Truth", color: "bg-blue-500", desc: "Subjective preferences and beliefs" },
            { key: "objective_fact", label: "Objective Fact", color: "bg-green-500", desc: "Verified factual knowledge" },
            { key: "contextual_interpretation", label: "Contextual Interpretation", color: "bg-purple-500", desc: "Situation-dependent knowledge" },
          ].map(({ key, label, color, desc }) => {
            const val = dist[key as keyof typeof dist] || 0;
            const pct = totalDist > 0 ? (val / totalDist * 100).toFixed(0) : "0";
            return (
              <div key={key} data-testid={`truth-dist-${key}`}>
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <span className="text-sm text-white">{label}</span>
                    <span className="text-[10px] text-gray-500 ml-2">{desc}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-300">{val} ({pct}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Evolution Events</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (!te.recentEvents || te.recentEvents.length === 0) ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No evolution events yet. Your agent evolves as you interact with it.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {te.recentEvents.map((evt: any) => (
              <div key={evt.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg" data-testid={`truth-event-${evt.id}`}>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-medium",
                    evt.eventType === "fact_correction" ? "bg-orange-500/20 text-orange-400" :
                    evt.eventType === "contradiction_detected" ? "bg-red-500/20 text-red-400" :
                    evt.eventType === "expert_validation" ? "bg-green-500/20 text-green-400" :
                    evt.eventType === "confidence_decay" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-blue-500/20 text-blue-400"
                  )}>
                    {evt.eventType?.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-300">{evt.description?.slice(0, 60)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  {evt.previousConfidence !== null && evt.newConfidence !== null && (
                    <span className={cn(
                      "font-medium",
                      (evt.newConfidence || 0) > (evt.previousConfidence || 0) ? "text-green-400" : "text-red-400"
                    )}>
                      {((evt.previousConfidence || 0) * 100).toFixed(0)}% → {((evt.newConfidence || 0) * 100).toFixed(0)}%
                    </span>
                  )}
                  {evt.createdAt && <span>{new Date(evt.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-xl p-5 border border-cyan-500/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-cyan-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">How Truth-Anchored Evolution Works</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>Your agent classifies knowledge into personal truths, objective facts, and contextual interpretations</li>
              <li>Factual memories carry confidence scores that increase with evidence and validation</li>
              <li>Contradictions reduce confidence, prompting the agent to seek verification</li>
              <li>Unvalidated facts gradually decay in confidence over time</li>
              <li>Responses are weighted by confidence — high-confidence facts are prioritized</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [entryType, setEntryType] = useState("bill");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["pa-finance", userId],
    queryFn: () => fetchPA("/finance", userId),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["pa-finance-reminders", userId],
    queryFn: () => fetchPA("/finance/reminders", userId),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => fetchPA("/finance", userId, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-finance"] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
      setTitle(""); setAmount(""); setDueDate(""); setNotes(""); setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetchPA(`/finance/${id}`, userId, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pa-finance"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchPA(`/finance/${id}`, userId, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa-finance"] });
      queryClient.invalidateQueries({ queryKey: ["pa-dashboard"] });
    },
  });

  const typeIcons: Record<string, any> = { bill: DollarSign, loan: Wallet, commitment: Calendar, income: Zap, subscription: RefreshCw };

  return (
    <div data-testid="finance-tab-content">
      {reminders.length > 0 && (
        <div className="bg-yellow-900/20 rounded-lg border border-yellow-800 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Upcoming Due ({reminders.length})</span>
          </div>
          <div className="space-y-1">
            {reminders.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{r.title}</span>
                <span className="text-yellow-400">${(r.amount / 100).toFixed(2)} due {new Date(r.dueDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Finance Tracker</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-add-finance">
          <Plus className="w-4 h-4 mr-1" /> Add Entry
        </Button>
      </div>

      {showForm && (
        <div className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-4 mb-4 space-y-3">
          <div className="flex gap-3">
            <select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="select-finance-type">
              <option value="bill">Bill</option>
              <option value="loan">Loan</option>
              <option value="commitment">Commitment</option>
              <option value="income">Income</option>
              <option value="subscription">Subscription</option>
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="flex-1 bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" data-testid="input-finance-title" />
          </div>
          <div className="flex gap-3">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (cents)" className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 w-32" data-testid="input-finance-amount" />
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="input-finance-due-date" />
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} data-testid="checkbox-finance-recurring" />
              Recurring
            </label>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full bg-[#0a0a0f] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none" data-testid="input-finance-notes" />
          <Button size="sm" onClick={() => addMutation.mutate({ entryType, title, amount: parseInt(amount) || 0, dueDate: dueDate || undefined, recurring, notes })} disabled={!title.trim() || !amount} data-testid="button-save-finance">Save Entry</Button>
        </div>
      )}

      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a2e] rounded-lg border border-gray-800">
            <DollarSign className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No finance entries</p>
            <p className="text-gray-500 text-xs mt-1">Track your bills, loans, and commitments</p>
          </div>
        ) : (
          entries.map((entry: any) => {
            const EntryIcon = typeIcons[entry.entryType] || DollarSign;
            return (
              <div key={entry.id} className="bg-[#1a1a2e] rounded-lg border border-gray-800 p-3 flex items-center gap-3" data-testid={`finance-item-${entry.id}`}>
                <EntryIcon className="w-5 h-5 text-green-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white">{entry.title}</p>
                    <Badge variant="outline" className="text-xs">{entry.entryType}</Badge>
                    {entry.recurring && <Badge className="bg-purple-900/50 text-purple-400 text-xs">Recurring</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="text-green-400 font-medium">${(entry.amount / 100).toFixed(2)}</span>
                    {entry.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(entry.dueDate).toLocaleDateString()}</span>}
                    {entry.notes && <span className="truncate max-w-[200px]">{entry.notes}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {entry.status === "active" && (
                    <button onClick={() => updateMutation.mutate({ id: entry.id, data: { status: "paid" } })} className="text-green-400 hover:text-green-300 p-1" title="Mark as paid" data-testid={`button-mark-paid-${entry.id}`}>
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteMutation.mutate(entry.id)} className="text-gray-500 hover:text-red-400 p-1" data-testid={`button-delete-finance-${entry.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
