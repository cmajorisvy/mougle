import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Loader2, Radio, Users, Clock, Play, Square, Send, Bot, User, Volume2,
  Video, VideoOff, Mic, MicOff, Monitor, Hand, Crown, Settings, Tv,
  ChevronLeft, Zap, MessageSquare, PhoneOff, Eye
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface StudioParticipant {
  id: number;
  userId: string;
  participantType: "human" | "agent";
  position: string | null;
  ttsVoice: string;
  isActive: boolean;
  user: { id: string; displayName: string; avatar: string; role: string } | null;
  stream?: MediaStream;
  isSpeaking?: boolean;
}

function useDebateSSE(debateId: number | null) {
  const [events, setEvents] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!debateId) return;
    const evtSource = new EventSource(`/api/debates/${debateId}/stream`);
    evtSource.onopen = () => setConnected(true);
    evtSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        setEvents(prev => [...prev.slice(-50), event]);
      } catch {}
    };
    evtSource.onerror = () => setConnected(false);
    return () => evtSource.close();
  }, [debateId]);

  return { events, connected };
}

function AIAvatar({ participant, isSpeaking, audioLevel }: {
  participant: StudioParticipant;
  isSpeaking: boolean;
  audioLevel: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const name = participant.user?.displayName || "AI Agent";
  const isFemale = name.toLowerCase().includes("female");
  const isMale = name.toLowerCase().includes("male") && !isFemale;

  const primaryColor = isFemale ? "#a855f7" : isMale ? "#3b82f6" : "#8b5cf6";
  const secondaryColor = isFemale ? "#ec4899" : isMale ? "#06b6d4" : "#6366f1";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    let phase = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, isSpeaking ? `${primaryColor}30` : `${primaryColor}10`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      if (isSpeaking) {
        phase += 0.05;
        ctx.strokeStyle = `${primaryColor}40`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const radius = 60 + i * 15 + Math.sin(phase + i) * 5 + audioLevel * 20;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2 - 10, radius, 0, Math.PI * 2);
          ctx.globalAlpha = 0.3 - i * 0.08;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 20, 35, 20, 0, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2 - 20, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(w / 2 - 10, h / 2 - 25, 5, 0, Math.PI * 2);
      ctx.arc(w / 2 + 10, h / 2 - 25, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(w / 2 - 10, h / 2 - 25, 2.5, 0, Math.PI * 2);
      ctx.arc(w / 2 + 10, h / 2 - 25, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const mouthOpen = isSpeaking ? 3 + audioLevel * 12 : 1;
      ctx.fillStyle = isSpeaking ? "#ff6b6b" : "#cc5555";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 - 8, 8, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isFemale) {
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 25, h / 2 - 45);
        ctx.quadraticCurveTo(w / 2 - 40, h / 2 - 10, w / 2 - 30, h / 2 + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w / 2 + 25, h / 2 - 45);
        ctx.quadraticCurveTo(w / 2 + 40, h / 2 - 10, w / 2 + 30, h / 2 + 10);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking, audioLevel, primaryColor, secondaryColor, isFemale]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className="w-full h-full rounded-lg"
      data-testid={`canvas-avatar-${participant.userId}`}
    />
  );
}

function ParticipantTile({ participant, isSpeaking, isCurrentUser, audioLevel, onOverride }: {
  participant: StudioParticipant;
  isSpeaking: boolean;
  isCurrentUser: boolean;
  audioLevel: number;
  onOverride?: (userId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isAgent = participant.participantType === "agent";
  const name = participant.user?.displayName || "Unknown";

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden aspect-video bg-gray-900 border-2 transition-all ${
        isSpeaking ? "border-green-400 shadow-lg shadow-green-400/20" : "border-gray-700/50"
      }`}
      data-testid={`tile-participant-${participant.userId}`}
    >
      {isAgent ? (
        <AIAvatar participant={participant} isSpeaking={isSpeaking} audioLevel={audioLevel} />
      ) : participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isCurrentUser}
          className="w-full h-full object-cover"
          data-testid={`video-participant-${participant.userId}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          {isAgent ? <Bot className="w-3.5 h-3.5 text-purple-400" /> : <User className="w-3.5 h-3.5 text-blue-400" />}
          <span className="text-xs font-medium text-white truncate">{name}</span>
          {isSpeaking && (
            <div className="flex gap-0.5 ml-auto">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1 bg-green-400 rounded-full animate-pulse"
                  style={{
                    height: `${6 + audioLevel * 10 + Math.random() * 4}px`,
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              ))}
            </div>
          )}
          {isCurrentUser && (
            <span className="ml-auto text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">You</span>
          )}
        </div>
      </div>

      {onOverride && !isCurrentUser && (
        <button
          onClick={() => onOverride(participant.userId)}
          className="absolute top-2 right-2 p-1 rounded bg-black/50 hover:bg-black/80 text-white opacity-0 hover:opacity-100 transition-opacity"
          title="Override: Give this participant the floor"
          data-testid={`button-override-${participant.userId}`}
        >
          <Hand className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function SpeechRecognitionHook(onTranscript: (text: string, isFinal: boolean) => void, isListening: boolean) {
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript) onTranscript(finalTranscript, true);
      else if (interimTranscript) onTranscript(interimTranscript, false);
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {}

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isListening, onTranscript]);
}

function TranscriptPanel({ turns }: { turns: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-3" data-testid="panel-transcript">
      {turns.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">Debate transcript will appear here...</p>
      )}
      {turns.map((turn: any, i: number) => (
        <div key={i} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-purple-400">Round {turn.roundNumber}</span>
            <span className="text-xs text-gray-500">Turn {turn.turnOrder}</span>
          </div>
          <p className="text-sm text-gray-200 leading-relaxed">{turn.content}</p>
        </div>
      ))}
    </div>
  );
}

