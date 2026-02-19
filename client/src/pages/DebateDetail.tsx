import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Radio, Users, Clock, Play, Square, Send, Bot, User, Volume2, ChevronLeft, Zap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";

interface DebateEvent {
  type: string;
  debateId: number;
  data: any;
}

function useDebateSSE(debateId: number | null) {
  const [events, setEvents] = useState<DebateEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!debateId) return;
    const evtSource = new EventSource(`/api/debates/${debateId}/stream`);
    evtSource.onopen = () => setConnected(true);
    evtSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        setEvents(prev => [...prev, event]);
      } catch {}
    };
    evtSource.onerror = () => setConnected(false);
    return () => evtSource.close();
  }, [debateId]);

  return { events, connected };
}

function Timer({ durationSeconds, isActive }: { durationSeconds: number; isActive: boolean }) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining < 10;

  return (
    <div className={`font-mono text-3xl font-bold ${isLow ? "text-red-400 animate-pulse" : "text-primary"}`} data-testid="text-timer">
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}

function ParticipantAvatar({ participant, isSpeaking }: { participant: any; isSpeaking: boolean }) {
  const isAgent = participant.participantType === "agent";
  const name = participant.user?.displayName || "Unknown";

  return (
    <div className={`flex flex-col items-center gap-1 transition-all ${isSpeaking ? "scale-110" : "opacity-60"}`} data-testid={`avatar-participant-${participant.id}`}>
      <div className={`relative w-12 h-12 rounded-full flex items-center justify-center ${isSpeaking ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${isAgent ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
        {isAgent ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <Volume2 className="w-2.5 h-2.5 text-white" />
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-[80px] text-center">{name}</span>
      {participant.position && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          participant.position === "for" ? "bg-green-500/20 text-green-400" :
          participant.position === "against" ? "bg-red-500/20 text-red-400" :
          "bg-yellow-500/20 text-yellow-400"
        }`}>
          {participant.position}
        </span>
      )}
    </div>
  );
}

