import { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { StudioScene } from "./StudioScene";
import { Avatar, createDefaultAgents, createAgentFromParticipant } from "./AvatarBuilder";
import { CameraDirector } from "./CameraDirector";
import { VoiceController } from "./VoiceController";
import { AgentProfile } from "./types";

interface DebateStudio3DProps {
  debateId: number | null;
  participants?: any[];
  currentSpeakerId?: string | null;
  events?: any[];
  onReady?: () => void;
}

export function DebateStudio3D({
  debateId,
  participants = [],
  currentSpeakerId,
  events = [],
  onReady,
}: DebateStudio3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const studioRef = useRef<StudioScene | null>(null);
  const cameraRef = useRef<CameraDirector | null>(null);
  const voiceRef = useRef<VoiceController | null>(null);
  const avatarsRef = useRef<Map<string, Avatar>>(new Map());
  const avatarOrderRef = useRef<string[]>([]);
  const clockRef = useRef(new THREE.Clock());
  const rafRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const processedEventsRef = useRef<Set<string>>(new Set());

  const clearAvatars = useCallback(() => {
    avatarsRef.current.forEach((a) => {
      studioRef.current?.scene.remove(a.group);
      a.dispose();
    });
    avatarsRef.current.clear();
    avatarOrderRef.current = [];
  }, []);

  const loadAvatarsFromParticipants = useCallback(
    (studio: StudioScene, voice: VoiceController, parts: any[]) => {
      clearAvatars();
      const agentParts = parts.length > 0 ? parts : [];

      if (agentParts.length === 0) {
        const defaults = createDefaultAgents();
        defaults.forEach((profile: AgentProfile) => {
          const avatar = new Avatar(profile);
          studio.scene.add(avatar.group);
          avatarsRef.current.set(profile.id, avatar);
          voice.registerAvatar(profile.id, avatar);
          avatarOrderRef.current.push(profile.id);
        });
        return;
      }

      agentParts.slice(0, 3).forEach((p: any, i: number) => {
        const profile = createAgentFromParticipant(p, i);
        const avatar = new Avatar(profile);
        studio.scene.add(avatar.group);
        avatarsRef.current.set(p.userId, avatar);
        voice.registerAvatar(p.userId, avatar);
        avatarOrderRef.current.push(p.userId);
      });
    },
    [clearAvatars]
  );

  const init = useCallback(() => {
    const container = containerRef.current;
    if (!container || rendererRef.current) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    let webglRenderer: THREE.WebGLRenderer;
    try {
      const canvas = document.createElement("canvas");
      const testCtx = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!testCtx) {
        setWebglFailed(true);
        setIsReady(true);
        onReady?.();
        return;
      }
      webglRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      if (!webglRenderer.getContext()) {
        webglRenderer.dispose();
        setWebglFailed(true);
        setIsReady(true);
        onReady?.();
        return;
      }
    } catch {
      setWebglFailed(true);
      setIsReady(true);
      onReady?.();
      return;
    }
    webglRenderer.setSize(width, height);
    webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    webglRenderer.shadowMap.enabled = true;
    webglRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    webglRenderer.toneMappingExposure = 1.1;
    webglRenderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(webglRenderer.domElement);
    rendererRef.current = webglRenderer;

    const studio = new StudioScene();
    studioRef.current = studio;

    const camera = new CameraDirector();
    camera.resize(width, height);
    cameraRef.current = camera;

    const voice = new VoiceController((speakerId) => {
      if (speakerId) {
        const idx = avatarOrderRef.current.indexOf(speakerId);
        if (idx >= 0) camera.focusOnSpeaker(idx);
      } else {
        camera.goWide();
      }
    });
    voiceRef.current = voice;

    loadAvatarsFromParticipants(studio, voice, participants);

    setIsReady(true);
    onReady?.();
    clockRef.current.start();
    animate();
  }, [onReady, participants, loadAvatarsFromParticipants]);

  const animate = useCallback(() => {
    const renderer = rendererRef.current;
    const studio = studioRef.current;
    const camera = cameraRef.current;
    if (!renderer || !studio || !camera) return;

    const dt = clockRef.current.getDelta();
    const elapsed = clockRef.current.getElapsedTime();

    studio.update(elapsed);
    camera.update(dt, elapsed);
    avatarsRef.current.forEach((avatar) => avatar.update(dt, elapsed));

    renderer.render(studio.scene, camera.camera);
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    init();

    const handleResize = () => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.resize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      clearAvatars();
      rendererRef.current?.dispose();
      studioRef.current?.dispose();
      cameraRef.current?.dispose();
      voiceRef.current?.dispose();
      if (containerRef.current && rendererRef.current?.domElement) {
        try { containerRef.current.removeChild(rendererRef.current.domElement); } catch {}
      }
      rendererRef.current = null;
    };
  }, [init, clearAvatars]);

  useEffect(() => {
    if (!studioRef.current || !voiceRef.current) return;
    if (participants.length > 0) {
      const currentIds = avatarOrderRef.current.join(",");
      const newIds = participants.slice(0, 3).map((p: any) => p.userId).join(",");
      if (currentIds !== newIds) {
        loadAvatarsFromParticipants(studioRef.current, voiceRef.current, participants);
      }
    }
  }, [participants, loadAvatarsFromParticipants]);

  useEffect(() => {
    if (!currentSpeakerId || !cameraRef.current) return;
    const idx = avatarOrderRef.current.indexOf(currentSpeakerId);
    if (idx >= 0) {
      cameraRef.current.focusOnSpeaker(idx);
    }

    avatarsRef.current.forEach((avatar, id) => {
      avatar.setSpeaking(id === currentSpeakerId, id === currentSpeakerId ? 0.5 : 0);
    });
  }, [currentSpeakerId]);

  useEffect(() => {
    if (!voiceRef.current || events.length === 0) return;
    for (const event of events) {
      const eventKey = `${event.type}-${event.data?.participantId}-${event.data?.turnOrder || ""}`;
      if (processedEventsRef.current.has(eventKey)) continue;
      processedEventsRef.current.add(eventKey);

      if (event.type === "speech_ready" && event.data?.audioBase64) {
        const pid = event.data.participantId;
        voiceRef.current.playAudio(pid, event.data.audioBase64);
      }
    }
  }, [events]);

  const handleCameraPreset = useCallback(
    (preset: string) => {
      if (!cameraRef.current) return;
      switch (preset) {
        case "wide":
          cameraRef.current.goWide();
          break;
        case "dramatic":
          cameraRef.current.goDramatic();
          break;
        case "speaker0":
        case "speaker1":
        case "speaker2":
          cameraRef.current.focusOnSpeaker(parseInt(preset.replace("speaker", "")));
          break;
      }
    },
    []
  );

  const handleDemoSpeech = useCallback(() => {
    if (!voiceRef.current) return;
    const ids = avatarOrderRef.current;
    let delay = 0;
    ids.forEach((id) => {
      setTimeout(() => {
        voiceRef.current?.simulateSpeech(id, 3000 + Math.random() * 2000);
      }, delay);
      delay += 4000;
    });
  }, []);

  return (
    <div className="relative w-full h-full" data-testid="debate-studio-3d">
      <div
        ref={containerRef}
        className="w-full h-full bg-black"
        data-testid="canvas-container"
      />

      <div className="absolute top-3 left-3 flex items-center gap-2" data-testid="studio-overlay-top">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-red-400 tracking-wider">LIVE</span>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-black/50 border border-white/10 backdrop-blur-sm">
          <span className="text-xs text-white/70 font-medium">AI Debate Studio</span>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5" data-testid="camera-controls">
        {["wide", "speaker0", "speaker1", "speaker2", "dramatic"].map((preset) => (
          <button
            key={preset}
            onClick={() => handleCameraPreset(preset)}
            className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-white/80 hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
            data-testid={`button-camera-${preset}`}
          >
            {preset === "wide" ? "Wide" :
             preset === "dramatic" ? "Cinematic" :
             `Agent ${parseInt(preset.replace("speaker", "")) + 1}`}
          </button>
        ))}
        <button
          onClick={handleDemoSpeech}
          className="px-3 py-1.5 rounded-lg bg-purple-500/30 border border-purple-400/30 text-xs text-purple-300 hover:bg-purple-500/40 transition-all backdrop-blur-sm"
          data-testid="button-demo-speech"
        >
          Demo Speech
        </button>
      </div>

      {webglFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black" data-testid="webgl-fallback">
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-white">3D Studio Unavailable</h3>
            <p className="text-sm text-white/50 max-w-md">Your browser doesn't support WebGL rendering. The debate audio and transcript are still available in the sidebar.</p>
          </div>
        </div>
      )}

      {!isReady && !webglFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-white/60">Loading Studio...</span>
          </div>
        </div>
      )}
    </div>
  );
}