export default function LiveStudio() {
  const [, params] = useRoute("/live-studio/:id");
  const [, navigate] = useLocation();
  const debateId = params?.id ? parseInt(params.id) : null;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<Record<string, number>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [youtubeKey, setYoutubeKey] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimRef = useRef<number>(0);

  const { events, connected } = useDebateSSE(debateId);

  const { data: debate, isLoading, refetch } = useQuery({
    queryKey: ["/api/debates", debateId],
    queryFn: () => debateId ? api.debates.get(debateId) : null,
    enabled: !!debateId,
    refetchInterval: 5000,
  });

  const setupMutation = useMutation({
    mutationFn: () => debateId ? api.debates.studioSetup(debateId, youtubeKey || undefined) : Promise.reject(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] });
      refetch();
    },
  });

  const startMutation = useMutation({
    mutationFn: () => debateId ? api.debates.start(debateId) : Promise.reject(),
    onSuccess: () => refetch(),
  });

  const endMutation = useMutation({
    mutationFn: () => debateId ? api.debates.end(debateId) : Promise.reject(),
    onSuccess: () => refetch(),
  });

  const overrideMutation = useMutation({
    mutationFn: (speakerId: string) =>
      debateId ? api.debates.studioOverrideSpeaker(debateId, speakerId) : Promise.reject(),
  });

  const speechMutation = useMutation({
    mutationFn: ({ userId, transcript }: { userId: string; transcript: string }) =>
      debateId ? api.debates.studioSpeech(debateId, userId, transcript) : Promise.reject(),
    onSuccess: () => refetch(),
  });

  const participants: StudioParticipant[] = useMemo(() => {
    return debate?.participants || [];
  }, [debate]);

  const turns = useMemo(() => debate?.turns || [], [debate]);
  const currentSpeakerId = debate?.currentSpeakerId;
  const isLive = debate?.status === "live";
  const isCompleted = debate?.status === "completed";

  useEffect(() => {
    const stored = localStorage.getItem("userId");
    if (stored) setCurrentUserId(stored);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });
      setLocalStream(stream);
      setCameraEnabled(true);
      setMicEnabled(true);

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevels = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        if (currentUserId) {
          setAudioLevels(prev => ({ ...prev, [currentUserId]: avg }));
        }
        audioAnimRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch (err) {
      console.error("Camera access failed:", err);
    }
  }, [currentUserId]);

  const stopCamera = useCallback(() => {
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setCameraEnabled(false);
    setMicEnabled(false);
    audioContextRef.current?.close();
    if (audioAnimRef.current) cancelAnimationFrame(audioAnimRef.current);
  }, [localStream]);

  const toggleMic = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setMicEnabled(prev => !prev);
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setCameraEnabled(prev => !prev);
    }
  }, [localStream]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && currentUserId && debateId) {
      speechMutation.mutate({ userId: currentUserId, transcript: text });
      setInterimText("");
    } else {
      setInterimText(text);
    }
  }, [currentUserId, debateId, speechMutation]);

  SpeechRecognitionHook(handleTranscript, isListening && micEnabled);

  useEffect(() => {
    for (const event of events) {
      if (event.type === "speech_ready" && event.data?.audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${event.data.audioBase64}`);
        const participantId = event.data.participantId;

        audio.onplay = () => {
          const updateLevel = () => {
            setAudioLevels(prev => ({
              ...prev,
              [participantId]: 0.3 + Math.random() * 0.5,
            }));
            if (!audio.paused) requestAnimationFrame(updateLevel);
          };
          updateLevel();
        };
        audio.onended = () => {
          setAudioLevels(prev => ({ ...prev, [participantId]: 0 }));
        };
        audio.play().catch(() => {});
      }
    }
  }, [events]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (isLoading || !debate) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const humanCount = participants.filter(p => p.participantType === "human").length;
  const agentCount = participants.filter(p => p.participantType === "agent").length;

  const gridCols = participants.length <= 2 ? "grid-cols-2" :
    participants.length <= 4 ? "grid-cols-2" :
    participants.length <= 6 ? "grid-cols-3" :
    participants.length <= 9 ? "grid-cols-3" : "grid-cols-4";

  return (
    <Layout>
      <div className="min-h-screen bg-black" data-testid="page-live-studio">
        <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/live-debates")}
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-purple-400" />
              <h1 className="text-lg font-bold text-white truncate max-w-md" data-testid="text-studio-title">
                {debate.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLive && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium text-red-400">LIVE</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Users className="w-3.5 h-3.5" />
              <span>{humanCount} humans · {agentCount} agents</span>
            </div>
            {connected && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Connected
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-120px)]">
          <div className="flex-1 flex flex-col">
            <div className={`flex-1 grid ${gridCols} gap-2 p-3 auto-rows-fr`} data-testid="grid-participants">
              {participants.map((p: StudioParticipant) => (
                <ParticipantTile
                  key={p.id}
                  participant={{
                    ...p,
                    stream: p.userId === currentUserId ? localStream || undefined : undefined,
                  }}
                  isSpeaking={currentSpeakerId === p.userId}
                  isCurrentUser={p.userId === currentUserId}
                  audioLevel={audioLevels[p.userId] || 0}
                  onOverride={isLive ? (userId) => overrideMutation.mutate(userId) : undefined}
                />
              ))}

              {participants.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-16">
                  <Users className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No participants yet</p>
                  <p className="text-sm">Set up the studio to add AI agents</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 p-3 bg-gray-950 border-t border-gray-800">
              {!localStream ? (
                <Button
                  onClick={startCamera}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                  data-testid="button-join-camera"
                >
                  <Video className="w-4 h-4" />
                  Join with Camera
                </Button>
              ) : (
                <>
                  <Button
                    variant={cameraEnabled ? "default" : "destructive"}
                    size="icon"
                    onClick={toggleCamera}
                    data-testid="button-toggle-camera"
                  >
                    {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant={micEnabled ? "default" : "destructive"}
                    size="icon"
                    onClick={toggleMic}
                    data-testid="button-toggle-mic"
                  >
                    {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant={isListening ? "default" : "outline"}
                    onClick={() => setIsListening(!isListening)}
                    className="gap-2"
                    data-testid="button-toggle-stt"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {isListening ? "STT On" : "STT Off"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={stopCamera}
                    data-testid="button-leave"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </Button>
                </>
              )}

              <div className="w-px h-8 bg-gray-700 mx-1" />

              {!isLive && !isCompleted && (
                <>
                  <Button
                    onClick={() => setupMutation.mutate()}
                    disabled={setupMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700 gap-2"
                    data-testid="button-setup-studio"
                  >
                    {setupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Setup Studio
                  </Button>
                  {participants.length >= 2 && (
                    <Button
                      onClick={() => startMutation.mutate()}
                      disabled={startMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 gap-2"
                      data-testid="button-start-debate"
                    >
                      {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Go Live
                    </Button>
                  )}
                </>
              )}

              {isLive && (
                <Button
                  onClick={() => endMutation.mutate()}
                  disabled={endMutation.isPending}
                  variant="destructive"
                  className="gap-2"
                  data-testid="button-end-debate"
                >
                  {endMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                  End Debate
                </Button>
              )}

              {isCompleted && (
                <div className="text-sm text-gray-400 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Debate ended
                </div>
              )}
            </div>
          </div>

          <div className="w-80 border-l border-gray-800 flex flex-col bg-gray-950">
            <div className="p-3 border-b border-gray-800">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                Live Transcript
              </h3>
            </div>

            <TranscriptPanel turns={turns} />

            {interimText && (
              <div className="p-2 border-t border-gray-800">
                <div className="text-xs text-gray-500 bg-gray-800/50 rounded p-2">
                  <span className="text-blue-400">Listening:</span> {interimText}
                </div>
              </div>
            )}

            {showSettings && (
              <div className="p-3 border-t border-gray-800 space-y-3">
                <h4 className="text-xs font-medium text-gray-400 uppercase">Streaming Settings</h4>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">YouTube Stream Key</label>
                  <Input
                    value={youtubeKey}
                    onChange={(e) => setYoutubeKey(e.target.value)}
                    placeholder="Enter stream key..."
                    className="bg-gray-800 border-gray-700 text-sm"
                    data-testid="input-youtube-key"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <p>Topic: {debate.topic}</p>
                  <p>Format: {debate.format}</p>
                  <p>Rounds: {debate.currentRound}/{debate.totalRounds}</p>
                  <p>Status: {debate.status}</p>
                </div>
              </div>
            )}

            <div className="p-3 border-t border-gray-800">
              <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Participants</h4>
              <div className="space-y-1.5">
                {participants.map((p: StudioParticipant) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                      currentSpeakerId === p.userId ? "bg-green-500/10 text-green-400" : "text-gray-400"
                    }`}
                  >
                    {p.participantType === "agent" ? (
                      <Bot className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    ) : (
                      <User className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{p.user?.displayName || "Unknown"}</span>
                    {currentSpeakerId === p.userId && (
                      <Volume2 className="w-3 h-3 ml-auto flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
