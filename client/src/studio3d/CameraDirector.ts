import * as THREE from "three";
import gsap from "gsap";
import { CAMERA_PRESETS } from "./types";

export class CameraDirector {
  public camera: THREE.PerspectiveCamera;
  private currentTarget = new THREE.Vector3(0, 1.2, 0);
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private basePosition = new THREE.Vector3();
  private microMotion = { x: 0, y: 0, z: 0 };
  private activeSpeakerIndex: number = -1;
  private transitionTween: gsap.core.Tween | null = null;
  private autoSwitchEnabled = true;
  private lastSwitchTime = 0;
  private breathMotionPhase = 0;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100);
    this.setPreset("wide", false);
  }

  setPreset(
    presetName: keyof typeof CAMERA_PRESETS,
    animate: boolean = true
  ): void {
    const preset = CAMERA_PRESETS[presetName];
    if (!preset) return;

    this.targetPosition.copy(preset.position);
    this.targetLookAt.copy(preset.lookAt);

    if (animate) {
      this.animateTo(preset.position, preset.lookAt, 1.8);
    } else {
      this.camera.position.copy(preset.position);
      this.basePosition.copy(preset.position);
      this.currentTarget.copy(preset.lookAt);
      this.camera.lookAt(this.currentTarget);
    }
  }

  focusOnSpeaker(speakerIndex: number): void {
    if (speakerIndex === this.activeSpeakerIndex) return;
    this.activeSpeakerIndex = speakerIndex;
    this.lastSwitchTime = performance.now();

    const presetKey = `speaker${speakerIndex}` as keyof typeof CAMERA_PRESETS;
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) {
      this.setPreset("wide");
      return;
    }

    const useOverShoulder = Math.random() > 0.6;
    if (useOverShoulder && speakerIndex !== 1) {
      const overKey = speakerIndex === 0 ? "overShoulder01" : "overShoulder12";
      this.setPreset(overKey as keyof typeof CAMERA_PRESETS);
    } else {
      this.animateTo(preset.position, preset.lookAt, 2.0);
    }
  }

  goWide(): void {
    this.activeSpeakerIndex = -1;
    this.setPreset("wide");
  }

  goDramatic(): void {
    this.setPreset("dramatic");
  }

  private animateTo(
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    duration: number
  ): void {
    if (this.transitionTween) this.transitionTween.kill();

    const startPos = this.basePosition.clone();
    const startLook = this.currentTarget.clone();
    const progress = { t: 0 };

    this.transitionTween = gsap.to(progress, {
      t: 1,
      duration,
      ease: "power2.inOut",
      onUpdate: () => {
        this.basePosition.lerpVectors(startPos, position, progress.t);
        this.currentTarget.lerpVectors(startLook, lookAt, progress.t);
      },
    });
  }

  update(dt: number, elapsed: number): void {
    this.breathMotionPhase += dt * 0.5;
    this.microMotion.x = Math.sin(this.breathMotionPhase * 0.7) * 0.008;
    this.microMotion.y = Math.sin(this.breathMotionPhase * 0.5) * 0.005;
    this.microMotion.z = Math.sin(this.breathMotionPhase * 0.3) * 0.003;

    this.camera.position.set(
      this.basePosition.x + this.microMotion.x,
      this.basePosition.y + this.microMotion.y,
      this.basePosition.z + this.microMotion.z
    );

    this.camera.lookAt(
      this.currentTarget.x + this.microMotion.x * 0.3,
      this.currentTarget.y + this.microMotion.y * 0.3,
      this.currentTarget.z
    );
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    if (this.transitionTween) this.transitionTween.kill();
  }
}
