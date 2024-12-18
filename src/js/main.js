import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class World {
    constructor() {
        this.initialize();
        this.setupCameraPositions();
        this.totalAssets = 7; // 总资源数（岛屿、飞机、5朵云）
        this.loadedAssets = 0;
        this.cloudInitialPositions = [];
    }

    setupCameraPositions() {
        // 计算旋转后的相机位置
        const distance = 45;
        const angleInRadians = (25 * Math.PI) / 180; 
        const x = distance * Math.cos(angleInRadians);
        const z = distance * Math.sin(angleInRadians);

        this.cameraPositions = {
            // Work: 右前方俯视
            work: { 
                position: new THREE.Vector3(30, 25, 30), 
                target: new THREE.Vector3(0, 0, 0) 
            },
            // Skills: 正上方俯瞰
            skills: { 
                position: new THREE.Vector3(0, 40, 0), 
                target: new THREE.Vector3(0, 0, 0) 
            }
        };

        // 设置默认相机位置 - 拉近视角
        this.camera.position.set(45, 20, 8);

        // 设置控制器限制
        this.controls.minDistance = 25; // 减小最小距离
        this.controls.maxDistance = 70; // 减小最大距离
        
        // 调整视角限制
        this.controls.minPolarAngle = Math.PI * 0.2;
        this.controls.maxPolarAngle = Math.PI * 0.6;
        
        // 设置控制器目标点
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        window.addEventListener('updateCamera', (e) => {
            this.animateCamera(e.detail.section);
        });
    }

    animateCamera(section) {
        // If no camera position for this section, skip animation
        if (!this.cameraPositions[section]) {
            return;
        }

        const targetPosition = this.cameraPositions[section].position;
        const targetLookAt = this.cameraPositions[section].target;

        // Disable controls during animation
        this.controls.enabled = false;

        // Create animation
        const startPosition = {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };

        const duration = 2000; // 2 seconds

        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easing function for smooth animation
            const easeProgress = this.easeInOutCubic(progress);

            // Update camera position
            this.camera.position.lerpVectors(new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z), targetPosition, easeProgress);

            // Update camera orientation
            this.camera.lookAt(
                targetLookAt.x * easeProgress,
                targetLookAt.y * easeProgress,
                targetLookAt.z * easeProgress
            );

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Re-enable controls after animation
                this.controls.enabled = true;
                this.controls.target.copy(targetLookAt);
            }
        };

        animate();
    }

    easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    initialize() {
        try {
            // 创建场景
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87CEEB); // 天空蓝色背景
            
            // 创建相机
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            
            // 计算旋转后的相机位置
            const distance = 45;
            const angleInRadians = (25 * Math.PI) / 180; 
            const x = distance * Math.cos(angleInRadians);
            const z = distance * Math.sin(angleInRadians);
            this.camera.position.set(x, 20, z);
            this.camera.lookAt(0, 0, 0);

            // 创建渲染器
            this.renderer = new THREE.WebGLRenderer({
                canvas: document.querySelector('#world'),
                antialias: true,
                powerPreference: "high-performance",
                alpha: true
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.physicallyCorrectLights = true; // 启用物理正确的光照计算

            // 添加性能监控
            this.setupPerformanceMonitoring();

            // 添加灯光
            this.setupLights();

            // 添加控制器
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2.1; // 限制相机角度
            this.controls.minDistance = 10;  // 最小距离设为5
            this.controls.maxDistance = 60; // 增加最大距离以匹配更远的初始位置
            this.controls.autoRotate = false; // 取消自动旋转
            this.controls.target.set(0, 0, 0); // 更左的目标点

            // 重置加载计数器
            this.loadedAssets = 0;

            // 加载3D模型
            this.loadIsland();
            this.loadPlane();
            this.loadClouds();

            // 添加事件监听
            window.addEventListener('resize', () => this.onWindowResize());
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.onWindowResize(), 100);
            });

            // 添加触摸事件支持
            this.setupTouchEvents();

            // 初始调整大小
            this.onWindowResize();

            // 开始动画循环
            this.animate();

            // 隐藏加载屏幕
            this.updateLoadingProgress();

            // 添加移动端控制
            this.setupMobileControls();
        } catch (error) {
            console.error('初始化错误:', error);
            this.showError();
        }
    }

    setupMobileControls() {
        // 检测是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // 优化移动端性能
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
            
            // 调整移动端相机设置
            this.camera.position.set(50, 25, 12);
            this.controls.minDistance = 35;
            this.controls.maxDistance = 65;
            
            // 禁用自动旋转
            this.controls.autoRotate = false;
            
            // 优化控制器设置
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.rotateSpeed = 0.5;
            this.controls.zoomSpeed = 0.5;
            
            // 限制垂直旋转角度
            this.controls.minPolarAngle = Math.PI * 0.25;
            this.controls.maxPolarAngle = Math.PI * 0.55;
            
            // 添加双指缩放支持
            this.renderer.domElement.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    e.preventDefault();
                }
            }, { passive: false });

            // 优化触摸移动
            let touchStartX = 0;
            let touchStartY = 0;
            let isMoving = false;

            this.renderer.domElement.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    isMoving = false;
                }
            });

            this.renderer.domElement.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1) {
                    const touchX = e.touches[0].clientX;
                    const touchY = e.touches[0].clientY;
                    
                    // 计算移动距离
                    const deltaX = touchX - touchStartX;
                    const deltaY = touchY - touchStartY;
                    
                    // 如果移动距离足够大，标记为移动状态
                    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                        isMoving = true;
                    }
                    
                    touchStartX = touchX;
                    touchStartY = touchY;
                }
            });

            // 处理点击事件
            this.renderer.domElement.addEventListener('touchend', (e) => {
                if (!isMoving && e.changedTouches.length === 1) {
                    // 这里可以处理点击事件
                    const rect = this.renderer.domElement.getBoundingClientRect();
                    const x = ((e.changedTouches[0].clientX - rect.left) / rect.width) * 2 - 1;
                    const y = -((e.changedTouches[0].clientY - rect.top) / rect.height) * 2 + 1;
                    
                    this.handleTouchClick(x, y);
                }
            });
        }
    }

    handleTouchClick(x, y) {
        // 创建射线
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(x, y);
        
        raycaster.setFromCamera(mouse, this.camera);
        
        // 检测交互对象
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            // 根据点击的对象触发相应的动作
            if (object === this.plane) {
                // 点击飞机时的动作
                this.plane.scale.set(1.1, 1.1, 1.1);
                setTimeout(() => {
                    this.plane.scale.set(1, 1, 1);
                }, 200);
            } else if (object === this.island) {
                // 点击岛屿时的动作
                this.island.rotation.y += Math.PI / 4;
            }
        }
    }

    updateLoadingProgress() {
        this.loadedAssets++;
        const progress = Math.round((this.loadedAssets / this.totalAssets) * 100);
        const progressElement = document.getElementById('loading-progress');
        if (progressElement) {
            progressElement.textContent = `${progress}%`;
        }

        // 当所有资源都加载完成时，隐藏加载屏幕
        if (this.loadedAssets >= this.totalAssets) {
            this.hideLoadingScreen();
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('loading-screen-fade');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    setupPerformanceMonitoring() {
        // 创建帧率监控
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.lastFPS = 0;
        
        // 监控内存使用
        if (window.performance && window.performance.memory) {
            this.memoryInfo = window.performance.memory;
        }
    }

    loadIsland() {
        const loader = new GLTFLoader();
        loader.load(
            '/public/models/foxs_islands.glb',
            (gltf) => {
                this.island = gltf.scene;
                
                // 调整岛屿的初始旋转，使其面向新的相机位置
                this.island.rotation.y = Math.PI;
                
                // 添加到场景
                this.scene.add(this.island);
                this.updateLoadingProgress();
            },
            (xhr) => {
                const progress = Math.round((xhr.loaded / xhr.total) * 100);
                console.log('Island loading:', progress + '%');
            },
            (error) => {
                console.error('加载模型时出错:', error);
                this.showError();
            }
        );
    }

    loadPlane() {
        const loader = new GLTFLoader();
        loader.load(
            '/public/models/cartoon_plane.glb',
            (gltf) => {
                this.plane = gltf.scene;
                this.plane.scale.set(0.5, 0.5, 0.5);
                
                // 设置飞机初始位置，使用新的半径25
                this.plane.position.set(25, 15, 0);
                
                // 设置飞机初始旋转
                this.plane.rotation.set(0, Math.PI / 2, 0);
                
                // 存储开始时间
                this.planeStartTime = Date.now();
                
                // 添加到场景
                this.scene.add(this.plane);
                
                this.updateLoadingProgress();
            },
            (xhr) => {
                const progress = Math.round((xhr.loaded / xhr.total) * 100);
                console.log('Plane loading:', progress + '%');
            },
            (error) => {
                console.error('加载飞机模型时出错:', error);
            }
        );
    }

    loadClouds() {
        const loader = new GLTFLoader();
        this.clouds = [];
        
        // 固定位置的云朵配置
        const cloudConfigs = [
            {
                x: -45,
                y: 38,
                z: -30,
                speed: 0.003
            },
            {
                x: -32.5,
                y: 42,
                z: -52.5,
                speed: 0.002
            },
            {
                x: -90.5,
                y: 40.5,
                z: -15,
                speed: 0.0015
            },
            {
                x: -75,
                y: 37.5,
                z: 50,
                speed: 0.0015
            },
            {
                x: -15,
                y: 45,
                z: -150,
                speed: 0.0015
            }
        ];

        cloudConfigs.forEach((config, index) => {
            loader.load(
                'public/models/clouds.glb',
                (gltf) => {
                    const cloud = gltf.scene;
                    const randomScale = 1.2 + Math.random() * 0.6;
                    cloud.scale.set(randomScale, randomScale, randomScale);
                    cloud.position.set(config.x, config.y, config.z);
                    
                    // 设置材质和阴影
                    cloud.traverse((child) => {
                        if (child.isMesh) {
                            child.material.transparent = true;
                            child.material.opacity = 0.9;
                            child.castShadow = false;
                            child.receiveShadow = false;
                            
                            // 禁用材质的更新
                            child.material.needsUpdate = false;
                            
                            // 使用双面渲染
                            child.material.side = THREE.DoubleSide;
                        }
                    });
                    
                    // 为每朵云添加动画属性
                    cloud.userData = {
                        speed: config.speed,
                        initialX: config.x,
                        movingRight: Math.random() > 0.5,
                        offset: Math.random() * Math.PI * 2 // 添加随机偏移
                    };

                    this.clouds.push(cloud);
                    this.scene.add(cloud);

                    // 当所有云朵加载完成时初始化位置
                    if (this.clouds.length === cloudConfigs.length) {
                        this.initCloudPositions();
                    }

                    this.updateLoadingProgress();
                },
                (xhr) => {
                    const progress = Math.round((xhr.loaded / xhr.total) * 100);
                    console.log('Cloud loading:', progress + '%');
                },
                (error) => {
                    console.error('加载云朵模型时出错:', error);
                }
            );
        });
    }

    initCloudPositions() {
        this.cloudInitialPositions = this.clouds.map(cloud => ({
            x: cloud.position.x,
            y: cloud.position.y,
            z: cloud.position.z
        }));
    }

    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // 降低环境光强度到0.3
        this.scene.add(ambientLight);

        // 主方向光（直射光）
        const mainLight = new THREE.DirectionalLight(0xffffff, 2.5); // 增加直射光强度到2.5
        mainLight.position.set(10, 10, 10);
        mainLight.castShadow = true;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.001;
        this.scene.add(mainLight);

        // 补光
        const fillLight = new THREE.DirectionalLight(0x9eb4ff, 0.5);
        fillLight.position.set(-10, 5, -10);
        this.scene.add(fillLight);

        // 调整渲染器的色调映射
        this.renderer.toneMapping = THREE.LinearToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // 调整渲染器的输出编码
        this.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    onWindowResize() {
        // 更新相机
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // 根据屏幕大小调整相机位置
        if (window.innerWidth <= 768) {
            // 移动设备
            this.camera.position.set(50, 25, 12);
            this.controls.minDistance = 15;
            this.controls.maxDistance = 45;
        } else if (window.innerWidth <= 1024) {
            // 平板设备
            this.camera.position.set(45, 20, 8);
            this.controls.minDistance = 12;
            this.controls.maxDistance = 40;
        } else {
            // 桌面设备
            this.camera.position.set(40, 18, 5);
            this.controls.minDistance = 10;
            this.controls.maxDistance = 55;
        }

        // 更新控制器
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    setupTouchEvents() {
        let touchStartX = 0;
        let touchStartY = 0;

        this.renderer.domElement.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        this.renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;

                // 计算触摸移动距离
                const deltaX = touchX - touchStartX;
                const deltaY = touchY - touchStartY;

                // 更新相机位置
                this.camera.position.x += deltaX * 0.01;
                this.camera.position.y -= deltaY * 0.01;

                touchStartX = touchX;
                touchStartY = touchY;
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // 性能监控
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime > this.lastTime + 1000) {
            this.lastFPS = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
            
            // 如果FPS低于30，降低渲染质量
            if (this.lastFPS < 30) {
                this.renderer.setPixelRatio(1);
            }
        }

        // 更新控制器
        this.controls.update();

        // 更新飞机动画
        if (this.plane) {
            const time = (Date.now() - this.planeStartTime) * 0.001;
            
            // 计算飞机的圆周运动
            const radius = 25; // 增加圆的半径从15到25
            const speed = 0.3; // 保持相同的飞行速度
            const height = 15; // 保持相同的飞行高度
            const angle = time * speed;
            
            // 计算飞机位置
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            this.plane.position.set(x, height + Math.sin(time * 2) * 0.5, z);

            // 计算下一个位置点（用于确定飞行方向）
            const nextAngle = angle + 0.1;
            const nextX = Math.cos(nextAngle) * radius;
            const nextZ = Math.sin(nextAngle) * radius;

            // 创建一个表示目标方向的向量
            const direction = new THREE.Vector3(nextX - x, 0, nextZ - z);
            direction.normalize();

            // 使用lookAt让飞机朝向飞行方向
            const targetPosition = new THREE.Vector3(
                this.plane.position.x + direction.x,
                this.plane.position.y,
                this.plane.position.z + direction.z
            );
            this.plane.lookAt(targetPosition);

            // 添加倾斜效果
            const bankAngle = Math.PI * 0.1; // 倾斜角度
            const currentRotation = this.plane.rotation.clone();
            this.plane.rotateZ(bankAngle);

            // 添加俯仰效果
            const pitchAngle = Math.sin(time * 2) * 0.05;
            this.plane.rotateX(pitchAngle);
        }

        // 更新云朵动画
        if (this.clouds) {
            this.clouds.forEach((cloud, index) => {
                const time = Date.now() * 0.001;
                // 每朵云有不同的浮动频率和幅度
                const floatSpeed = 0.5 + index * 0.1;
                const floatHeight = 0.3 + index * 0.1;
                
                // 垂直浮动
                cloud.position.y += Math.sin(time * floatSpeed) * 0.01;
                
                // 水平漂移
                cloud.position.x = this.cloudInitialPositions[index].x + Math.sin(time * 0.2) * 2;
                
                // 轻微旋转
                cloud.rotation.y = Math.sin(time * 0.1) * 0.1;
                
                // 轻微缩放
                const scale = 1 + Math.sin(time * 0.5) * 0.05;
                cloud.scale.set(scale, scale, scale);
            });
        }

        // 更新岛屿动画
        if (this.island) {
            const time = Date.now() * 0.001;
            // 岛屿轻微浮动
            this.island.position.y = Math.sin(time * 0.5) * 0.2;
            // 岛屿轻微旋转
            this.island.rotation.y = Math.sin(time * 0.2) * 0.05;
        }

        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }

    showError() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = '<div class="error">加载出错，请刷新页面重试</div>';
        }
    }
}

