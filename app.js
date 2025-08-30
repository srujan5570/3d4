class VTKVisualizationDashboard_ThreeJS {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.pointCloud = null;
        this.currentPoints = [];
        this.currentColors = [];
        this.isWireframe = false;
        this.showPoints = true;
        this.contourLines = null;
        this.colorMapTexture = null;
        this.scalarField = null;
        
        // Measurement system
        this.measurementMode = null;
        this.measurementPoints = [];
        this.measurementObjects = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Annotation system
        this.annotationMode = false;
        this.annotations = [];
        this.annotationObjects = [];
        this.pendingAnnotation = null;
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Setup camera
        const container = document.getElementById('canvas-container');
        this.camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            10000
        );
        this.camera.position.set(50, 50, 50);

        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Setup controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 1000;
        // Increase default drag sensitivity (affects pan/rotate/zoom speeds)
        if (this.updateDragSensitivity) {
            this.updateDragSensitivity(100.0);
            this.controls.zoomSpeed = 2.0;
        }

        // Add lighting
        this.setupLighting();

        // Start render loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Point light for better illumination
        const pointLight = new THREE.PointLight(0x00d4ff, 0.5, 100);
        pointLight.position.set(0, 20, 0);
        this.scene.add(pointLight);
    }

    setupEventListeners() {
        // File input
        document.getElementById('vtkFile').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.loadVTKFile(e.target.files[0]);
            }
        });

        // Load default file button
        document.getElementById('loadDefaultBtn').addEventListener('click', () => {
            const selectedFile = document.getElementById('defaultFileSelect').value;
            this.loadDefaultVTKFile(selectedFile);
        });

        // Point size control
        const pointSizeSlider = document.getElementById('pointSize');
        pointSizeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('pointSizeValue').textContent = value.toFixed(2);
            this.updatePointSize(value);
        });

        // Opacity control
        const opacitySlider = document.getElementById('opacity');
        opacitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('opacityValue').textContent = value.toFixed(2);
            this.updateOpacity(value);
        });

        // Rotation speed control
        const rotationSpeedSlider = document.getElementById('rotationSpeedSlider');
        rotationSpeedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateRotationSpeed(value);
        });

        // Drag sensitivity control
        const dragSensitivitySlider = document.getElementById('dragSensitivitySlider');
        dragSensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.updateDragSensitivity(value);
        });

        // View controls
        document.getElementById('resetView').addEventListener('click', () => this.resetView());
        document.getElementById('toggleWireframe').addEventListener('click', () => this.toggleWireframe());
        document.getElementById('togglePoints').addEventListener('click', () => this.togglePoints());

        // Color scheme buttons
        document.getElementById('colorDefault').addEventListener('click', () => this.setColorScheme('default'));
        document.getElementById('colorHeight').addEventListener('click', () => this.setColorScheme('height'));
        document.getElementById('colorRandom').addEventListener('click', () => this.setColorScheme('random'));
        document.getElementById('colorViridis').addEventListener('click', () => this.setColorScheme('viridis'));
        document.getElementById('colorPlasma').addEventListener('click', () => this.setColorScheme('plasma'));
        document.getElementById('colorTurbo').addEventListener('click', () => this.setColorScheme('turbo'));
        
        // Contour controls
        document.getElementById('toggleContours').addEventListener('click', () => this.toggleContours());
        document.getElementById('contourLevels').addEventListener('input', (e) => {
            const levels = parseInt(e.target.value);
            document.getElementById('contourLevelsValue').textContent = levels;
            this.updateContours(levels);
        });
        
        // Initialize real-time scale updates
        this.updateScaleDisplay();
        setInterval(() => this.updateScaleDisplay(), 100); // Update every 100ms
        
        // Background color control
        document.getElementById('backgroundColor').addEventListener('input', (e) => {
            this.updateBackgroundColor(e.target.value);
        });

        // Custom point color control
        document.getElementById('applyPointColor').addEventListener('click', () => {
            const color = document.getElementById('pointColor').value;
            this.setCustomPointColor(color);
        });

        // Quick view controls
        document.getElementById('frontView').addEventListener('click', () => this.setQuickView('front'));
        document.getElementById('sideView').addEventListener('click', () => this.setQuickView('side'));
        document.getElementById('topView').addEventListener('click', () => this.setQuickView('top'));
        document.getElementById('bottomView').addEventListener('click', () => this.setQuickView('bottom'));

        // Auto rotation controls
        document.getElementById('toggleAutoRotate').addEventListener('click', () => this.toggleAutoRotation());
        document.getElementById('rotationSpeed360').addEventListener('input', (e) => {
            document.getElementById('rotationSpeed360Value').textContent = parseFloat(e.target.value).toFixed(1);
            this.autoRotationSpeed = parseFloat(e.target.value);
        });

        // Initialize auto rotation properties
        this.isAutoRotating = false;
        this.autoRotationSpeed = 1.0;
        this.autoRotationAngle = 0;

        // Advanced slicing controls
        document.getElementById('toggleSlicing').addEventListener('click', () => this.toggleSlicing());
        document.getElementById('sliceAxis').addEventListener('change', (e) => this.updateSlicing());
        document.getElementById('slicePosition').addEventListener('input', (e) => {
            document.getElementById('slicePositionValue').textContent = parseFloat(e.target.value).toFixed(2);
            this.updateSlicing();
        });
        document.getElementById('sliceThickness').addEventListener('input', (e) => {
            document.getElementById('sliceThicknessValue').textContent = parseFloat(e.target.value).toFixed(2);
            this.updateSlicing();
        });
        document.getElementById('sliceMode').addEventListener('change', (e) => this.updateSlicing());
        document.getElementById('resetSlicing').addEventListener('click', () => this.resetSlicing());

        // Quick slice buttons
        document.getElementById('sliceTop').addEventListener('click', () => this.quickSlice('top'));
        document.getElementById('sliceBottom').addEventListener('click', () => this.quickSlice('bottom'));
        document.getElementById('sliceFront').addEventListener('click', () => this.quickSlice('front'));
        
        // Measurement mode controls
        this.setupMeasurementControls();
        
        // Annotation mode controls
        this.setupAnnotationControls();
        
        document.getElementById('sliceBack').addEventListener('click', () => this.quickSlice('back'));
        document.getElementById('sliceLeft').addEventListener('click', () => this.quickSlice('left'));
        document.getElementById('sliceRight').addEventListener('click', () => this.quickSlice('right'));

        // Initialize slicing properties
        this.isSlicingEnabled = false;
        this.slicingPlane = null;
        this.originalPointCloudMaterial = null;
        this.originalPointColors = null;
    }

    async loadDefaultVTKFile(filename = 'ImageToStl.com_PIC.vtk') {
        try {
            this.showLoading(true);
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            this.parseVTKFile(arrayBuffer, filename);
        } catch (error) {
            this.showError(`Failed to load VTK file '${filename}': ${error.message}`);
            this.showLoading(false);
        }
    }

    loadVTKFile(file) {
        this.showLoading(true);
        this.hideError();
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseVTKFile(e.target.result, file.name);
            } catch (error) {
                this.showError(`Failed to parse VTK file: ${error.message}`);
                this.showLoading(false);
            }
        };
        reader.onerror = () => {
            this.showError('Failed to read file');
            this.showLoading(false);
        };
        reader.readAsArrayBuffer(file);
    }

    parseVTKFile(arrayBuffer, fileName) {
        try {
            // Convert ArrayBuffer to string for header parsing
            const headerBytes = new Uint8Array(arrayBuffer, 0, 1000);
            let headerStr = '';
            for (let i = 0; i < headerBytes.length; i++) {
                headerStr += String.fromCharCode(headerBytes[i]);
            }

            // Parse header
            const lines = headerStr.split('\n');
            let pointCount = 0;
            let dataStartIndex = 0;
            let isBinary = false;
            let datasetType = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line === 'BINARY') {
                    isBinary = true;
                }
                
                if (line.startsWith('DATASET')) {
                    datasetType = line.split(' ')[1];
                }
                
                if (line.startsWith('POINTS')) {
                    const parts = line.split(' ');
                    pointCount = parseInt(parts[1]);
                }
                
                // Find where binary data starts
                if (line.startsWith('POINTS') && isBinary) {
                    // Calculate byte offset to start of binary data
                    const headerText = lines.slice(0, i + 1).join('\n') + '\n';
                    dataStartIndex = new TextEncoder().encode(headerText).length;
                    break;
                }
            }

            console.log(`VTK Dataset Type: ${datasetType}, Points: ${pointCount}`);

            if (pointCount === 0) {
                throw new Error('No points found in VTK file');
            }

            // Parse binary point data
            const points = this.parseBinaryPoints(arrayBuffer, dataStartIndex, pointCount);
            
            // Update UI
            this.updateFileInfo(fileName, pointCount, arrayBuffer.byteLength);
            
            // Create point cloud
            this.createPointCloud(points);
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error parsing VTK file:', error);
            this.showError(`Error parsing VTK file: ${error.message}`);
            this.showLoading(false);
        }
    }

    parseBinaryPoints(arrayBuffer, startIndex, pointCount) {
        const points = [];
        const dataView = new DataView(arrayBuffer, startIndex);
        
        // Each point has 3 float32 values (x, y, z) = 12 bytes
        for (let i = 0; i < pointCount; i++) {
            const offset = i * 12;
            
            // Read as big-endian float32 (VTK binary format)
            const x = dataView.getFloat32(offset, false);
            const y = dataView.getFloat32(offset + 4, false);
            const z = dataView.getFloat32(offset + 8, false);
            
            points.push(new THREE.Vector3(x, y, z));
        }
        
        return points;
    }

    createPointCloud(points) {
        // Remove existing point cloud
        if (this.pointCloud) {
            this.scene.remove(this.pointCloud);
        }

        // Store points for later use
        this.currentPoints = points;

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(points.length * 3);
        const colors = new Float32Array(points.length * 3);

        // Calculate bounds for normalization
        const bounds = this.calculateBounds(points);
        this.updateBoundsInfo(bounds);

        // Fill position and color arrays
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            positions[i * 3] = point.x;
            positions[i * 3 + 1] = point.y;
            positions[i * 3 + 2] = point.z;

            // Default color (cyan)
            colors[i * 3] = 0.0;
            colors[i * 3 + 1] = 0.83;
            colors[i * 3 + 2] = 1.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create material
        const material = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 1.0
        });

        // Create point cloud
        this.pointCloud = new THREE.Points(geometry, material);
        this.scene.add(this.pointCloud);

        // Center and scale the model
        this.centerAndScaleModel(bounds);

        // Reset camera position
        this.resetView();
    }

    calculateBounds(points) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const point of points) {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            minZ = Math.min(minZ, point.z);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
            maxZ = Math.max(maxZ, point.z);
        }

        return { minX, minY, minZ, maxX, maxY, maxZ };
    }

    centerAndScaleModel(bounds) {
        if (!this.pointCloud) return;

        // Calculate center
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;

        // Calculate scale to fit in view
        const sizeX = bounds.maxX - bounds.minX;
        const sizeY = bounds.maxY - bounds.minY;
        const sizeZ = bounds.maxZ - bounds.minZ;
        const maxSize = Math.max(sizeX, sizeY, sizeZ);
        const scale = 50 / maxSize; // Scale to fit in a 50-unit cube

        // Apply transformations
        this.pointCloud.position.set(-centerX * scale, -centerY * scale, -centerZ * scale);
        this.pointCloud.scale.set(scale, scale, scale);
    }

    updatePointSize(size) {
        if (this.pointCloud && this.pointCloud.material) {
            this.pointCloud.material.size = size;
        }
    }

    updateOpacity(opacity) {
        if (this.pointCloud && this.pointCloud.material) {
            this.pointCloud.material.opacity = opacity;
        }
    }

    resetView() {
        if (this.pointCloud) {
            this.camera.position.set(50, 50, 50);
            this.camera.lookAt(this.pointCloud.position);
            this.controls.reset();
        }
    }

    toggleWireframe() {
        // This would be more relevant for mesh objects
        // For point clouds, we can toggle between points and small spheres
        console.log('Wireframe toggle - not applicable for point clouds');
    }

    togglePoints() {
        if (this.pointCloud) {
            this.showPoints = !this.showPoints;
            this.pointCloud.visible = this.showPoints;
        }
    }

    setColorScheme(scheme) {
        if (!this.pointCloud || !this.currentPoints.length) return;

        // Update button states
        document.querySelectorAll('[id^="color"]').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`color${scheme.charAt(0).toUpperCase() + scheme.slice(1)}`).classList.add('active');

        const colors = this.pointCloud.geometry.attributes.color.array;
        const points = this.currentPoints;
        const bounds = this.calculateBounds(points);

        // Calculate scalar field for advanced color mapping
        this.scalarField = this.calculateScalarField(points, bounds);

        switch (scheme) {
            case 'default':
                for (let i = 0; i < points.length; i++) {
                    colors[i * 3] = 0.0;     // R
                    colors[i * 3 + 1] = 0.83; // G
                    colors[i * 3 + 2] = 1.0;  // B
                }
                break;

            case 'height':
                const heightRange = bounds.maxY - bounds.minY;
                for (let i = 0; i < points.length; i++) {
                    const normalizedHeight = (points[i].y - bounds.minY) / heightRange;
                    colors[i * 3] = normalizedHeight;     // R
                    colors[i * 3 + 1] = 0.5;             // G
                    colors[i * 3 + 2] = 1 - normalizedHeight; // B
                }
                break;

            case 'random':
                for (let i = 0; i < points.length; i++) {
                    colors[i * 3] = Math.random();     // R
                    colors[i * 3 + 1] = Math.random(); // G
                    colors[i * 3 + 2] = Math.random(); // B
                }
                break;

            case 'viridis':
                for (let i = 0; i < points.length; i++) {
                    const t = this.scalarField[i];
                    const color = this.viridisColorMap(t);
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }
                break;

            case 'plasma':
                for (let i = 0; i < points.length; i++) {
                    const t = this.scalarField[i];
                    const color = this.plasmaColorMap(t);
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }
                break;

            case 'turbo':
                for (let i = 0; i < points.length; i++) {
                    const t = this.scalarField[i];
                    const color = this.turboColorMap(t);
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }
                break;
        }

        this.pointCloud.geometry.attributes.color.needsUpdate = true;
    }

    updateBackgroundColor(color) {
        if (this.scene) {
            this.scene.background = new THREE.Color(color);
        }
    }

    setCustomPointColor(color) {
        if (this.pointCloud && this.pointCloud.material) {
            // Convert hex color to THREE.Color
            const threeColor = new THREE.Color(color);
            
            // Apply solid color to all points
            const colors = this.pointCloud.geometry.attributes.color;
            if (colors) {
                for (let i = 0; i < colors.count; i++) {
                    colors.setXYZ(i, threeColor.r, threeColor.g, threeColor.b);
                }
                colors.needsUpdate = true;
            }
            
            // Update material color as fallback
            this.pointCloud.material.color = threeColor;
            
            console.log(`Applied custom color: ${color}`);
        }
    }

    setQuickView(viewType) {
        if (!this.camera || !this.controls || !this.pointCloud) return;

        // Get the bounding box of the model
        const box = new THREE.Box3().setFromObject(this.pointCloud);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;

        // Set camera position based on view type
        switch(viewType) {
            case 'front':
                this.camera.position.set(center.x, center.y, center.z + distance);
                break;
            case 'side':
                this.camera.position.set(center.x + distance, center.y, center.z);
                break;
            case 'top':
                this.camera.position.set(center.x, center.y + distance, center.z);
                break;
            case 'bottom':
                this.camera.position.set(center.x, center.y - distance, center.z);
                break;
        }

        // Update controls target and camera
        this.controls.target.copy(center);
        this.camera.lookAt(center);
        this.controls.update();
        
        console.log(`Set ${viewType} view`);
    }

    toggleAutoRotation() {
        this.isAutoRotating = !this.isAutoRotating;
        const button = document.getElementById('toggleAutoRotate');
        
        if (this.isAutoRotating) {
            button.textContent = 'Stop 360° Rotation';
            button.classList.add('auto-rotate-active');
            console.log('Auto rotation started');
        } else {
            button.textContent = 'Start 360° Rotation';
            button.classList.remove('auto-rotate-active');
            console.log('Auto rotation stopped');
        }
    }

    toggleSlicing() {
        this.isSlicingEnabled = !this.isSlicingEnabled;
        const button = document.getElementById('toggleSlicing');
        
        if (this.isSlicingEnabled) {
            button.textContent = 'Disable Slicing';
            button.classList.add('active');
            this.enableSlicing();
            console.log('Slicing enabled');
        } else {
            button.textContent = 'Enable Slicing';
            button.classList.remove('active');
            this.disableSlicing();
            console.log('Slicing disabled');
        }
    }

    enableSlicing() {
        if (!this.pointCloud) return;
        
        // Store original material and colors for restoration
        if (!this.originalPointCloudMaterial) {
            this.originalPointCloudMaterial = this.pointCloud.material.clone();
        }
        
        if (!this.originalPointColors && this.pointCloud.geometry.attributes.color) {
            const colors = this.pointCloud.geometry.attributes.color;
            this.originalPointColors = new Float32Array(colors.array.length);
            for (let i = 0; i < colors.array.length; i++) {
                this.originalPointColors[i] = colors.array[i];
            }
        }
        
        // Create clipping plane
        this.slicingPlane = new THREE.Plane();
        this.updateSlicing();
    }

    disableSlicing() {
        if (!this.pointCloud) return;
        
        // Restore original material
        if (this.originalPointCloudMaterial) {
            this.pointCloud.material = this.originalPointCloudMaterial.clone();
        }
        
        // Remove clipping planes
        this.renderer.localClippingEnabled = false;
        this.slicingPlane = null;
        
        // Reset point visibility
        this.resetPointVisibility();
    }

    updateSlicing() {
        if (!this.isSlicingEnabled || !this.pointCloud) return;
        
        const axis = document.getElementById('sliceAxis').value;
        const position = parseFloat(document.getElementById('slicePosition').value);
        const thickness = parseFloat(document.getElementById('sliceThickness').value);
        const mode = document.getElementById('sliceMode').value;
        
        // Convert position from -10 to +10 range to normalized 0-1 range
        // -10 = 0 (far left/bottom/back), 0 = 0.5 (center), +10 = 1 (far right/top/front)
        const normalizedPosition = (position + 10) / 20;
        
        // Get model bounds with padding for extended slicing
        const box = new THREE.Box3().setFromObject(this.pointCloud);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Extend bounds for complete slicing capability with larger padding
        const padding = Math.max(size.x, size.y, size.z) * 5.0; // Increased from 0.5 to 1.0
        const extendedBox = box.clone();
        extendedBox.expandByScalar(padding);
        const extendedSize = extendedBox.getSize(new THREE.Vector3());
        
        // Calculate slice position based on axis with extended range
        let slicePos = new THREE.Vector3();
        let normal = new THREE.Vector3();
        
        switch(axis) {
            case 'x':
                slicePos.x = extendedBox.min.x + extendedSize.x * normalizedPosition;
                slicePos.y = center.y;
                slicePos.z = center.z;
                normal.set(1, 0, 0);
                break;
            case 'y':
                slicePos.x = center.x;
                slicePos.y = extendedBox.min.y + extendedSize.y * normalizedPosition;
                slicePos.z = center.z;
                normal.set(0, 1, 0);
                break;
            case 'z':
                slicePos.x = center.x;
                slicePos.y = center.y;
                slicePos.z = extendedBox.min.z + extendedSize.z * normalizedPosition;
                normal.set(0, 0, 1);
                break;
        }
        
        // Apply slicing based on mode
        this.applySlicingMode(mode, axis, normalizedPosition, thickness, box, extendedBox);
    }

    applySlicingMode(mode, axis, position, thickness, box, extendedBox) {
        const geometry = this.pointCloud.geometry;
        const positions = geometry.attributes.position;
        const colors = geometry.attributes.color;
        
        if (!positions || !colors) return;
        
        const extendedSize = extendedBox.getSize(new THREE.Vector3());
        
        for (let i = 0; i < positions.count; i++) {
            const point = new THREE.Vector3(
                positions.getX(i),
                positions.getY(i),
                positions.getZ(i)
            );
            
            // Calculate normalized position along the slice axis using extended bounds
            let normalizedPos;
            switch(axis) {
                case 'x':
                    normalizedPos = (point.x - extendedBox.min.x) / extendedSize.x;
                    break;
                case 'y':
                    normalizedPos = (point.y - extendedBox.min.y) / extendedSize.y;
                    break;
                case 'z':
                    normalizedPos = (point.z - extendedBox.min.z) / extendedSize.z;
                    break;
            }
            
            // Check if point is within slice thickness
            const distanceFromSlice = Math.abs(normalizedPos - position);
            const isInSlice = distanceFromSlice <= thickness / 2;
            
            // Apply mode-specific effects
            switch(mode) {
                case 'hide':
                    if (normalizedPos > position) {
                        colors.setXYZ(i, 0, 0, 0); // Make invisible
                        colors.setW(i, 0); // Set alpha to 0
                    } else {
                        // Restore original color
                        this.restoreOriginalColor(i, colors);
                    }
                    break;
                    
                case 'transparent':
                    if (normalizedPos > position) {
                        colors.setW(i, 0.2); // Make more transparent
                    } else {
                        colors.setW(i, 1.0); // Full opacity
                    }
                    break;
                    
                case 'highlight':
                    if (isInSlice) {
                        colors.setXYZ(i, 1, 1, 0); // Yellow highlight
                    } else {
                        this.restoreOriginalColor(i, colors);
                    }
                    break;
                    
                case 'cross_section':
                    if (isInSlice) {
                        // Keep original color for cross-section
                        this.restoreOriginalColor(i, colors);
                        colors.setW(i, 1.0);
                    } else {
                        // Hide everything else
                        colors.setXYZ(i, 0, 0, 0);
                        colors.setW(i, 0);
                    }
                    break;
            }
        }
        
        colors.needsUpdate = true;
        
        // Enable transparency if needed
        if (mode === 'transparent' || mode === 'cross_section') {
            this.pointCloud.material.transparent = true;
            this.pointCloud.material.opacity = 1.0;
        }
    }

    restoreOriginalColor(index, colors) {
        if (this.originalPointCloudMaterial && this.originalPointCloudMaterial.color) {
            const originalColor = this.originalPointCloudMaterial.color;
            colors.setXYZ(index, originalColor.r, originalColor.g, originalColor.b);
            colors.setW(index, 1.0);
        }
    }

    resetPointVisibility() {
        if (!this.pointCloud) return;
        
        const colors = this.pointCloud.geometry.attributes.color;
        if (colors) {
            for (let i = 0; i < colors.count; i++) {
                colors.setW(i, 1.0); // Reset alpha to full opacity
            }
            colors.needsUpdate = true;
        }
        
        this.pointCloud.material.transparent = false;
    }

    quickSlice(type) {
        if (!this.isSlicingEnabled) {
            this.toggleSlicing();
        }
        
        const sliceAxisSelect = document.getElementById('sliceAxis');
        const slicePositionSlider = document.getElementById('slicePosition');
        const sliceThicknessSlider = document.getElementById('sliceThickness');
        const sliceModeSelect = document.getElementById('sliceMode');
        
        switch(type) {
            case 'top':
                sliceAxisSelect.value = 'y';
                slicePositionSlider.value = 6;
                sliceThicknessSlider.value = 0.4;
                sliceModeSelect.value = 'hide';
                break;
            case 'bottom':
                sliceAxisSelect.value = 'y';
                slicePositionSlider.value = -6;
                sliceThicknessSlider.value = 0.4;
                sliceModeSelect.value = 'hide';
                break;
            case 'front':
                sliceAxisSelect.value = 'z';
                slicePositionSlider.value = 6;
                sliceThicknessSlider.value = 0.4;
                sliceModeSelect.value = 'hide';
                break;
            case 'back':
                sliceAxisSelect.value = 'z';
                slicePositionSlider.value = -6;
                sliceThicknessSlider.value = 0.4;
                sliceModeSelect.value = 'hide';
                break;
            case 'left':
                sliceAxisSelect.value = 'x';
                slicePositionSlider.value = -6;
                sliceThicknessSlider.value = 0.4;
                sliceModeSelect.value = 'hide';
                break;
            case 'right':
                sliceAxisSelect.value = 'x';
                slicePositionSlider.value = 6;
                sliceThicknessSlider.value = 0.4;
                sliceModeSelect.value = 'hide';
                break;
        }
        
        // Update display values
        document.getElementById('slicePositionValue').textContent = slicePositionSlider.value;
        document.getElementById('sliceThicknessValue').textContent = sliceThicknessSlider.value;
        
        // Apply the slicing
        this.updateSlicing();
    }

    resetSlicing() {
        if (this.isSlicingEnabled) {
            this.disableSlicing();
        }
        
        // Reset all controls to default values
        document.getElementById('sliceAxis').value = 'y';
        document.getElementById('slicePosition').value = 0;
        document.getElementById('sliceThickness').value = 0.1;
        document.getElementById('sliceMode').value = 'hide';
        document.getElementById('slicePositionValue').textContent = '0.00';
        document.getElementById('sliceThicknessValue').textContent = '0.10';
        document.getElementById('toggleSlicing').textContent = 'Enable Slicing';
        
        // Restore all points to original state
        this.resetPointVisibility();
    }

    updateScaleDisplay() {
        if (this.camera && this.controls) {
            // Calculate current zoom based on camera distance
            const distance = this.camera.position.distanceTo(this.controls.target);
            const zoom = (100 / distance).toFixed(1);
            
            // Get current point size
            const pointSize = document.getElementById('pointSize').value;
            
            // Update display elements
            document.getElementById('currentZoom').textContent = zoom + 'x';
            document.getElementById('viewDistance').textContent = distance.toFixed(1) + ' units';
            document.getElementById('modelScale').textContent = this.controls.scale ? this.controls.scale.toFixed(1) + 'x' : '1.0x';
            document.getElementById('currentPointSize').textContent = parseFloat(pointSize).toFixed(2) + ' px';
            
            // Update dimension measurements in scale display
            const lengthElement = document.getElementById('length');
            const breadthElement = document.getElementById('breadth');
            const heightElement = document.getElementById('height');
            
            if (lengthElement && breadthElement && heightElement) {
                document.getElementById('scaleLengthValue').textContent = lengthElement.textContent + ' units';
                document.getElementById('scaleBreadthValue').textContent = breadthElement.textContent + ' units';
                document.getElementById('scaleHeightValue').textContent = heightElement.textContent + ' units';
            }
        }
    }

    updateFileInfo(fileName, pointCount, fileSize) {
        document.getElementById('pointCount').textContent = pointCount.toLocaleString();
        document.getElementById('fileSize').textContent = this.formatFileSize(fileSize);
    }

    updateBoundsInfo(bounds) {
        const length = (bounds.maxX - bounds.minX).toFixed(2);
        const breadth = (bounds.maxZ - bounds.minZ).toFixed(2);
        const height = (bounds.maxY - bounds.minY).toFixed(2);
        document.getElementById('bounds').textContent = `${length} × ${breadth} × ${height}`;
        document.getElementById('length').textContent = length;
        document.getElementById('breadth').textContent = breadth;
        document.getElementById('height').textContent = height;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.style.display = 'none';
    }

    onWindowResize() {
        const container = document.getElementById('canvas-container');
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }

    updateRotationSpeed(speed) {
        if (this.controls) {
            this.controls.autoRotateSpeed = speed;
            this.controls.autoRotate = speed > 0;
            document.getElementById('rotationSpeedValue').textContent = speed.toFixed(1) + 'x';
        }
    }

    updateDragSensitivity(sensitivity) {
        if (this.controls) {
            this.controls.rotateSpeed = sensitivity;
            this.controls.panSpeed = sensitivity;
            this.controls.zoomSpeed = sensitivity;
            document.getElementById('dragSensitivityValue').textContent = sensitivity.toFixed(1) + 'x';
        }
    }

    // Advanced color mapping functions
    calculateScalarField(points, bounds) {
        const scalarField = new Array(points.length);
        const heightRange = bounds.maxY - bounds.minY;
        const distanceRange = Math.sqrt(
            Math.pow(bounds.maxX - bounds.minX, 2) + 
            Math.pow(bounds.maxZ - bounds.minZ, 2)
        );
        
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            // Combine height and distance from center for scalar value
            const normalizedHeight = (point.y - bounds.minY) / heightRange;
            const distanceFromCenter = Math.sqrt(point.x * point.x + point.z * point.z) / distanceRange;
            scalarField[i] = (normalizedHeight + distanceFromCenter) / 2;
        }
        
        return scalarField;
    }

    viridisColorMap(t) {
        // Viridis color map approximation
        t = Math.max(0, Math.min(1, t));
        const r = 0.267004 + t * (0.127568 + t * (-0.24717 + t * 0.357785));
        const g = 0.004874 + t * (0.221570 + t * (0.124859 + t * (-0.006314)));
        const b = 0.329415 + t * (0.531973 + t * (-0.555407 + t * 0.066109));
        return { r: Math.max(0, Math.min(1, r)), g: Math.max(0, Math.min(1, g)), b: Math.max(0, Math.min(1, b)) };
    }

    plasmaColorMap(t) {
        // Plasma color map approximation
        t = Math.max(0, Math.min(1, t));
        const r = 0.050383 + t * (0.796923 + t * (0.280264 + t * (-0.359662)));
        const g = 0.029803 + t * (0.166383 + t * (0.477618 + t * (-0.016919)));
        const b = 0.527975 + t * (0.291582 + t * (-0.517648 + t * 0.044794));
        return { r: Math.max(0, Math.min(1, r)), g: Math.max(0, Math.min(1, g)), b: Math.max(0, Math.min(1, b)) };
    }

    turboColorMap(t) {
        // Turbo color map approximation
        t = Math.max(0, Math.min(1, t));
        const r = 0.18995 + t * (1.62651 + t * (-2.68132 + t * (2.48923 + t * (-0.77528))));
        const g = 0.07176 + t * (0.87743 + t * (0.54498 + t * (-2.69922 + t * (1.79803))));
        const b = 0.23217 + t * (4.69538 + t * (-14.2681 + t * (17.9400 + t * (-8.1829))));
        return { r: Math.max(0, Math.min(1, r)), g: Math.max(0, Math.min(1, g)), b: Math.max(0, Math.min(1, b)) };
    }

    // Contour functionality
    toggleContours() {
        if (!this.scalarField || !this.currentPoints.length) return;
        
        if (this.contourLines) {
            this.scene.remove(this.contourLines);
            this.contourLines = null;
            document.getElementById('toggleContours').textContent = 'Show Contours';
        } else {
            const levels = parseInt(document.getElementById('contourLevels').value);
            this.createContours(levels);
            document.getElementById('toggleContours').textContent = 'Hide Contours';
        }
    }

    updateContours(levels) {
        if (this.contourLines) {
            this.scene.remove(this.contourLines);
            this.createContours(levels);
        }
    }

    createContours(levels) {
        if (!this.scalarField || !this.currentPoints.length) return;
        
        const contourGroup = new THREE.Group();
        const bounds = this.calculateBounds(this.currentPoints);
        
        // Create contour lines at different scalar levels
        for (let level = 0; level < levels; level++) {
            const threshold = level / (levels - 1);
            const contourGeometry = new THREE.BufferGeometry();
            const contourVertices = [];
            
            // Simple contour extraction - connect points with similar scalar values
            for (let i = 0; i < this.currentPoints.length - 1; i++) {
                const currentScalar = this.scalarField[i];
                const nextScalar = this.scalarField[i + 1];
                
                if ((currentScalar <= threshold && nextScalar >= threshold) ||
                    (currentScalar >= threshold && nextScalar <= threshold)) {
                    // Interpolate position where contour crosses
                    const t = (threshold - currentScalar) / (nextScalar - currentScalar);
                    const point1 = this.currentPoints[i];
                    const point2 = this.currentPoints[i + 1];
                    
                    const interpolatedPoint = {
                        x: point1.x + t * (point2.x - point1.x),
                        y: point1.y + t * (point2.y - point1.y),
                        z: point1.z + t * (point2.z - point1.z)
                    };
                    
                    contourVertices.push(interpolatedPoint.x, interpolatedPoint.y, interpolatedPoint.z);
                }
            }
            
            if (contourVertices.length > 0) {
                contourGeometry.setAttribute('position', new THREE.Float32BufferAttribute(contourVertices, 3));
                
                const contourMaterial = new THREE.LineBasicMaterial({
                    color: new THREE.Color().setHSL(level / levels, 1.0, 0.5),
                    linewidth: 2
                });
                
                const contourLine = new THREE.Line(contourGeometry, contourMaterial);
                contourGroup.add(contourLine);
            }
        }
        
        this.contourLines = contourGroup;
        this.scene.add(this.contourLines);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Handle auto rotation
        if (this.isAutoRotating && this.camera && this.controls && this.pointCloud) {
            this.autoRotationAngle += 0.01 * this.autoRotationSpeed;
            
            // Get the bounding box center for rotation
            const box = new THREE.Box3().setFromObject(this.pointCloud);
            const center = box.getCenter(new THREE.Vector3());
            const radius = this.camera.position.distanceTo(center);
            
            // Calculate new camera position in a circle around the model
            this.camera.position.x = center.x + Math.cos(this.autoRotationAngle) * radius;
            this.camera.position.z = center.z + Math.sin(this.autoRotationAngle) * radius;
            
            // Keep camera looking at the center
            this.camera.lookAt(center);
            this.controls.target.copy(center);
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    // Measurement system implementation
    setupMeasurementControls() {
        // Measurement mode buttons
        document.getElementById('measureDistance').addEventListener('click', () => this.setMeasurementMode('distance'));
        document.getElementById('measureArea').addEventListener('click', () => this.setMeasurementMode('area'));
        document.getElementById('measureVolume').addEventListener('click', () => this.setMeasurementMode('volume'));
        document.getElementById('measureAngle').addEventListener('click', () => this.setMeasurementMode('angle'));
        
        // Measurement controls
        document.getElementById('clearMeasurements').addEventListener('click', () => this.clearMeasurements());
        document.getElementById('exportMeasurements').addEventListener('click', () => this.exportMeasurements());
        
        // Canvas click handler for measurements
        this.renderer.domElement.addEventListener('click', (event) => this.onCanvasClick(event));
    }
    
    setMeasurementMode(mode) {
        // Clear previous mode
        document.querySelectorAll('.measurement-btn').forEach(btn => btn.classList.remove('active'));
        
        if (this.measurementMode === mode) {
            // Toggle off if same mode
            this.measurementMode = null;
            this.measurementPoints = [];
            this.hideInstructions();
        } else {
            // Set new mode
            this.measurementMode = mode;
            this.measurementPoints = [];
            document.getElementById('measure' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
            this.showInstructions(mode);
        }
    }
    
    showInstructions(mode) {
        const instructions = document.getElementById('measurementInstructions');
        const messages = {
            distance: 'Click two points to measure distance',
            area: 'Click three or more points to measure area',
            volume: 'Click points to define volume boundary',
            angle: 'Click three points to measure angle'
        };
        
        instructions.textContent = messages[mode] || 'Click points to start measuring...';
        instructions.style.display = 'block';
    }
    
    hideInstructions() {
        document.getElementById('measurementInstructions').style.display = 'none';
    }
    
    onCanvasClick(event) {
        if ((!this.measurementMode && !this.annotationMode) || !this.pointCloud) return;
        
        // Prevent orbit controls from interfering
        event.stopPropagation();
        
        // Calculate mouse position
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast to find intersection
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.pointCloud);
        
        if (intersects.length > 0) {
            const point = intersects[0].point;
            
            if (this.measurementMode) {
                this.addMeasurementPoint(point);
            } else if (this.annotationMode) {
                this.showAnnotationForm(point);
            }
        }
    }
    
    addMeasurementPoint(point) {
        this.measurementPoints.push(point.clone());
        
        // Create visual marker
        const markerGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        this.scene.add(marker);
        this.measurementObjects.push(marker);
        
        // Process measurement based on mode
        this.processMeasurement();
    }
    
    processMeasurement() {
        const points = this.measurementPoints;
        const mode = this.measurementMode;
        
        switch (mode) {
            case 'distance':
                if (points.length === 2) {
                    this.measureDistance(points[0], points[1]);
                    this.completeMeasurement();
                }
                break;
                
            case 'area':
                if (points.length >= 3) {
                    this.measureArea(points);
                    if (points.length > 3) {
                        this.completeMeasurement();
                    }
                }
                break;
                
            case 'volume':
                if (points.length >= 4) {
                    this.measureVolume(points);
                    this.completeMeasurement();
                }
                break;
                
            case 'angle':
                if (points.length === 3) {
                    this.measureAngle(points[0], points[1], points[2]);
                    this.completeMeasurement();
                }
                break;
        }
    }
    
    measureDistance(point1, point2) {
        const distance = point1.distanceTo(point2);
        const units = document.getElementById('measurementUnits').value;
        const precision = parseInt(document.getElementById('measurementPrecision').value);
        
        const convertedDistance = this.convertUnits(distance, units);
        
        // Create line between points
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([point1, point2]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(line);
        this.measurementObjects.push(line);
        
        this.addMeasurementResult('Distance', convertedDistance.toFixed(precision) + ' ' + units);
    }
    
    measureArea(points) {
        if (points.length < 3) return;
        
        // Calculate area using shoelace formula for 3D polygon
        let area = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const cross = new THREE.Vector3().crossVectors(
                points[i].clone().sub(points[0]),
                points[j].clone().sub(points[0])
            );
            area += cross.length();
        }
        area /= 2;
        
        const units = document.getElementById('measurementUnits').value;
        const precision = parseInt(document.getElementById('measurementPrecision').value);
        
        const convertedArea = this.convertUnits(area, units, true); // true for area
        
        // Create polygon outline
        const linePoints = [...points, points[0]]; // Close the polygon
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        this.scene.add(line);
        this.measurementObjects.push(line);
        
        this.addMeasurementResult('Area', convertedArea.toFixed(precision) + ' ' + units + '²');
    }
    
    measureVolume(points) {
        // Simple convex hull volume approximation
        let volume = 0;
        const center = new THREE.Vector3();
        
        // Calculate centroid
        points.forEach(point => center.add(point));
        center.divideScalar(points.length);
        
        // Calculate volume using tetrahedron decomposition
        for (let i = 0; i < points.length - 2; i++) {
            for (let j = i + 1; j < points.length - 1; j++) {
                for (let k = j + 1; k < points.length; k++) {
                    const v1 = points[i].clone().sub(center);
                    const v2 = points[j].clone().sub(center);
                    const v3 = points[k].clone().sub(center);
                    
                    const tetraVolume = Math.abs(v1.dot(v2.clone().cross(v3))) / 6;
                    volume += tetraVolume;
                }
            }
        }
        
        const units = document.getElementById('measurementUnits').value;
        const precision = parseInt(document.getElementById('measurementPrecision').value);
        
        const convertedVolume = this.convertUnits(volume, units, false, true); // true for volume
        
        this.addMeasurementResult('Volume', convertedVolume.toFixed(precision) + ' ' + units + '³');
    }
    
    measureAngle(point1, point2, point3) {
        // Calculate angle at point2
        const v1 = point1.clone().sub(point2).normalize();
        const v2 = point3.clone().sub(point2).normalize();
        
        const angle = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));
        const degrees = (angle * 180) / Math.PI;
        
        const precision = parseInt(document.getElementById('measurementPrecision').value);
        
        // Create angle visualization
        const lineGeometry1 = new THREE.BufferGeometry().setFromPoints([point1, point2]);
        const lineGeometry2 = new THREE.BufferGeometry().setFromPoints([point2, point3]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
        
        const line1 = new THREE.Line(lineGeometry1, lineMaterial);
        const line2 = new THREE.Line(lineGeometry2, lineMaterial);
        
        this.scene.add(line1);
        this.scene.add(line2);
        this.measurementObjects.push(line1, line2);
        
        this.addMeasurementResult('Angle', degrees.toFixed(precision) + '°');
    }
    
    convertUnits(value, targetUnit, isArea = false, isVolume = false) {
        // Convert from meters (base unit) to target unit
        const conversions = {
            mm: 1000,
            cm: 100,
            m: 1,
            in: 39.3701,
            ft: 3.28084
        };
        
        const factor = conversions[targetUnit] || 1;
        
        if (isVolume) {
            return value * Math.pow(factor, 3);
        } else if (isArea) {
            return value * Math.pow(factor, 2);
        } else {
            return value * factor;
        }
    }
    
    addMeasurementResult(type, value) {
        const measurementList = document.getElementById('measurementList');
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = 'margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px;';
        resultDiv.innerHTML = `
            <strong>${type}:</strong> ${value}
            <span class="measurement-points" style="display: block; font-size: 10px; color: #aaa;">
                Points: ${this.measurementPoints.length}
            </span>
        `;
        
        // Clear placeholder text
        if (measurementList.children.length === 1 && measurementList.children[0].tagName === 'P') {
            measurementList.innerHTML = '';
        }
        
        measurementList.appendChild(resultDiv);
    }
    
    completeMeasurement() {
        // Reset for next measurement
        this.measurementPoints = [];
        this.setMeasurementMode(null);
    }
    
    clearMeasurements() {
        // Remove all measurement objects from scene
        this.measurementObjects.forEach(obj => {
            this.scene.remove(obj);
        });
        this.measurementObjects = [];
        this.measurementPoints = [];
        
        // Clear results display
        const measurementList = document.getElementById('measurementList');
        measurementList.innerHTML = '<p style="margin: 5px 0; opacity: 0.7;">Click points to start measuring...</p>';
        
        // Reset mode
        this.setMeasurementMode(null);
    }
    
    exportMeasurements() {
        const measurementList = document.getElementById('measurementList');
        const measurements = [];
        
        Array.from(measurementList.children).forEach(child => {
            if (child.tagName === 'DIV') {
                measurements.push(child.textContent.trim());
            }
        });
        
        if (measurements.length === 0) {
            alert('No measurements to export');
            return;
        }
        
        const exportData = {
            timestamp: new Date().toISOString(),
            measurements: measurements,
            units: document.getElementById('measurementUnits').value,
            precision: document.getElementById('measurementPrecision').value
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'measurements_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    // Annotation system implementation
    setupAnnotationControls() {
        // Annotation mode toggle
        document.getElementById('toggleAnnotationMode').addEventListener('click', () => this.toggleAnnotationMode());
        
        // Annotation form controls
        document.getElementById('saveAnnotation').addEventListener('click', () => this.saveAnnotation());
        document.getElementById('cancelAnnotation').addEventListener('click', () => this.cancelAnnotation());
        
        // Annotation management controls
        document.getElementById('toggleAnnotationVisibility').addEventListener('click', () => this.toggleAnnotationVisibility());
        document.getElementById('exportAnnotations').addEventListener('click', () => this.exportAnnotations());
    }

    toggleAnnotationMode() {
        this.annotationMode = !this.annotationMode;
        const button = document.getElementById('toggleAnnotationMode');
        const form = document.getElementById('annotationForm');
        
        if (this.annotationMode) {
            button.textContent = '❌ Cancel Annotation';
            button.style.background = 'rgba(255, 0, 0, 0.3)';
            button.style.border = '1px solid #ff0000';
            this.showAnnotationInstructions();
        } else {
            button.textContent = '📍 Add Annotation';
            button.style.background = 'rgba(255, 0, 255, 0.2)';
            button.style.border = '1px solid #ff00ff';
            form.style.display = 'none';
            this.hideAnnotationInstructions();
            this.pendingAnnotation = null;
        }
    }

    showAnnotationInstructions() {
        // Create or update instruction overlay
        let instructions = document.getElementById('annotationInstructions');
        if (!instructions) {
            instructions = document.createElement('div');
            instructions.id = 'annotationInstructions';
            instructions.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 0, 255, 0.9);
                color: white;
                padding: 20px;
                border-radius: 10px;
                border: 2px solid #ff00ff;
                z-index: 10000;
                text-align: center;
                font-family: Arial, sans-serif;
                box-shadow: 0 8px 32px rgba(255, 0, 255, 0.5);
            `;
            document.body.appendChild(instructions);
        }
        
        instructions.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #ffffff;">📍 Annotation Mode Active</h3>
            <p style="margin: 5px 0;">Click on any point in the 3D model to add an annotation</p>
            <p style="margin: 5px 0; font-size: 12px; opacity: 0.8;">Click 'Cancel Annotation' to exit</p>
        `;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (instructions && instructions.parentNode) {
                instructions.style.opacity = '0';
                setTimeout(() => {
                    if (instructions && instructions.parentNode) {
                        instructions.parentNode.removeChild(instructions);
                    }
                }, 300);
            }
        }, 3000);
    }

    hideAnnotationInstructions() {
        const instructions = document.getElementById('annotationInstructions');
        if (instructions && instructions.parentNode) {
            instructions.parentNode.removeChild(instructions);
        }
    }

    showAnnotationForm(point) {
        this.pendingAnnotation = { position: point };
        const form = document.getElementById('annotationForm');
        form.style.display = 'block';
        
        // Clear previous values
        document.getElementById('annotationTitle').value = '';
        document.getElementById('annotationDescription').value = '';
        document.getElementById('annotationCategory').value = 'info';
        
        // Focus on title input
        document.getElementById('annotationTitle').focus();
    }

    saveAnnotation() {
        if (!this.pendingAnnotation) return;
        
        const title = document.getElementById('annotationTitle').value.trim();
        const description = document.getElementById('annotationDescription').value.trim();
        const category = document.getElementById('annotationCategory').value;
        
        if (!title) {
            alert('Please enter an annotation title');
            return;
        }
        
        const annotation = {
            id: Date.now(),
            title: title,
            description: description,
            category: category,
            position: this.pendingAnnotation.position,
            timestamp: new Date().toISOString()
        };
        
        this.annotations.push(annotation);
        this.createAnnotationMarker(annotation);
        this.updateAnnotationList();
        
        // Reset form and mode
        document.getElementById('annotationForm').style.display = 'none';
        this.pendingAnnotation = null;
        this.toggleAnnotationMode(); // Exit annotation mode
        
        console.log('Annotation saved:', annotation);
    }

    cancelAnnotation() {
        document.getElementById('annotationForm').style.display = 'none';
        this.pendingAnnotation = null;
    }

    createAnnotationMarker(annotation) {
        // Create marker geometry and material
        const geometry = new THREE.SphereGeometry(0.5, 8, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.getAnnotationColor(annotation.category),
            transparent: true,
            opacity: 0.8
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(annotation.position);
        marker.userData = { 
            type: 'annotation',
            annotation: annotation
        };
        
        // Create text label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText(annotation.title, canvas.width / 2, canvas.height / 2 + 6);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const label = new THREE.Sprite(labelMaterial);
        label.position.copy(annotation.position);
        label.position.y += 2; // Offset above marker
        label.scale.set(4, 1, 1);
        
        // Add to scene
        this.scene.add(marker);
        this.scene.add(label);
        
        // Store references
        this.annotationObjects.push({ marker, label, annotation });
    }

    getAnnotationColor(category) {
        const colors = {
            'info': 0x00aaff,
            'warning': 0xffaa00,
            'feature': 0x00ff00,
            'measurement': 0xff00ff,
            'note': 0xffffff
        };
        return colors[category] || 0x00aaff;
    }

    updateAnnotationList() {
        const container = document.getElementById('annotationItems');
        
        if (this.annotations.length === 0) {
            container.innerHTML = '<p style="margin: 5px 0; opacity: 0.7;">No annotations yet...</p>';
            return;
        }
        
        container.innerHTML = this.annotations.map(annotation => `
            <div class="annotation-item" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                padding: 8px;
                margin: 5px 0;
                cursor: pointer;
            " onclick="dashboard.focusAnnotation(${annotation.id})">
                <div style="font-weight: bold; color: ${this.getCategoryColor(annotation.category)};">
                    ${this.getCategoryIcon(annotation.category)} ${annotation.title}
                </div>
                <div style="font-size: 10px; opacity: 0.8; margin-top: 2px;">
                    ${annotation.description || 'No description'}
                </div>
                <div style="font-size: 9px; opacity: 0.6; margin-top: 2px;">
                    ${new Date(annotation.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');
    }

    getCategoryIcon(category) {
        const icons = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'feature': '🔍',
            'measurement': '📏',
            'note': '📝'
        };
        return icons[category] || 'ℹ️';
    }

    getCategoryColor(category) {
        const colors = {
            'info': '#00aaff',
            'warning': '#ffaa00',
            'feature': '#00ff00',
            'measurement': '#ff00ff',
            'note': '#ffffff'
        };
        return colors[category] || '#00aaff';
    }

    focusAnnotation(annotationId) {
        const annotation = this.annotations.find(a => a.id === annotationId);
        if (annotation) {
            // Move camera to focus on annotation
            this.camera.position.set(
                annotation.position.x + 20,
                annotation.position.y + 20,
                annotation.position.z + 20
            );
            this.camera.lookAt(annotation.position);
            this.controls.target.copy(annotation.position);
            this.controls.update();
        }
    }

    toggleAnnotationVisibility() {
        const button = document.getElementById('toggleAnnotationVisibility');
        
        this.annotationObjects.forEach(obj => {
            obj.marker.visible = !obj.marker.visible;
            obj.label.visible = !obj.label.visible;
        });
        
        const isVisible = this.annotationObjects.length > 0 ? this.annotationObjects[0].marker.visible : true;
        button.textContent = isVisible ? '🙈 Hide' : '👁️ Show';
    }

    exportAnnotations() {
        if (this.annotations.length === 0) {
            alert('No annotations to export');
            return;
        }
        
        const dataStr = JSON.stringify(this.annotations, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `annotations_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('Annotations exported:', this.annotations);
    }
}

// Global function for +/- button controls
function adjustControl(controlId, delta) {
    const control = document.getElementById(controlId);
    if (control) {
        const currentValue = parseFloat(control.value);
        const min = parseFloat(control.min);
        const max = parseFloat(control.max);
        const step = parseFloat(control.step) || 0.1;
        
        let newValue = currentValue + delta;
        newValue = Math.max(min, Math.min(max, newValue));
        newValue = Math.round(newValue / step) * step; // Snap to step
        
        control.value = newValue;
        
        // Update display value
        const valueDisplay = document.getElementById(controlId + 'Value');
        if (valueDisplay) {
            if (controlId === 'slicePosition') {
                // Format slice position as decimal for -10 to +10 range
                valueDisplay.textContent = newValue.toFixed(1);
            } else {
                valueDisplay.textContent = newValue.toFixed(2);
            }
        }
        
        // Trigger the input event to update the display and functionality
        const event = new Event('input', { bubbles: true });
        control.dispatchEvent(event);
    }
}

// Initialize the dashboard when the page loads
// Export Three.js implementation for fallback use
window.VTKVisualizationDashboard_ThreeJS = VTKVisualizationDashboard_ThreeJS;

// Initialize dashboard (will be handled by the main loader)
// window.addEventListener('DOMContentLoaded', () => {
//     new VTKVisualizationDashboard_ThreeJS();
// });

// Make adjustControl globally available
window.adjustControl = adjustControl;