function TranscriptEntry({ turn, participants }: { turn: any; participants: any[] }) {
  const participant = participants.find((p: any) => p.id === turn.participantId);
  const isAgent = participant?.participantType === "agent";
  const name = participant?.user?.displayName || "Unknown";

  return (
    <div className="flex gap-3 py-3 border-b border-white/5 last:border-0" data-testid={`transcript-turn-${turn.id}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isAgent ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
        {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">Round {turn.roundNumber}</span>
          <span className="text-xs text-muted-foreground">{turn.wordCount} words</span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{turn.content}</p>
      </div>
    </div>
  );
}

export default function DebateDetail() {
  const [, params] = useRoute("/debate/:id");
  const debateId = params?.id ? parseInt(params.id) : null;
  const [, navigate] = useLocation();
  const [humanInput, setHumanInput] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: debate, isLoading } = useQuery({
    queryKey: ["/api/debates", debateId],
    queryFn: () => api.debates.get(debateId!),
    enabled: !!debateId,
    refetchInterval: 5000,
  });

  const { events, connected } = useDebateSSE(debateId);

  const [liveTurns, setLiveTurns] = useState<any[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<any>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [turnActive, setTurnActive] = useState(false);
  const [debateStatus, setDebateStatus] = useState("");

  useEffect(() => {
    if (debate) {
      setDebateStatus(debate.status);
      setCurrentRound(debate.currentRound || 0);
      if (debate.turns?.length > 0) {
        setLiveTurns(debate.turns);
      }
    }
  }, [debate]);

  useEffect(() => {
    for (const event of events) {
      switch (event.type) {
        case "debate_start":
          setDebateStatus("live");
          setCurrentRound(1);
          queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] });
          break;
        case "turn_start":
          setCurrentSpeaker(event.data.participant);
          setTurnActive(true);
          break;
        case "turn_end":
          setTurnActive(false);
          break;
        case "transcript_update":
          setLiveTurns(prev => [...prev, event.data.turn]);
          break;
        case "speech_ready":
          if (event.data.audioBase64 && audioRef.current) {
            const blob = base64ToBlob(event.data.audioBase64, "audio/mp3");
            audioRef.current.src = URL.createObjectURL(blob);
            audioRef.current.play().catch(() => {});
          }
          break;
        case "round_change":
          setCurrentRound(event.data.round);
          break;
        case "debate_end":
          setDebateStatus("completed");
          setTurnActive(false);
          setCurrentSpeaker(null);
          queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] });
          break;
        case "participant_joined":
          queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] });
          break;
      }
    }
  }, [events]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [liveTurns]);

  const startMutation = useMutation({
    mutationFn: () => api.debates.start(debateId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] }),
  });

  const autoPopulateMutation = useMutation({
    mutationFn: () => api.debates.autoPopulate(debateId!, 3),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] }),
  });

  const endMutation = useMutation({
    mutationFn: () => api.debates.end(debateId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] }),
  });

  const submitTurnMutation = useMutation({
    mutationFn: (content: string) => api.debates.submitTurn(debateId!, debate?.currentSpeakerId || "", content),
    onSuccess: () => {
      setHumanInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/debates", debateId] });
    },
  });

  if (isLoading || !debate) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const participants = debate.participants || [];
  const allTurns = liveTurns.length > 0 ? liveTurns : debate.turns || [];
  const isLive = debateStatus === "live";
  const isLobby = debateStatus === "lobby" || debateStatus === "scheduled";

  return (
    <Layout>
      <audio ref={audioRef} className="hidden" />
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/live-debates")} className="gap-1" data-testid="button-back-debates">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
              </span>
            )}
            {connected && isLive && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Connected
              </span>
            )}
          </div>
        </div>

        <div className="text-center py-2">
          <h1 className="text-2xl font-display font-bold" data-testid="text-debate-title">{debate.title}</h1>
          <p className="text-muted-foreground mt-1">{debate.topic}</p>
          {isLive && (
            <div className="mt-3 flex items-center justify-center gap-6">
              <div className="text-sm text-muted-foreground">
                Round <span className="text-primary font-bold">{currentRound}</span> / {debate.totalRounds}
              </div>
              <Timer durationSeconds={debate.turnDurationSeconds || 60} isActive={turnActive} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 py-3 overflow-x-auto">
          {participants.map((p: any) => (
            <ParticipantAvatar
              key={p.id}
              participant={p}
              isSpeaking={currentSpeaker?.id === p.id}
            />
          ))}
          {participants.length === 0 && (
            <p className="text-sm text-muted-foreground">No participants yet</p>
          )}
        </div>

        {isLobby && (
          <Card className="p-4 bg-card border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Lobby ({participants.length} participants)
              </h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => autoPopulateMutation.mutate()}
                disabled={autoPopulateMutation.isPending}
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                data-testid="button-auto-populate"
              >
                {autoPopulateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                Add AI Agents
              </Button>
              <Button
                onClick={() => startMutation.mutate()}
                disabled={participants.length < 2 || startMutation.isPending}
                size="sm"
                className="gap-2"
                data-testid="button-start-debate"
              >
                {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Start Debate
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 bg-card border-white/10 flex flex-col" style={{ minHeight: "400px" }}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Transcript
              </h3>
              <span className="text-xs text-muted-foreground">{allTurns.length} turns</span>
            </div>
            <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-0" data-testid="div-transcript">
              {allTurns.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">{isLive ? "Waiting for first speaker..." : "No turns yet"}</p>
                </div>
              ) : (
                allTurns.map((turn: any, idx: number) => (
                  <TranscriptEntry key={turn.id || idx} turn={turn} participants={participants} />
                ))
              )}
            </div>
            {isLive && currentSpeaker?.participantType === "human" && (
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    value={humanInput}
                    onChange={e => setHumanInput(e.target.value)}
                    placeholder="Type your argument..."
                    className="bg-background border-white/10"
                    onKeyDown={e => {
                      if (e.key === "Enter" && humanInput.trim()) {
                        submitTurnMutation.mutate(humanInput.trim());
                      }
                    }}
                    data-testid="input-human-turn"
                  />
                  <Button
                    onClick={() => humanInput.trim() && submitTurnMutation.mutate(humanInput.trim())}
                    disabled={!humanInput.trim() || submitTurnMutation.isPending}
                    size="sm"
                    data-testid="button-submit-turn"
                  >
                    {submitTurnMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-4 bg-card border-white/10">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants
              </h3>
              <div className="space-y-3">
                {participants.map((p: any) => (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${currentSpeaker?.id === p.id ? "bg-primary/10 border border-primary/20" : ""}`} data-testid={`participant-row-${p.id}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.participantType === "agent" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {p.participantType === "agent" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.user?.displayName || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{p.turnsUsed} turns · {p.position || "open"}</p>
                    </div>
                    {currentSpeaker?.id === p.id && (
                      <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-card border-white/10">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Debate Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{debateStatus || debate.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium capitalize">{debate.format}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rounds</span>
                  <span className="font-medium">{currentRound || 0} / {debate.totalRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turn Duration</span>
                  <span className="font-medium">{debate.turnDurationSeconds}s</span>
                </div>
              </div>
            </Card>

            {isLive && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => endMutation.mutate()}
                disabled={endMutation.isPending}
                data-testid="button-end-debate"
              >
                {endMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                End Debate
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}
