class VTKVisualizationDashboard {
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
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
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
        
        // Trigger the input event to update the display and functionality
        const event = new Event('input', { bubbles: true });
        control.dispatchEvent(event);
    }
}

// Initialize the dashboard when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new VTKVisualizationDashboard();
});

// Make adjustControl globally available
window.adjustControl = adjustControl;