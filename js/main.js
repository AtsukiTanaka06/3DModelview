// 3D 空間体験のためのメインスクリプト
document.addEventListener("DOMContentLoaded", () => {
  // プリローダー
  const preloader = document.querySelector(".preloader");
  if (preloader) {
    window.addEventListener("load", () => {
      preloader.classList.add("fade-out");
      setTimeout(() => {
        preloader.style.display = "none";
      }, 500);
    });
  }

  // 変数の初期化
  let scene, camera, renderer;
  let currentColorScheme = "purple";
  let shapes = [];
  let rotationSpeed = 0.005;
  let isAutoRotating = true;
  let autoRotateSpeed = 0.0005;
  let shapeGroups = {};
  let targetPosition = new THREE.Vector3(0, 0, 0);
  let currentFocus = null;

  let colorSchemes = {
    purple: [
      new THREE.Color(0x8236ff), // 紫
      new THREE.Color(0x5e17eb), // 濃い紫
      new THREE.Color(0xaa5eef), // 薄い紫
      new THREE.Color(0x3c096c), // 暗い紫
      new THREE.Color(0xd6adff), // 淡い紫
    ],
    blue: [
      new THREE.Color(0x1fe1ff), // 青
      new THREE.Color(0x0091ff), // 濃い青
      new THREE.Color(0x29b6f6), // 薄い青
      new THREE.Color(0x006494), // 暗い青
      new THREE.Color(0xacf0ff), // 淡い青
    ],
    green: [
      new THREE.Color(0x00ff9d), // 緑
      new THREE.Color(0x00c853), // 濃い緑
      new THREE.Color(0x69f0ae), // 薄い緑
      new THREE.Color(0x2e7d32), // 暗い緑
      new THREE.Color(0xb9f6ca), // 淡い緑
    ],
    red: [
      new THREE.Color(0xff3a3a), // 赤
      new THREE.Color(0xd50000), // 濃い赤
      new THREE.Color(0xff6e6e), // 薄い赤
      new THREE.Color(0x8b0000), // 暗い赤
      new THREE.Color(0xffcdd2), // 淡い赤
    ],
    orange: [
      new THREE.Color(0xffa000), // オレンジ
      new THREE.Color(0xff7700), // 濃いオレンジ
      new THREE.Color(0xffb74d), // 薄いオレンジ
      new THREE.Color(0xe65100), // 暗いオレンジ
      new THREE.Color(0xffe0b2), // 淡いオレンジ
    ],
    gold: [
      new THREE.Color(0xffd700), // 金色
      new THREE.Color(0xdaa520), // 濃い金色
      new THREE.Color(0xffdf00), // 明るい金色
      new THREE.Color(0xb8860b), // 暗い金色
      new THREE.Color(0xffec8b), // 淡い金色
    ],
    silver: [
      new THREE.Color(0xc0c0c0), // 銀色
      new THREE.Color(0xa9a9a9), // 濃い銀色
      new THREE.Color(0xd3d3d3), // 明るい銀色
      new THREE.Color(0x696969), // 暗い銀色
      new THREE.Color(0xe8e8e8), // 淡い銀色
    ],
  };

  // カスタムカラー用の初期色（紫系）
  let customBaseColor = new THREE.Color(0x8236ff);

  // カメラ用の変数
  let cameraPosition = new THREE.Vector3(0, 0, 20); // 初期位置をより近くに設定
  let cameraLookAt = new THREE.Vector3(0, 0, 0);
  const MIN_ZOOM = 50;
  const MAX_ZOOM = 100; // 最大ズームアウト距離も制限
  const HOME_ZOOM = 5; // ホームボタン押下時のカメラ距離

  // タッチ制御用
  let isDragging = false;
  let previousTouchX = 0;
  let previousTouchY = 0;
  let hammerManager;

  // 初期化
  init();

  // 初期化関数
  function init() {
    // シーン作成
    scene = new THREE.Scene();

    // カメラ設定
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraLookAt);

    // レンダラー設定
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x16101e, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // ウィンドウリサイズ対応
    window.addEventListener("resize", onWindowResize);

    // デスクトップ用イベントリスナー
    if (window.matchMedia("(hover: hover)").matches) {
      document.addEventListener("mousemove", onDocumentMouseMove);
      document.addEventListener("wheel", onDocumentWheel);
    }

    // モバイル用タッチイベント
    setupTouchEvents();

    // 星空背景の作成
    createStarfield();

    // 各種形状を作成
    createShapes();

    // ライト追加
    addLights();

    // コントロール設定
    setupControls();

    // アニメーション開始
    animate();

    // 自動回転の開始（モバイルではデフォルトで自動回転）
    startAutoRotation();
  }

  // 星空背景の作成
  function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    // 広い空間に星を配置
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // 実際の配置範囲は実験して調整
      positions[i3] = (Math.random() - 0.5) * 2000;
      positions[i3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i3 + 2] = (Math.random() - 0.5) * 2000;

      sizes[i] = Math.random() * 2;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // 星用のマテリアル
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  }

  // モバイル向けのタッチイベント設定
  function setupTouchEvents() {
    const canvas = renderer.domElement;
    hammerManager = new Hammer.Manager(canvas);

    // 回転用のパンジェスチャー
    const panGesture = new Hammer.Pan({
      direction: Hammer.DIRECTION_ALL,
      threshold: 0,
    });
    hammerManager.add(panGesture);

    // ズーム用のピンチジェスチャー
    const pinchGesture = new Hammer.Pinch();
    hammerManager.add(pinchGesture);

    // パンイベント（カメラ移動）
    hammerManager.on("panstart", () => {
      isAutoRotating = false;
      isDragging = true;
    });

    hammerManager.on("panmove", (event) => {
      if (isDragging) {
        // カメラ回転を計算（感度調整）
        const movementX = event.velocityX * 2;
        const movementY = event.velocityY * 2;

        // カメラの回転アングルを更新
        rotateCamera(movementX, movementY);
      }
    });

    hammerManager.on("panend pancancel", () => {
      isDragging = false;

      // ドラッグ終了後、一定時間後に自動回転を再開
      setTimeout(() => {
        if (!isDragging && !currentFocus) startAutoRotation();
      }, 3000);
    });

    // ピンチイベント（ズーム）
    hammerManager.on("pinchstart", () => {
      isAutoRotating = false;
    });

    hammerManager.on("pinchmove", (event) => {
      // ピンチの変化量に基づいてズーム
      const scaleFactor = event.scale;

      // 前のスケールと比較して、拡大か縮小かを判断
      if (event.scale > event.lastScale) {
        // 拡大（ズームイン）
        updateCameraDistance(-1);
      } else {
        // 縮小（ズームアウト）
        updateCameraDistance(1);
      }
    });

    hammerManager.on("pinchend", () => {
      // ピンチ終了後、一定時間後に自動回転を再開
      setTimeout(() => {
        if (!isDragging && !currentFocus) startAutoRotation();
      }, 3000);
    });
  }

  // カメラ距離の更新
  function updateCameraDistance(delta) {
    const currentDistance = camera.position.distanceTo(cameraLookAt);
    const scaleFactor = Math.max(1, currentDistance * 0.05);
    delta *= scaleFactor;

    const direction = new THREE.Vector3()
      .subVectors(camera.position, cameraLookAt)
      .normalize();

    const newDistance = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, currentDistance + delta)
    );

    const newPosition = direction.multiplyScalar(newDistance).add(cameraLookAt);

    gsap.to(camera.position, {
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      duration: 0.3,
      ease: "power2.out",
      onUpdate: () => camera.lookAt(cameraLookAt),
    });
  }

  // カメラの回転
  function rotateCamera(deltaX, deltaY) {
    const offset = new THREE.Vector3().copy(camera.position).sub(cameraLookAt);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.theta -= deltaX * 0.02;
    spherical.phi = Math.max(
      0.1,
      Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.02)
    );

    offset.setFromSpherical(spherical);
    const newPosition = new THREE.Vector3().copy(cameraLookAt).add(offset);

    gsap.to(camera.position, {
      x: newPosition.x,
      y: newPosition.y,
      z: newPosition.z,
      duration: 0.2,
      ease: "power1.out",
      onUpdate: () => camera.lookAt(cameraLookAt),
    });
  }

  // 自動回転開始
  function startAutoRotation() {
    isAutoRotating = true;
    currentFocus = null;
  }

  // フォーカスされた形状の周りをカメラが公転する
  function focusOnShape(shapeName) {
    if (!shapeGroups[shapeName]) return;

    isAutoRotating = false;
    currentFocus = shapeName;

    const targetGroup = shapeGroups[shapeName];
    const targetPos = new THREE.Vector3();
    targetGroup.getWorldPosition(targetPos);

    gsap.to(cameraLookAt, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(cameraLookAt),
    });

    const offset = new THREE.Vector3(
      15 + Math.random() * 5,
      5 + Math.random() * 5,
      15 + Math.random() * 5
    );

    const newCameraPos = new THREE.Vector3().copy(targetPos).add(offset);

    gsap.to(camera.position, {
      x: newCameraPos.x,
      y: newCameraPos.y,
      z: newCameraPos.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(cameraLookAt),
    });
  }

  // 形状作成関数
  function createShapes() {
    // 形状の種類とその生成関数
    const geometryTypes = {
      icosahedron: new THREE.IcosahedronGeometry(5, 1), // 細分化レベルを上げて面を滑らかに
      torus: new THREE.TorusGeometry(4, 1.5, 24, 100), // セグメント数を増やして滑らかに
      tetrahedron: new THREE.TetrahedronGeometry(5, 1), // 細分化レベルを上げて面を滑らかに
      octahedron: new THREE.OctahedronGeometry(5, 2), // 細分化レベルを上げて面を滑らかに
      dodecahedron: new THREE.DodecahedronGeometry(5, 1), // 細分化レベルを上げて面を滑らかに
    };

    // 空間内に配置する大きな範囲
    const spaceSize = 100;

    // 各形状タイプのグループを作成
    Object.keys(geometryTypes).forEach((shapeName, typeIndex) => {
      const geometry = geometryTypes[shapeName];

      // この形状タイプのグループを作成
      const group = new THREE.Group();
      shapeGroups[shapeName] = group;

      // 複数のインスタンスを追加
      const instanceCount = 3 + Math.floor(Math.random() * 4); // 各タイプ3〜6個

      for (let i = 0; i < instanceCount; i++) {
        // スケールを決定 (大きいメインオブジェクトと小さいサブオブジェクト)
        const isMainObject = i === 0;
        const scale = isMainObject ? 1.0 : 0.3 + Math.random() * 0.5;

        // ジオメトリのクローン
        const clonedGeometry = geometry.clone();

        // カラーの設定
        const colors = colorSchemes[currentColorScheme];
        const color = colors[Math.floor(Math.random() * colors.length)];

        // マテリアルの作成
        const material = new THREE.MeshPhongMaterial({
          color: color,
          wireframe: Math.random() > 0.9, // ワイヤーフレームの割合を減らす
          transparent: true,
          opacity: 0.85 + Math.random() * 0.15, // 透明度を高めに設定
          side: THREE.DoubleSide,
          specular: 0xffffff,
          shininess: 50,
          flatShading: true, // 面の描画をフラットに
        });

        // メッシュの作成
        const mesh = new THREE.Mesh(clonedGeometry, material);

        // メインオブジェクトはグループ中心に、サブオブジェクトは周辺に
        if (isMainObject) {
          // グループの中心位置を空間内にランダムに配置
          const groupPosition = new THREE.Vector3(
            (Math.random() - 0.5) * spaceSize,
            (Math.random() - 0.5) * spaceSize,
            (Math.random() - 0.5) * spaceSize * 0.8 // Z方向はやや狭く
          );

          // タイプごとに位置を調整（均等に分散させる）
          const angle =
            (typeIndex / Object.keys(geometryTypes).length) * Math.PI * 2;
          const radius = spaceSize * 0.4;
          groupPosition.x = Math.cos(angle) * radius;
          groupPosition.y = Math.sin(angle) * radius;
          groupPosition.z = (Math.random() - 0.5) * spaceSize * 0.5;

          group.position.copy(groupPosition);

          mesh.scale.set(scale * 2, scale * 2, scale * 2);
        } else {
          // 小さいオブジェクトはメインの周りに配置
          mesh.scale.set(scale, scale, scale);
          mesh.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
          );

          // 初期回転をランダムに
          mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          );
        }

        // グループに追加
        group.add(mesh);
        shapes.push(mesh);

        // メインオブジェクトの場合、カラフルな小さなパーティクルを周りに追加
        if (isMainObject && Math.random() > 0.3) {
          addParticlesAround(group, colors);
        }
      }

      // グループをシーンに追加
      scene.add(group);
    });
  }

  // オブジェクト周辺にパーティクルを追加
  function addParticlesAround(group, colors) {
    const particleCount = 40 + Math.floor(Math.random() * 60); // パーティクル数を増やす
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // 球状の配置
      const radius = 7 + Math.random() * 8; // 若干調整
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i3 + 2] = radius * Math.cos(phi);

      particleSizes[i] = 0.15 + Math.random() * 0.4; // サイズを大きく
    }

    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3)
    );
    particleGeo.setAttribute(
      "size",
      new THREE.BufferAttribute(particleSizes, 1)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 0.6,
      transparent: true,
      opacity: 0.75, // 不透明度を上げる
      sizeAttenuation: true,
      alphaTest: 0.1, // 透明部分の描画制御
    });

    const particles = new THREE.Points(particleGeo, particleMaterial);
    group.add(particles);
  }

  // ライト追加関数
  function addLights() {
    // 環境光を明るく
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    // 方向光1
    const directionalLight1 = new THREE.DirectionalLight(0x8236ff, 1.2);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);

    // 方向光2
    const directionalLight2 = new THREE.DirectionalLight(0xd6adff, 0.7);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);

    // 方向光3
    const directionalLight3 = new THREE.DirectionalLight(0x3c096c, 0.5);
    directionalLight3.position.set(0, 1, -1);
    scene.add(directionalLight3);

    // 空間全体を照らす点光源をいくつか追加
    const spaceSize = 120;

    for (let i = 0; i < 4; i++) {
      // 点光源を1つ増やす
      const pointLight = new THREE.PointLight(
        colorSchemes[currentColorScheme][
          i % colorSchemes[currentColorScheme].length
        ],
        1.0, // 明るさアップ
        120 // 距離を広げる
      );
      pointLight.position.set(
        (Math.random() - 0.5) * spaceSize,
        (Math.random() - 0.5) * spaceSize,
        (Math.random() - 0.5) * spaceSize
      );
      scene.add(pointLight);
    }
  }

  // コントロール設定関数
  function setupControls() {
    // 形状へのフォーカスボタン
    const shapeOptions = document.querySelectorAll(".shape-option");
    shapeOptions.forEach((btn) => {
      btn.addEventListener("click", function () {
        const shape = this.getAttribute("data-shape");
        focusOnShape(shape);
      });

      // タッチデバイス向け
      btn.addEventListener("touchstart", function () {
        this.classList.add("touched");
      });

      btn.addEventListener("touchend", function () {
        this.classList.remove("touched");
      });
    });

    // カラースキーム切り替えボタン
    const colorOptions = document.querySelectorAll(".color-option");
    const colorPicker = document.getElementById("colorPicker");

    // プリセットカラースキームのボタン
    colorOptions.forEach((btn) => {
      if (!btn.classList.contains("custom-color-option")) {
        btn.addEventListener("click", function () {
          const scheme = this.getAttribute("data-color-scheme");

          // すべてのボタンからアクティブ状態を削除
          colorOptions.forEach((b) => b.classList.remove("active"));

          // このボタンをアクティブに
          this.classList.add("active");

          // アニメーションでカラーを切り替え
          transitionColors(scheme);
        });
      }

      // タッチデバイス向け
      btn.addEventListener("touchstart", function () {
        this.classList.add("touched");
      });

      btn.addEventListener("touchend", function () {
        this.classList.remove("touched");
      });
    });

    // カスタムカラー選択
    const customColorOption = document.querySelector(".custom-color-option");
    if (customColorOption && colorPicker) {
      customColorOption.addEventListener("click", function () {
        // カラーピッカーを表示して自動的にクリック
        colorPicker.click();
      });

      // カラーピッカーの変更イベント
      colorPicker.addEventListener("input", function (event) {
        // 選択された色を取得
        const colorValue = event.target.value;
        customBaseColor = new THREE.Color(colorValue);

        // カスタムカラーのスキームを生成
        generateCustomColorScheme(colorValue);

        // すべてのボタンからアクティブ状態を削除
        colorOptions.forEach((b) => b.classList.remove("active"));

        // カスタムカラーオプションをアクティブに
        customColorOption.classList.add("active");

        // カスタムカラーに遷移
        transitionColors("custom");

        // カスタムカラーのプレビューを更新
        const preview = customColorOption.querySelector(".color-preview");
        if (preview) {
          preview.style.background = colorValue;
        }
      });
    }

    // ホームボタンを追加（中央視点に戻る）
    const homeBtn = document.querySelector(".home-btn");
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        resetCamera();
      });
    }

    // ヘルプボタンの設定（操作方法表示）
    const helpBtn = document.querySelector(".help-btn");
    const controlsInfo = document.getElementById("controlsInfo");
    const closeHelpBtn = document.querySelector(".close-help-btn");

    if (helpBtn && controlsInfo && closeHelpBtn) {
      // ヘルプボタンクリックで操作方法の表示/非表示を切り替え
      helpBtn.addEventListener("click", () => {
        if (
          controlsInfo.style.display === "none" ||
          controlsInfo.style.display === ""
        ) {
          controlsInfo.style.display = "flex";
        } else {
          controlsInfo.style.display = "none";
        }
      });

      // 閉じるボタンクリックで操作方法を非表示
      closeHelpBtn.addEventListener("click", () => {
        controlsInfo.style.display = "none";
      });

      // タッチデバイス向け
      helpBtn.addEventListener("touchstart", function () {
        this.classList.add("touched");
      });

      helpBtn.addEventListener("touchend", function () {
        this.classList.remove("touched");
      });
    }
  }

  // カメラをリセット（中央に戻る）
  function resetCamera() {
    isAutoRotating = false;
    currentFocus = null;

    gsap.to(cameraLookAt, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => camera.lookAt(cameraLookAt),
    });

    const targetPosition = new THREE.Vector3(21.82, 18.66, 97.14);

    gsap.to(camera.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 1.5,
      ease: "power2.inOut",
    });
  }

  // カスタムカラースキームを生成
  function generateCustomColorScheme(hexColor) {
    const baseColor = new THREE.Color(hexColor);
    const hsl = {};
    baseColor.getHSL(hsl);

    colorSchemes.custom = [
      new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l),
      new THREE.Color().setHSL(
        hsl.h,
        Math.min(1, hsl.s + 0.2),
        Math.max(0.1, hsl.l - 0.2)
      ),
      new THREE.Color().setHSL(
        hsl.h,
        Math.max(0.1, hsl.s - 0.2),
        Math.min(0.9, hsl.l + 0.1)
      ),
      new THREE.Color().setHSL(
        (hsl.h + 0.1) % 1,
        hsl.s,
        Math.max(0.05, hsl.l - 0.3)
      ),
      new THREE.Color().setHSL(
        (hsl.h - 0.05) % 1,
        Math.max(0.1, hsl.s - 0.3),
        Math.min(0.95, hsl.l + 0.2)
      ),
    ];
  }

  // カラースキームの遷移
  function transitionColors(newScheme) {
    if (newScheme === currentColorScheme) return;

    currentColorScheme = newScheme;

    shapes.forEach((mesh, index) => {
      if (mesh.material && mesh.material.color) {
        const colors = colorSchemes[currentColorScheme];
        const targetColor = colors[index % colors.length];

        gsap.to(mesh.material.color, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          duration: 1.5,
          ease: "power2.inOut",
        });
      }
    });

    const lights = scene.children.filter(
      (child) =>
        child instanceof THREE.DirectionalLight ||
        child instanceof THREE.PointLight
    );

    const colors = colorSchemes[currentColorScheme];

    if (lights.length >= 3 && colors.length >= 3) {
      lights.forEach((light, index) => {
        if (index < colors.length) {
          gsap.to(light.color, {
            r: colors[index].r,
            g: colors[index].g,
            b: colors[index].b,
            duration: 1.5,
          });
        }
      });
    }
  }

  // ウィンドウリサイズ対応
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // マウス移動処理（デスクトップ）
  function onDocumentMouseMove(event) {
    if (event.buttons > 0) {
      isAutoRotating = false;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      rotateCamera(-movementX * 0.005, -movementY * 0.005);

      clearTimeout(this.mouseTimeout);
      this.mouseTimeout = setTimeout(() => {
        if (!currentFocus) startAutoRotation();
      }, 3000);
    }
  }

  // ホイールでのズーム処理（デスクトップ）
  function onDocumentWheel(event) {
    isAutoRotating = false;

    const delta = Math.sign(event.deltaY) * 5;
    updateCameraDistance(delta);

    clearTimeout(this.wheelTimeout);
    this.wheelTimeout = setTimeout(() => {
      if (!currentFocus) startAutoRotation();
    }, 3000);
  }

  // アニメーションループ
  function animate() {
    requestAnimationFrame(animate);

    if (isAutoRotating) {
      const time = Date.now() * 0.0001;
      const radius = camera.position.distanceTo(cameraLookAt);

      camera.position.x = Math.cos(time) * radius;
      camera.position.z = Math.sin(time) * radius;
      camera.position.y = Math.sin(time * 0.5) * radius * 0.3;

      camera.lookAt(cameraLookAt);

      const currentDistance = camera.position.distanceTo(cameraLookAt);
      if (currentDistance > MAX_ZOOM) {
        isAutoRotating = false;
      }
    }

    Object.values(shapeGroups).forEach((group) => {
      group.rotation.y += rotationSpeed * 0.2;
      group.rotation.x += rotationSpeed * 0.1;

      group.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh && index > 0) {
          child.rotation.x += rotationSpeed * (index * 0.3 + 0.5);
          child.rotation.y += rotationSpeed * (index * 0.2 + 0.3);

          const time = Date.now() * 0.001 * (index * 0.1 + 0.2);
          const orbitRadius = 3 + index * 0.5;

          child.position.x = Math.sin(time) * orbitRadius;
          child.position.y = Math.cos(time * 0.8) * orbitRadius * 0.7;
          child.position.z = Math.sin(time * 1.2) * orbitRadius * 0.5;
        }

        if (child instanceof THREE.Points) {
          child.rotation.x += rotationSpeed * 0.1;
          child.rotation.y += rotationSpeed * 0.15;

          if (child.material) {
            child.material.size =
              (Math.sin(Date.now() * 0.001) * 0.25 + 0.75) * 0.5;
          }
        }
      });
    });

    renderer.render(scene, camera);
  }

  // iOS Safariでのスクロール問題を回避
  document.body.addEventListener(
    "touchmove",
    function (event) {
      if (event.target === renderer.domElement) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
});
