import * as THREE from "three";
import gsap from "gsap";
import { AgentProfile, AvatarState, SEAT_POSITIONS, SEAT_ROTATIONS } from "./types";

export class Avatar {
  public group: THREE.Group;
  public state: AvatarState;
  public profile: AgentProfile;

  private head!: THREE.Group;
  private body!: THREE.Group;
  private jawMesh!: THREE.Mesh;
  private leftEyeLid!: THREE.Mesh;
  private rightEyeLid!: THREE.Mesh;
  private nameSprite!: THREE.Sprite;
  private speakingIndicator!: THREE.Mesh;
  private chairGroup!: THREE.Group;

  constructor(profile: AgentProfile) {
    this.profile = profile;
    this.group = new THREE.Group();
    this.state = {
      isSpeaking: false,
      audioLevel: 0,
      mouthOpenness: 0,
      blinkTimer: 2 + Math.random() * 4,
      blinkState: 0,
      breathPhase: Math.random() * Math.PI * 2,
      headNodPhase: Math.random() * Math.PI * 2,
      gesturePhase: Math.random() * Math.PI * 2,
      idleSwayPhase: Math.random() * Math.PI * 2,
    };

    this.buildAvatar();
    this.positionAtSeat();
  }

  private positionAtSeat(): void {
    const pos = SEAT_POSITIONS[this.profile.seatIndex];
    const rot = SEAT_ROTATIONS[this.profile.seatIndex];
    this.group.position.copy(pos);
    this.group.rotation.y = rot;
  }

  private buildAvatar(): void {
    this.buildChair();
    this.buildBody();
    this.buildHead();
    this.buildNameplate();
    this.buildSpeakingIndicator();
  }