// Modal functionality
class ModalManager {
    constructor() {
        this.modals = {
            intro: document.getElementById('introModal'),
            about: document.getElementById('aboutModal'),
            work: document.getElementById('workModal'),
            skills: document.getElementById('skillsModal')
        };
        
        this.activeModal = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 设置关闭按钮事件
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => this.closeActiveModal());
        });

        // 为导航项添加点击事件
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const section = item.getAttribute('data-section');
                if (section) {
                    // 移除所有导航项的active类
                    navItems.forEach(navItem => navItem.classList.remove('active'));
                    // 给当前点击的导航项添加active类
                    item.classList.add('active');
                    this.openModal(section);
                }
            });
        });

        // 点击外部区域关闭模态窗口
        window.addEventListener('click', (e) => {
            if (this.activeModal && !e.target.closest('.modal-content') && !e.target.closest('.nav-item')) {
                this.closeActiveModal();
            }
        });
    }

    openModal(section) {
        if (this.activeModal) {
            this.closeActiveModal();
        }
        
        const modal = this.modals[section];
        if (modal) {
            modal.classList.add('active');
            this.activeModal = modal;
        }
    }

    closeActiveModal() {
        if (this.activeModal) {
            this.activeModal.classList.remove('active');
            this.activeModal = null;
        }
    }

    showModalContent(section) {
        const modal = document.querySelector('.modal');
        const modalContent = modal.querySelector('.modal-content');
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');

        // 清除之前的内容
        modalTitle.textContent = '';
        modalBody.innerHTML = '';

        // 根据部分设置内容
        const content = this.modalContents[section];
        if (content) {
            modalTitle.textContent = content.title;
            modalBody.innerHTML = content.body;
        }

        // 更快的动画时间
        gsap.fromTo(modalContent,
            {
                opacity: 0,
                y: 20,
                scale: 0.9
            },
            {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.2, // 从0.3减少到0.2
                ease: "power1.out"
            }
        );

        // 几乎立即显示标题和内容
        gsap.fromTo(modalTitle,
            { opacity: 0, y: 5 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.1, // 从0.2减少到0.1
                delay: 0.05 // 从0.1减少到0.05
            }
        );

        gsap.fromTo(modalBody,
            { opacity: 0, y: 5 },
            { 
                opacity: 1, 
                y: 0, 
                duration: 0.1, // 从0.2减少到0.1
                delay: 0.1 // 从0.15减少到0.1
            }
        );

        // 快速显示模态窗口
        modal.style.display = 'flex';
        gsap.to(modal, {
            opacity: 1,
            duration: 0.15, // 从0.2减少到0.15
            ease: "power1.out"
        });
    }

    hideModal() {
        const modal = document.querySelector('.modal');
        
        // 快速隐藏动画
        gsap.to(modal, {
            opacity: 0,
            duration: 0.15, // 从0.2减少到0.15
            ease: "power1.in",
            onComplete: () => {
                modal.style.display = 'none';
            }
        });
    }
}

// 创建世界实例
new World();

// Initialize modal manager
new ModalManager();
