import * as THREE from "three";
import gsap from "gsap";
import { AgentProfile, AvatarState, SEAT_POSITIONS, SEAT_ROTATIONS } from "./types";
import { fbm } from "./PerlinNoise";

export class Avatar {
  public group: THREE.Group;
  public state: AvatarState;
  public profile: AgentProfile;

  private head!: THREE.Group;
  private body!: THREE.Group;
  private jawMesh!: THREE.Mesh;
  private leftEyeLid!: THREE.Mesh;
  private rightEyeLid!: THREE.Mesh;
  private leftIris!: THREE.Mesh;
  private rightIris!: THREE.Mesh;
  private leftPupil!: THREE.Mesh;
  private rightPupil!: THREE.Mesh;
  private leftCornea!: THREE.Mesh;
  private rightCornea!: THREE.Mesh;
  private leftSpecular!: THREE.Mesh;
  private rightSpecular!: THREE.Mesh;
  private nameSprite!: THREE.Sprite;
  private speakingIndicator!: THREE.Mesh;
  private chairGroup!: THREE.Group;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private shoulders!: THREE.Mesh;
  private noiseOffset: number;

  constructor(profile: AgentProfile) {
    this.profile = profile;
    this.group = new THREE.Group();
    this.noiseOffset = Math.random() * 1000;
    this.state = {
      isSpeaking: false,
      audioLevel: 0,
      mouthOpenness: 0,
      mouthVelocity: 0,
      blinkTimer: 2 + Math.random() * 4,
      blinkState: 0,
      blinkDuration: 0,
      nextBlinkLeft: Math.random() > 0.5,
      breathPhase: Math.random() * Math.PI * 2,
      headNodPhase: Math.random() * Math.PI * 2,
      gesturePhase: Math.random() * Math.PI * 2,
      idleSwayPhase: Math.random() * Math.PI * 2,
      saccadeTimer: 3 + Math.random() * 4,
      saccadeTarget: { x: 0, y: 0 },
      saccadeCurrent: { x: 0, y: 0 },
      saccadeTimer2: 0,
      listenTargetId: null,
      listenNodPhase: 0,
      listenNodActive: false,
      listenNodTimer: 0,
      postureShiftTimer: 8 + Math.random() * 12,
      postureOffset: { x: 0, z: 0 },
      lipSyncDelay: 80 + Math.random() * 40,
      delayedAudioLevel: 0,
    } as AvatarState;

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
    this.shoulders = new THREE.Mesh(shoulderGeo, shoulderMat);
    this.shoulders.position.y = 1.15;
    this.shoulders.rotation.x = Math.PI;
    this.body.add(this.shoulders);

    const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
    const neckMat = new THREE.MeshPhysicalMaterial({
      color: skinTone,
      roughness: 0.6,
      clearcoat: 0.15,
      clearcoatRoughness: 0.8,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xff8866),
    });
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.y = 1.22;
    this.body.add(neck);

    const buildArm = (side: number): THREE.Group => {
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
      const handMat = new THREE.MeshPhysicalMaterial({
        color: skinTone,
        roughness: 0.6,
        clearcoat: 0.15,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xff8866),
      });
      const hand = new THREE.Mesh(handGeo, handMat);
      hand.position.set(0, -0.55, 0.15);
      armGroup.add(hand);