  private buildChair(): void {
    this.chairGroup = new THREE.Group();
    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.6,
      roughness: 0.4,
    });

    const seatGeo = new THREE.BoxGeometry(0.5, 0.05, 0.5);
    const seat = new THREE.Mesh(seatGeo, chairMat);
    seat.position.y = 0.5;
    this.chairGroup.add(seat);

    const backGeo = new THREE.BoxGeometry(0.5, 0.6, 0.05);
    const back = new THREE.Mesh(backGeo, chairMat);
    back.position.set(0, 0.8, -0.22);
    this.chairGroup.add(back);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333355, metalness: 0.8 });
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.25, z);
      this.chairGroup.add(leg);
    });

    this.group.add(this.chairGroup);
  }

  private buildBody(): void {
    this.body = new THREE.Group();
    const skinTone = this.getSkinTone();
    const clothColor = this.profile.color;

    const torsoGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 12);
    const torsoMat = new THREE.MeshPhysicalMaterial({
      color: clothColor,
      metalness: 0.1,
      roughness: 0.7,
      clearcoat: 0.3,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.85;
    torso.castShadow = true;
    this.body.add(torso);

    const shoulderGeo = new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const shoulderMat = new THREE.MeshPhysicalMaterial({
      color: clothColor,
      metalness: 0.1,
      roughness: 0.7,
    });
    const shoulders = new THREE.Mesh(shoulderGeo, shoulderMat);
    shoulders.position.y = 1.15;
    shoulders.rotation.x = Math.PI;
    this.body.add(shoulders);

    const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
    const neckMat = new THREE.MeshStandardMaterial({
      color: skinTone,
      roughness: 0.8,
    });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.y = 1.22;
    this.body.add(neck);

    const buildArm = (side: number) => {
      const armGroup = new THREE.Group();

      const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8);
      const armMat = new THREE.MeshPhysicalMaterial({ color: clothColor, roughness: 0.7 });
      const upperArm = new THREE.Mesh(upperArmGeo, armMat);
      upperArm.position.y = -0.17;
      armGroup.add(upperArm);

      const forearmGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.3, 8);
      const forearm = new THREE.Mesh(forearmGeo, armMat);
      forearm.position.y = -0.4;
      forearm.rotation.x = -Math.PI / 4;
      armGroup.add(forearm);

      const handGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const handMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.8 });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.set(0, -0.55, 0.15);
      armGroup.add(hand);

      armGroup.position.set(side * 0.28, 1.1, 0);
      armGroup.rotation.z = side * 0.15;
      armGroup.userData.side = side;
      return armGroup;
    };

    this.body.add(buildArm(-1));
    this.body.add(buildArm(1));

    this.group.add(this.body);
  }

  private buildHead(): void {
    this.head = new THREE.Group();
    const skinTone = this.getSkinTone();
    const isFemale = this.profile.gender === "female";

    const headGeo = new THREE.SphereGeometry(0.16, 16, 12);
    if (isFemale) {
      headGeo.scale(0.95, 1.0, 0.95);
    }
    const headMat = new THREE.MeshPhysicalMaterial({
      color: skinTone,
      roughness: 0.7,
      clearcoat: 0.2,
      clearcoatRoughness: 0.5,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.castShadow = true;
    this.head.add(headMesh);

    const hairColor = this.getHairColor();
    if (isFemale) {
      const hairGeo = new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 0.02;
      this.head.add(hair);

      const sideHairGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.15, 8);
      const sideHairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
      [-1, 1].forEach((side) => {
        const sideHair = new THREE.Mesh(sideHairGeo, sideHairMat);
        sideHair.position.set(side * 0.14, -0.05, 0);
        this.head.add(sideHair);
      });
    } else {
      const hairGeo = new THREE.SphereGeometry(0.168, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = 0.02;
      this.head.add(hair);
    }

    const eyeWhiteGeo = new THREE.SphereGeometry(0.025, 8, 6);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f0 });
    const irisGeo = new THREE.SphereGeometry(0.012, 8, 6);
    const eyeColor = this.getEyeColor();
    const irisMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    const pupilGeo = new THREE.SphereGeometry(0.006, 6, 4);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    [-1, 1].forEach((side) => {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(side * 0.06, 0.02, 0.13);
      this.head.add(eyeWhite);

      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(side * 0.06, 0.02, 0.155);
      this.head.add(iris);

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.06, 0.02, 0.165);
      this.head.add(pupil);
    });

    const lidGeo = new THREE.PlaneGeometry(0.06, 0.015);
    const lidMat = new THREE.MeshBasicMaterial({
      color: skinTone,
      side: THREE.DoubleSide,
    });

    this.leftEyeLid = new THREE.Mesh(lidGeo, lidMat);
    this.leftEyeLid.position.set(-0.06, 0.035, 0.155);
    this.leftEyeLid.visible = false;
    this.head.add(this.leftEyeLid);

    this.rightEyeLid = new THREE.Mesh(lidGeo, lidMat);
    this.rightEyeLid.position.set(0.06, 0.035, 0.155);
    this.rightEyeLid.visible = false;
    this.head.add(this.rightEyeLid);

    const noseGeo = new THREE.ConeGeometry(0.02, 0.04, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.8 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.01, 0.16);
    nose.rotation.x = -Math.PI / 6;
    this.head.add(nose);

    const lipGeo = new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI);
    const lipMat = new THREE.MeshStandardMaterial({
      color: isFemale ? 0xcc6666 : 0xbb7766,
      roughness: 0.5,
    });
    const upperLip = new THREE.Mesh(lipGeo, lipMat);
    upperLip.position.set(0, -0.05, 0.135);
    upperLip.rotation.z = Math.PI;
    this.head.add(upperLip);

    const jawGeo = new THREE.SphereGeometry(0.03, 8, 4, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.4);
    const jawMat = new THREE.MeshStandardMaterial({
      color: isFemale ? 0xcc6666 : 0xbb7766,
      roughness: 0.5,
    });
    this.jawMesh = new THREE.Mesh(jawGeo, jawMat);
    this.jawMesh.position.set(0, -0.06, 0.125);
    this.head.add(this.jawMesh);

    if (this.profile.role === "host") {
      const earPieceGeo = new THREE.TorusGeometry(0.04, 0.005, 4, 12, Math.PI * 1.2);
      const earPieceMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
      });
      const earPiece = new THREE.Mesh(earPieceGeo, earPieceMat);
      earPiece.position.set(-0.15, 0.0, 0.03);
      earPiece.rotation.y = Math.PI / 2;
      this.head.add(earPiece);
    }

    this.head.position.y = 1.35;
    this.group.add(this.head);
  }

  private buildNameplate(): void {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "rgba(10, 10, 30, 0.85)";
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    ctx.strokeStyle = `#${this.profile.accentColor.getHexString()}`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, 254, 62, 8);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.profile.name, 128, 28);

    ctx.fillStyle = `#${this.profile.accentColor.getHexString()}`;
    ctx.font = "13px Inter, system-ui, sans-serif";
    ctx.fillText(this.profile.role.toUpperCase(), 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });
    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.scale.set(0.8, 0.2, 1);
    this.nameSprite.position.set(0, 0.2, 0);
    this.group.add(this.nameSprite);
  }

  private buildSpeakingIndicator(): void {
    const ringGeo = new THREE.RingGeometry(0.22, 0.24, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.speakingIndicator = new THREE.Mesh(ringGeo, ringMat);
    this.speakingIndicator.position.set(0, 1.35, 0.2);
    this.group.add(this.speakingIndicator);
  }

  setSpeaking(speaking: boolean, audioLevel: number = 0): void {
    this.state.isSpeaking = speaking;
    this.state.audioLevel = audioLevel;

    const mat = this.speakingIndicator.material as THREE.MeshBasicMaterial;
    gsap.to(mat, {
      opacity: speaking ? 0.6 : 0,
      duration: 0.3,
    });
  }

  update(dt: number, elapsed: number): void {
    this.updateBreathing(elapsed);
    this.updateBlinking(dt);
    this.updateMouth(elapsed);
    this.updateHeadMovement(elapsed);
    this.updateIdleSway(elapsed);
    this.updateSpeakingRing(elapsed);
  }

  private updateBreathing(elapsed: number): void {
    const breath = Math.sin(elapsed * 1.5 + this.state.breathPhase) * 0.003;
    this.body.position.y = breath;
    this.head.position.y = 1.35 + breath;
  }

  private updateBlinking(dt: number): void {
    this.state.blinkTimer -= dt;
    if (this.state.blinkTimer <= 0) {
      this.state.blinkState = 1;
      this.state.blinkTimer = 2 + Math.random() * 5;
      this.leftEyeLid.visible = true;
      this.rightEyeLid.visible = true;
      setTimeout(() => {
        this.leftEyeLid.visible = false;
        this.rightEyeLid.visible = false;
        this.state.blinkState = 0;
      }, 100 + Math.random() * 50);
    }
  }

  private updateMouth(elapsed: number): void {
    if (this.state.isSpeaking) {
      const speed = 8 + this.state.audioLevel * 4;
      const openness =
        (Math.sin(elapsed * speed) * 0.5 + 0.5) * 0.4 +
        (Math.sin(elapsed * speed * 1.7) * 0.5 + 0.5) * 0.3 +
        this.state.audioLevel * 0.3;
      this.state.mouthOpenness = THREE.MathUtils.lerp(
        this.state.mouthOpenness,
        openness,
        0.15
      );
    } else {
      this.state.mouthOpenness = THREE.MathUtils.lerp(this.state.mouthOpenness, 0, 0.1);
    }
    this.jawMesh.position.y = -0.06 - this.state.mouthOpenness * 0.02;
    this.jawMesh.scale.y = 1 + this.state.mouthOpenness * 0.5;
  }

  private updateHeadMovement(elapsed: number): void {
    if (this.state.isSpeaking) {
      const nodX = Math.sin(elapsed * 2.5 + this.state.headNodPhase) * 0.04;
      const nodY = Math.sin(elapsed * 1.8) * 0.03;
      this.head.rotation.x = nodX;
      this.head.rotation.y = nodY;
      this.head.rotation.z = Math.sin(elapsed * 1.2) * 0.02;
    } else {
      const lookX = Math.sin(elapsed * 0.5 + this.state.headNodPhase) * 0.02;
      const lookY = Math.sin(elapsed * 0.3) * 0.04;
      this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, lookX, 0.02);
      this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, lookY, 0.02);
      this.head.rotation.z = THREE.MathUtils.lerp(this.head.rotation.z, 0, 0.02);
    }
  }

  private updateIdleSway(elapsed: number): void {
    if (!this.state.isSpeaking) {
      const sway = Math.sin(elapsed * 0.4 + this.state.idleSwayPhase) * 0.005;
      this.body.rotation.z = sway;
    }
  }

  private updateSpeakingRing(elapsed: number): void {
    if (this.state.isSpeaking) {
      const scale = 1 + Math.sin(elapsed * 6) * 0.1 + this.state.audioLevel * 0.2;
      this.speakingIndicator.scale.set(scale, scale, 1);
    }
  }

  private getSkinTone(): number {
    switch (this.profile.role) {
      case "host": return 0xd4a574;
      case "analyst": return 0xe8c4a0;
      case "expert": return 0xc89070;
      default: return 0xd4a574;
    }
  }

  private getHairColor(): number {
    switch (this.profile.role) {
      case "host": return 0x2a1a0a;
      case "analyst": return 0x3a2010;
      case "expert": return 0x1a1a1a;
      default: return 0x2a1a0a;
    }
  }

  private getEyeColor(): number {
    switch (this.profile.role) {
      case "host": return 0x4488aa;
      case "analyst": return 0x448844;
      case "expert": return 0x664422;
      default: return 0x4488aa;
    }
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
        child.material.map?.dispose();
      }
    });
  }
}

