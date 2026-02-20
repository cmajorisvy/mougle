import * as THREE from "three";

export class StudioScene {
  public scene: THREE.Scene;
  public ambientLight!: THREE.AmbientLight;
  public keyLight!: THREE.SpotLight;
  public fillLight!: THREE.SpotLight;
  public rimLight!: THREE.SpotLight;
  public backLight!: THREE.DirectionalLight;
  public warmRimLeft!: THREE.PointLight;
  public warmRimRight!: THREE.PointLight;
  private environmentGroup = new THREE.Group();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080818, 0.035);
    this.buildEnvironmentLighting();
    this.buildStudioLighting();
    this.buildFloor();
    this.buildTable();
    this.buildBackdrop();
    this.buildStudioProps();
    this.scene.add(this.environmentGroup);
  }

  private buildEnvironmentLighting(): void {
    const envMap = new THREE.CubeTextureLoader();
    const pmremGenerator = (() => {
      const size = 64;
      const data = new Float32Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const ny = y / size;
          const r = 0.02 + ny * 0.04;
          const g = 0.02 + ny * 0.03;
          const b = 0.04 + ny * 0.08;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 1;
        }
      }
      const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
      tex.needsUpdate = true;
      return tex;
    })();

    this.scene.environment = null;
    this.scene.background = new THREE.Color(0x060612);

    this.ambientLight = new THREE.AmbientLight(0x161630, 0.4);
    this.scene.add(this.ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x2233aa, 0x110808, 0.25);
    this.scene.add(hemiLight);
  }

  private buildStudioLighting(): void {
    this.keyLight = new THREE.SpotLight(0xffeedd, 4.0, 25, Math.PI / 6, 0.6, 1.2);
    this.keyLight.position.set(2, 6, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.bias = -0.001;
    this.keyLight.shadow.radius = 4;
    this.keyLight.target.position.set(0, 1.2, 0);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLight = new THREE.SpotLight(0x6688cc, 1.5, 20, Math.PI / 4, 0.7, 1.5);
    this.fillLight.position.set(-4, 4, 4);
    this.fillLight.castShadow = true;
    this.fillLight.shadow.mapSize.set(1024, 1024);
    this.fillLight.shadow.bias = -0.002;
    this.fillLight.shadow.radius = 8;
    this.fillLight.target.position.set(0, 1.2, 0);
    this.scene.add(this.fillLight);
    this.scene.add(this.fillLight.target);

    this.rimLight = new THREE.SpotLight(0xff8855, 2.0, 18, Math.PI / 5, 0.5, 1.0);
    this.rimLight.position.set(3, 4, -3);
    this.rimLight.castShadow = false;
    this.rimLight.target.position.set(0, 1.2, 0);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    this.backLight = new THREE.DirectionalLight(0x6644cc, 0.6);
    this.backLight.position.set(0, 5, -6);
    this.scene.add(this.backLight);

    this.warmRimLeft = new THREE.PointLight(0xffaa66, 0.5, 8, 2);
    this.warmRimLeft.position.set(-3, 2, -1);
    this.scene.add(this.warmRimLeft);

    this.warmRimRight = new THREE.PointLight(0xffaa66, 0.5, 8, 2);
    this.warmRimRight.position.set(3, 2, -1);
    this.scene.add(this.warmRimRight);

    const hairLight = new THREE.SpotLight(0xffffff, 1.0, 12, Math.PI / 8, 0.8, 2);
    hairLight.position.set(0, 7, -2);
    hairLight.target.position.set(0, 1.4, 0);
    this.scene.add(hairLight);
    this.scene.add(hairLight.target);

    const accentLeft = new THREE.PointLight(0x0088ff, 0.3, 8);
    accentLeft.position.set(-5, 1, -3);
    this.scene.add(accentLeft);

    const accentRight = new THREE.PointLight(0xff0088, 0.2, 8);
    accentRight.position.set(5, 1, -3);
    this.scene.add(accentRight);
  }

  private buildFloor(): void {
    const floorGeo = new THREE.CircleGeometry(12, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d1a,
      metalness: 0.8,
      roughness: 0.3,
      envMapIntensity: 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.environmentGroup.add(floor);

    const gridHelper = new THREE.GridHelper(20, 40, 0x1a1a3a, 0x111128);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    this.environmentGroup.add(gridHelper);
  }

  private buildTable(): void {
    const tableGroup = new THREE.Group();

    const topGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.06, 48);
    const topMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2e,
      metalness: 0.4,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 0.8,
    });
    const tableTop = new THREE.Mesh(topGeo, topMat);
    tableTop.position.y = 0.85;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const edgeGeo = new THREE.TorusGeometry(1.6, 0.02, 8, 48);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.2,
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.88;
    tableGroup.add(edge);

    const legGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.85, 12);
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x222244,
      metalness: 0.7,
      roughness: 0.3,
    });

    [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.425, z);
      leg.castShadow = true;
      tableGroup.add(leg);
    });

    const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.05, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.6,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.025;
    tableGroup.add(base);

    this.environmentGroup.add(tableGroup);
  }

  private buildBackdrop(): void {
    const backdropGeo = new THREE.PlaneGeometry(20, 8, 32, 16);
    const backdropMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a20,
      metalness: 0.3,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
    backdrop.position.set(0, 4, -5);
    this.environmentGroup.add(backdrop);

    const panelCount = 5;
    for (let i = 0; i < panelCount; i++) {
      const pw = 1.5 + Math.random() * 1.5;
      const ph = 0.8 + Math.random() * 1.2;
      const panelGeo = new THREE.PlaneGeometry(pw, ph);
      const hue = 0.55 + Math.random() * 0.15;
      const panelMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.6, 0.08),
        emissive: new THREE.Color().setHSL(hue, 0.8, 0.04),
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.6,
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(
        -5 + i * 2.5 + (Math.random() - 0.5) * 0.5,
        2 + Math.random() * 3,
        -4.8 + Math.random() * 0.3
      );
      panel.userData.floatSpeed = 0.3 + Math.random() * 0.5;
      panel.userData.floatOffset = Math.random() * Math.PI * 2;
      this.environmentGroup.add(panel);
    }

    for (let i = 0; i < 3; i++) {
      const stripGeo = new THREE.PlaneGeometry(0.02, 8);
      const stripMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.12,
      });
      const strip = new THREE.Mesh(stripGeo, stripMat);
      strip.position.set(-3 + i * 3, 4, -4.7);
      this.environmentGroup.add(strip);
    }
  }

  private buildStudioProps(): void {
    for (let i = 0; i < 3; i++) {
      const lightHousing = new THREE.Group();
      const housingGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 12);
      const housingMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.8,
        roughness: 0.3,
      });
      const housing = new THREE.Mesh(housingGeo, housingMat);
      lightHousing.add(housing);

      const lensGeo = new THREE.CircleGeometry(0.14, 16);
      const lensMat = new THREE.MeshBasicMaterial({
        color: i === 1 ? 0xffeedd : 0x4488ff,
        transparent: true,
        opacity: 0.3,
      });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.y = -0.16;
      lens.rotation.x = Math.PI / 2;
      lightHousing.add(lens);

      lightHousing.position.set(-3 + i * 3, 5.5, 2);
      lightHousing.rotation.x = Math.PI / 6;
      this.environmentGroup.add(lightHousing);

      const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(-3 + i * 3, 6.2, 1.5);
      arm.rotation.z = Math.PI / 12;
      this.environmentGroup.add(arm);
    }

    const logoGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 32);
    const logoMat = new THREE.MeshStandardMaterial({
      color: 0x6644ff,
      emissive: 0x4422cc,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const logo = new THREE.Mesh(logoGeo, logoMat);
    logo.position.set(0, 6, -4.5);
    logo.rotation.x = Math.PI / 2;
    this.environmentGroup.add(logo);
  }

  update(elapsed: number): void {
    this.environmentGroup.children.forEach((child) => {
      if (child.userData.floatSpeed) {
        child.position.y +=
          Math.sin(elapsed * child.userData.floatSpeed + child.userData.floatOffset) * 0.001;
      }
    });

    if (this.keyLight) {
      this.keyLight.intensity = 4.0 + Math.sin(elapsed * 0.3) * 0.08;
    }
    if (this.warmRimLeft) {
      this.warmRimLeft.intensity = 0.5 + Math.sin(elapsed * 0.4) * 0.05;
    }
    if (this.warmRimRight) {
      this.warmRimRight.intensity = 0.5 + Math.sin(elapsed * 0.4 + 1) * 0.05;
    }
  }

  dispose(): void {
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