      armGroup.position.set(side * 0.28, 1.1, 0);
      armGroup.rotation.z = side * 0.15;
      return armGroup;
    };

    this.leftArm = buildArm(-1);
    this.rightArm = buildArm(1);
    this.body.add(this.leftArm);
    this.body.add(this.rightArm);

    this.group.add(this.body);
  }

  private buildHead(): void {
    this.head = new THREE.Group();
    const skinTone = this.getSkinTone();
    const skinColor = new THREE.Color(skinTone);
    const isFemale = this.profile.gender === "female";

    const headGeo = new THREE.SphereGeometry(0.16, 24, 18);
    if (isFemale) {
      headGeo.scale(0.95, 1.0, 0.95);
    }
    const headMat = new THREE.MeshPhysicalMaterial({
      color: skinColor,
      roughness: 0.55,
      clearcoat: 0.25,
      clearcoatRoughness: 0.6,
      sheen: 0.4,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xff6644).lerp(skinColor, 0.5),
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

    this.buildRealisticEyes(skinColor, isFemale);

    const noseGeo = new THREE.ConeGeometry(0.02, 0.04, 6);
    const noseMat = new THREE.MeshPhysicalMaterial({
      color: skinColor,
      roughness: 0.6,
      clearcoat: 0.2,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xff8866),
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.01, 0.16);
    nose.rotation.x = -Math.PI / 6;
    this.head.add(nose);

    const lipColor = isFemale ? 0xcc6666 : 0xbb7766;
    const lipGeo = new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI);
    const lipMat = new THREE.MeshPhysicalMaterial({
      color: lipColor,
      roughness: 0.35,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
    });
    const upperLip = new THREE.Mesh(lipGeo, lipMat);
    upperLip.position.set(0, -0.05, 0.135);
    upperLip.rotation.z = Math.PI;
    this.head.add(upperLip);

    const jawGeo = new THREE.SphereGeometry(0.03, 8, 4, 0, Math.PI * 2, Math.PI * 0.3, Math.PI * 0.4);
    const jawMat = new THREE.MeshPhysicalMaterial({
      color: lipColor,
      roughness: 0.35,
      clearcoat: 0.5,
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

  private buildRealisticEyes(skinColor: THREE.Color, isFemale: boolean): void {
    const eyeColor = this.getEyeColor();

    [-1, 1].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.06, 0.02, 0.13);

      const scleraGeo = new THREE.SphereGeometry(0.026, 16, 12);
      const scleraMat = new THREE.MeshPhysicalMaterial({
        color: 0xf8f4f0,
        roughness: 0.3,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        sheen: 0.2,
        sheenColor: new THREE.Color(0xffe0d0),
      });
      const sclera = new THREE.Mesh(scleraGeo, scleraMat);
      eyeGroup.add(sclera);

      const irisGeo = new THREE.CircleGeometry(0.014, 24);
      const irisMat = new THREE.MeshPhysicalMaterial({
        color: eyeColor,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.025;
      eyeGroup.add(iris);
      if (side === -1) this.leftIris = iris;
      else this.rightIris = iris;

      const pupilGeo = new THREE.CircleGeometry(0.006, 16);
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.0255;
      eyeGroup.add(pupil);
      if (side === -1) this.leftPupil = pupil;
      else this.rightPupil = pupil;

      const corneaGeo = new THREE.SphereGeometry(0.017, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);
      const corneaMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.0,
        metalness: 0.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        ior: 1.376,
        transmission: 0.6,
      });
      const cornea = new THREE.Mesh(corneaGeo, corneaMat);
      cornea.position.z = 0.015;
      cornea.rotation.x = -Math.PI / 2;
      eyeGroup.add(cornea);
      if (side === -1) this.leftCornea = cornea;
      else this.rightCornea = cornea;

      const specGeo = new THREE.CircleGeometry(0.004, 8);
      const specMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.7,
      });
      const spec = new THREE.Mesh(specGeo, specMat);
      spec.position.set(0.004, 0.005, 0.027);
      eyeGroup.add(spec);
      if (side === -1) this.leftSpecular = spec;
      else this.rightSpecular = spec;

      this.head.add(eyeGroup);
    });

    const lidGeo = new THREE.PlaneGeometry(0.065, 0.018);
    const lidMat = new THREE.MeshPhysicalMaterial({
      color: skinColor,
      side: THREE.DoubleSide,
      roughness: 0.5,
      clearcoat: 0.15,
    });

    this.leftEyeLid = new THREE.Mesh(lidGeo, lidMat);
    this.leftEyeLid.position.set(-0.06, 0.035, 0.157);
    this.leftEyeLid.visible = false;
    this.head.add(this.leftEyeLid);

    this.rightEyeLid = new THREE.Mesh(lidGeo, lidMat);
    this.rightEyeLid.position.set(0.06, 0.035, 0.157);
    this.rightEyeLid.visible = false;
    this.head.add(this.rightEyeLid);
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

  setListenTarget(targetId: string | null, targetSeatIndex: number = -1): void {
    this.state.listenTargetId = targetId;
    this._listenSeatIndex = targetSeatIndex;
  }

  private _listenSeatIndex: number = -1;

  update(dt: number, elapsed: number): void {
    this.updatePerlinMicroMotion(elapsed);
    this.updateBreathing(elapsed);
    this.updateAsymmetricBlinking(dt);
    this.updateEyeSaccades(dt, elapsed);
    this.updateMouthWithOvershoot(dt, elapsed);
    this.updateHeadMovement(elapsed);
    this.updateListeningBehavior(dt, elapsed);
    this.updatePostureMicroAdjust(dt, elapsed);
    this.updateSpecularHighlights(elapsed);
    this.updateSpeakingRing(elapsed);
  }

  private updatePerlinMicroMotion(elapsed: number): void {
    const t = elapsed * 0.3;
    const n = this.noiseOffset;

    const headNoiseX = fbm(t + n, 0, 0) * 0.006;
    const headNoiseY = fbm(0, t + n, 0) * 0.004;
    const headNoiseZ = fbm(0, 0, t + n) * 0.003;
    this.head.position.x = headNoiseX;
    this.head.position.z = headNoiseZ;

    const shoulderNoiseX = fbm(t * 0.5 + n + 100, 0, 0) * 0.003;
    const shoulderNoiseZ = fbm(0, 0, t * 0.5 + n + 100) * 0.002;
    this.shoulders.position.x = shoulderNoiseX;
    this.shoulders.position.z = 0 + shoulderNoiseZ;
  }

  private updateBreathing(elapsed: number): void {
    const breathCycle = elapsed * 1.2 + this.state.breathPhase;
    const inhale = Math.pow(Math.sin(breathCycle), 2) * 0.004;
    const exhale = Math.sin(breathCycle * 2) * 0.001;
    const breath = inhale + exhale;

    this.body.position.y = breath;
    this.head.position.y = 1.35 + breath;

    this.shoulders.scale.x = 1 + Math.sin(breathCycle) * 0.008;
    this.shoulders.scale.z = 1 + Math.sin(breathCycle) * 0.005;
  }

  private updateAsymmetricBlinking(dt: number): void {
    this.state.blinkTimer -= dt;
    if (this.state.blinkTimer <= 0) {
      const isDouble = Math.random() < 0.15;
      const isAsymmetric = Math.random() < 0.25;
      this.state.blinkDuration = 80 + Math.random() * 60;

      this.leftEyeLid.visible = true;
      if (!isAsymmetric) {
        this.rightEyeLid.visible = true;
      }

      setTimeout(() => {
        this.leftEyeLid.visible = false;
        this.rightEyeLid.visible = false;

        if (isDouble) {
          setTimeout(() => {
            this.leftEyeLid.visible = true;
            this.rightEyeLid.visible = true;
            setTimeout(() => {
              this.leftEyeLid.visible = false;
              this.rightEyeLid.visible = false;
            }, 60 + Math.random() * 30);
          }, 120 + Math.random() * 60);
        }
      }, this.state.blinkDuration);

      if (this.state.isSpeaking) {
        this.state.blinkTimer = 1.5 + Math.random() * 2.5;
      } else {
        this.state.blinkTimer = 3 + Math.random() * 4;
      }
    }
  }

  private updateEyeSaccades(dt: number, elapsed: number): void {
    this.state.saccadeTimer -= dt;
    if (this.state.saccadeTimer <= 0) {
      this.state.saccadeTarget = {
        x: (Math.random() - 0.5) * 0.006,
        y: (Math.random() - 0.5) * 0.004,
      };
      this.state.saccadeTimer = 3 + Math.random() * 4;
    }

    const saccadeSpeed = 0.08;
    this.state.saccadeCurrent.x += (this.state.saccadeTarget.x - this.state.saccadeCurrent.x) * saccadeSpeed;
    this.state.saccadeCurrent.y += (this.state.saccadeTarget.y - this.state.saccadeCurrent.y) * saccadeSpeed;

    const microTremor = {
      x: Math.sin(elapsed * 30 + this.noiseOffset) * 0.0003,
      y: Math.cos(elapsed * 25 + this.noiseOffset) * 0.0002,
    };

    const offsetX = this.state.saccadeCurrent.x + microTremor.x;
    const offsetY = this.state.saccadeCurrent.y + microTremor.y;

    if (this.leftIris) {
      this.leftIris.position.x = offsetX;
      this.leftIris.position.y = offsetY;
    }
    if (this.rightIris) {
      this.rightIris.position.x = offsetX;
      this.rightIris.position.y = offsetY;
    }
    if (this.leftPupil) {
      this.leftPupil.position.x = offsetX;
      this.leftPupil.position.y = offsetY;
    }
    if (this.rightPupil) {
      this.rightPupil.position.x = offsetX;
      this.rightPupil.position.y = offsetY;
    }
  }

  private updateMouthWithOvershoot(dt: number, elapsed: number): void {
    if (this.state.isSpeaking) {
      const speed = 8 + this.state.audioLevel * 4;
      const targetOpenness =
        (Math.sin(elapsed * speed) * 0.5 + 0.5) * 0.4 +
        (Math.sin(elapsed * speed * 1.7) * 0.5 + 0.5) * 0.3 +
        this.state.audioLevel * 0.3;

      const overshoot = 1.15;
      const damping = 0.12;
      const diff = targetOpenness * overshoot - this.state.mouthOpenness;
      this.state.mouthVelocity += diff * 0.3;
      this.state.mouthVelocity *= (1 - damping);
      this.state.mouthOpenness += this.state.mouthVelocity;
      this.state.mouthOpenness = THREE.MathUtils.clamp(this.state.mouthOpenness, 0, 1);
    } else {
      this.state.mouthVelocity *= 0.85;
      this.state.mouthOpenness = THREE.MathUtils.lerp(this.state.mouthOpenness, 0, 0.08);
    }

    this.jawMesh.position.y = -0.06 - this.state.mouthOpenness * 0.025;
    this.jawMesh.scale.y = 1 + this.state.mouthOpenness * 0.6;
    this.jawMesh.scale.x = 1 + this.state.mouthOpenness * 0.15;
  }

  private updateHeadMovement(elapsed: number): void {
    if (this.state.isSpeaking) {
      const t = elapsed + this.state.headNodPhase;
      const nodX = Math.sin(t * 2.5) * 0.04 + fbm(t, 0.5, 0) * 0.02;
      const nodY = Math.sin(t * 1.8) * 0.03 + fbm(0, t, 0.5) * 0.02;
      const nodZ = Math.sin(t * 1.2) * 0.02;
      this.head.rotation.x = nodX;
      this.head.rotation.y = nodY;
      this.head.rotation.z = nodZ;
    } else if (!this.state.listenTargetId) {
      const lookX = Math.sin(elapsed * 0.5 + this.state.headNodPhase) * 0.02;
      const lookY = Math.sin(elapsed * 0.3) * 0.04;
      this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, lookX, 0.02);
      this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, lookY, 0.02);
      this.head.rotation.z = THREE.MathUtils.lerp(this.head.rotation.z, 0, 0.02);
    }
  }

  private updateListeningBehavior(dt: number, elapsed: number): void {
    if (!this.state.listenTargetId || this.state.isSpeaking) return;

    const speakerSeatIdx = this.getSpeakerSeatIndex(this.state.listenTargetId);
    if (speakerSeatIdx < 0) return;

    const mySeat = SEAT_POSITIONS[this.profile.seatIndex];
    const theirSeat = SEAT_POSITIONS[speakerSeatIdx];
    const dir = new THREE.Vector3().subVectors(theirSeat, mySeat);
    const targetAngleY = Math.atan2(dir.x, dir.z) - SEAT_ROTATIONS[this.profile.seatIndex];
    const clampedAngle = THREE.MathUtils.clamp(targetAngleY, -0.4, 0.4);

    this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, clampedAngle, 0.03);
    this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, -0.02, 0.02);

    this.state.listenNodTimer -= dt;
    if (this.state.listenNodTimer <= 0 && !this.state.listenNodActive) {
      this.state.listenNodActive = true;
      this.state.listenNodPhase = elapsed;
      this.state.listenNodTimer = 2 + Math.random() * 5;
    }

    if (this.state.listenNodActive) {
      const nodElapsed = elapsed - this.state.listenNodPhase;
      if (nodElapsed < 1.2) {
        const nod = Math.sin(nodElapsed * Math.PI * 2.5) * 0.03;
        this.head.rotation.x += nod;
      } else {
        this.state.listenNodActive = false;
      }
    }

    this.state.saccadeTarget = {
      x: clampedAngle * 0.3 + (Math.random() - 0.5) * 0.002,
      y: (Math.random() - 0.5) * 0.002,
    };
  }

  private updatePostureMicroAdjust(dt: number, elapsed: number): void {
    if (this.state.isSpeaking) return;

    this.state.postureShiftTimer -= dt;
    if (this.state.postureShiftTimer <= 0) {
      this.state.postureOffset = {
        x: (Math.random() - 0.5) * 0.008,
        z: (Math.random() - 0.5) * 0.006,
      };
      this.state.postureShiftTimer = 8 + Math.random() * 12;
    }

    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, this.state.postureOffset.x, 0.005);
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, this.state.postureOffset.z, 0.005);

    const armSway = fbm(elapsed * 0.2 + this.noiseOffset + 200, 0, 0) * 0.015;
    this.leftArm.rotation.z = -0.15 + armSway;
    this.rightArm.rotation.z = 0.15 - armSway;
  }

  private updateSpecularHighlights(elapsed: number): void {
    const sx = Math.sin(elapsed * 0.4) * 0.003 + 0.004;
    const sy = Math.cos(elapsed * 0.3) * 0.002 + 0.005;
    if (this.leftSpecular) {
      this.leftSpecular.position.x = sx;
      this.leftSpecular.position.y = sy;
    }
    if (this.rightSpecular) {
      this.rightSpecular.position.x = sx;
      this.rightSpecular.position.y = sy;
    }
  }

  private updateSpeakingRing(elapsed: number): void {
    if (this.state.isSpeaking) {
      const scale = 1 + Math.sin(elapsed * 6) * 0.1 + this.state.audioLevel * 0.2;
      this.speakingIndicator.scale.set(scale, scale, 1);
    }
  }

  private getSpeakerSeatIndex(speakerId: string): number {
    return this._listenSeatIndex;
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