export function createAgentFromParticipant(participant: any, seatIndex: number): AgentProfile {
  const ROLES: Array<"host" | "analyst" | "expert"> = ["host", "analyst", "expert"];
  const GENDERS: Array<"male" | "female" | "neutral"> = ["male", "female", "neutral"];
  const VOICES = ["onyx", "nova", "echo"];
  const COLORS = [
    { main: new THREE.Color(0x2244aa), accent: new THREE.Color(0x4488ff) },
    { main: new THREE.Color(0x6622aa), accent: new THREE.Color(0xaa66ff) },
    { main: new THREE.Color(0x226644), accent: new THREE.Color(0x44cc88) },
  ];

  const idx = Math.min(seatIndex, 2);
  const name = participant.user?.displayName || `Agent ${seatIndex + 1}`;

  return {
    id: participant.userId,
    name,
    role: ROLES[idx],
    gender: GENDERS[idx],
    voiceId: participant.ttsVoice || VOICES[idx],
    seatIndex: idx,
    color: COLORS[idx].main,
    accentColor: COLORS[idx].accent,
  };
}

export function createDefaultAgents(): AgentProfile[] {
  return [
    {
      id: "agent-host",
      name: "Marcus Chen",
      role: "host",
      gender: "male",
      voiceId: "onyx",
      seatIndex: 0,
      color: new THREE.Color(0x2244aa),
      accentColor: new THREE.Color(0x4488ff),
    },
    {
      id: "agent-analyst",
      name: "Dr. Sarah Mitchell",
      role: "analyst",
      gender: "female",
      voiceId: "nova",
      seatIndex: 1,
      color: new THREE.Color(0x6622aa),
      accentColor: new THREE.Color(0xaa66ff),
    },
    {
      id: "agent-expert",
      name: "Prof. Alex Rivera",
      role: "expert",
      gender: "neutral",
      voiceId: "echo",
      seatIndex: 2,
      color: new THREE.Color(0x226644),
      accentColor: new THREE.Color(0x44cc88),
    },
  ];
}
