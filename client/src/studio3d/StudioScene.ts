import * as THREE from "three";

export class StudioScene {
  public scene: THREE.Scene;
  public ambientLight!: THREE.AmbientLight;
  public keyLight!: THREE.SpotLight;
  public fillLight!: THREE.PointLight;
  public rimLight!: THREE.PointLight;
  public backLight!: THREE.DirectionalLight;
  private environmentGroup = new THREE.Group();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.04);
    this.buildLighting();
    this.buildFloor();
    this.buildTable();
    this.buildBackdrop();
    this.buildStudioProps();
    this.scene.add(this.environmentGroup);
  }

  private buildLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.6);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.SpotLight(0xffeedd, 3.0, 20, Math.PI / 5, 0.5, 1);
    this.keyLight.position.set(0, 6, 4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -0.002;
    this.keyLight.target.position.set(0, 1.2, 0);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.fillLight = new THREE.PointLight(0x4488ff, 1.0, 12);
    this.fillLight.position.set(-4, 3, 3);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xff6644, 0.8, 10);
    this.rimLight.position.set(4, 3, -2);
    this.scene.add(this.rimLight);

    this.backLight = new THREE.DirectionalLight(0x8866ff, 0.5);
    this.backLight.position.set(0, 4, -6);
    this.scene.add(this.backLight);

    const accentLeft = new THREE.PointLight(0x00ccff, 0.4, 8);
    accentLeft.position.set(-5, 1, -3);
    this.scene.add(accentLeft);

    const accentRight = new THREE.PointLight(0xff00cc, 0.3, 8);
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
    (gridHelper.material as THREE.Material).opacity = 0.3;
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

    const legPositions = [
      [-0.8, 0, -0.8],
      [0.8, 0, -0.8],
      [-0.8, 0, 0.8],
      [0.8, 0, 0.8],
    ];

    legPositions.forEach(([x, , z]) => {
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
        opacity: 0.15,
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
        opacity: 0.4,
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
      this.keyLight.intensity = 3.0 + Math.sin(elapsed * 0.5) * 0.1;
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
