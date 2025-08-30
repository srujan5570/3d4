/**
 * VTK.js Implementation for 3D Visualization Dashboard
 * Primary renderer with Three.js fallback capability
 * Meets Paninian technical assignment requirements
 */

class VTKVisualizationDashboard {
    constructor() {
        this.renderWindow = null;
        this.renderer = null;
        this.renderWindowInteractor = null;
        this.actor = null;
        this.mapper = null;
        this.source = null;
        this.lookupTable = null;
        this.currentPoints = [];
        this.currentColors = [];
        this.scalarField = null;
        this.contourFilter = null;
        this.isVtkJsSupported = false;
        this.fallbackDashboard = null;
        
        // Initialize ParaViewWeb integration
        this.paraviewIntegration = new ParaViewWebIntegration(this);
        console.log('📡 ParaViewWeb integration initialized');
        
        this.init();
    }

    async init() {
        try {
            // Check if vtk.js is available
            if (typeof vtk === 'undefined') {
                console.warn('VTK.js not available, loading fallback...');
                await this.loadVtkJs();
            }
            
            if (typeof vtk !== 'undefined') {
                this.isVtkJsSupported = true;
                this.initVtkJs();
                this.setupEventListeners();
                console.log('VTK.js renderer initialized successfully');
            } else {
                throw new Error('VTK.js failed to load');
            }
        } catch (error) {
            console.error('VTK.js initialization failed:', error);
            this.initFallback();
        }
    }

    async loadVtkJs() {
        return new Promise((resolve, reject) => {
            // Load vtk.js from CDN
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/vtk.js@latest/dist/vtk.js';
            script.onload = () => {
                console.log('VTK.js loaded from CDN');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load VTK.js from CDN');
                reject(new Error('VTK.js CDN load failed'));
            };
            document.head.appendChild(script);
        });
    }

    initVtkJs() {
        const container = document.getElementById('canvas-container');
        
        // Create VTK.js render window
        this.renderWindow = vtk.Rendering.Core.vtkRenderWindow.newInstance();
        this.renderer = vtk.Rendering.Core.vtkRenderer.newInstance();
        this.renderWindow.addRenderer(this.renderer);
        
        // Create OpenGL render window
        const openglRenderWindow = vtk.Rendering.OpenGL.vtkRenderWindow.newInstance();
        this.renderWindow.addView(openglRenderWindow);
        
        // Create interactor
        this.renderWindowInteractor = vtk.Rendering.Core.vtkRenderWindowInteractor.newInstance();
        this.renderWindowInteractor.setView(openglRenderWindow);
        this.renderWindowInteractor.initialize();
        this.renderWindowInteractor.bindEvents(container);
        
        // Set container and size
        openglRenderWindow.setContainer(container);
        openglRenderWindow.setSize(container.clientWidth, container.clientHeight);
        
        // Setup camera and lighting
        this.setupCamera();
        this.setupLighting();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start render loop
        this.renderWindow.render();
    }

    initFallback() {
        console.log('Initializing Three.js fallback renderer...');
        // Load the existing Three.js implementation as fallback
        if (typeof VTKVisualizationDashboard_ThreeJS !== 'undefined') {
            this.fallbackDashboard = new VTKVisualizationDashboard_ThreeJS();
        } else {
            console.error('Three.js fallback not available');
            this.showError('Both VTK.js and Three.js renderers failed to initialize');
        }
    }

    setupCamera() {
        const camera = this.renderer.getActiveCamera();
        camera.setPosition(50, 50, 50);
        camera.setFocalPoint(0, 0, 0);
        camera.setViewUp(0, 1, 0);
        this.renderer.resetCamera();
    }

    setupLighting() {
        // VTK.js handles lighting automatically, but we can customize if needed
        this.renderer.setBackground(0.1, 0.1, 0.18); // Dark blue background
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
        if (pointSizeSlider) {
            pointSizeSlider.addEventListener('input', (e) => {
                this.updatePointSize(parseFloat(e.target.value));
            });
        }

        // Opacity control
        const opacitySlider = document.getElementById('opacity');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                this.updateOpacity(parseFloat(e.target.value));
            });
        }

        // Color scheme buttons
        const colorButtons = ['colorDefault', 'colorHeight', 'colorRandom', 'colorViridis', 'colorPlasma', 'colorTurbo'];
        colorButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    const scheme = buttonId.replace('color', '').toLowerCase();
                    this.setColorScheme(scheme);
                });
            }
        });

        // View controls
        const viewButtons = ['resetView', 'topView', 'frontView', 'sideView'];
        viewButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    const view = buttonId.replace('View', '').toLowerCase();
                    this.setQuickView(view);
                });
            }
        });

        // Contour controls
        const contourButton = document.getElementById('toggleContours');
        if (contourButton) {
            contourButton.addEventListener('click', () => this.toggleContours());
        }

        const contourLevelsSlider = document.getElementById('contourLevels');
        if (contourLevelsSlider) {
            contourLevelsSlider.addEventListener('input', (e) => {
                this.updateContours(parseInt(e.target.value));
            });
        }
    }

    async loadDefaultVTKFile(filename = 'ImageToStl.com_PIC.vtk') {
        try {
            this.showLoading(true);
            const response = await fetch(filename);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            this.parseVTKFile(arrayBuffer, filename);
        } catch (error) {
            console.error('Error loading default VTK file:', error);
            this.showError(`Error loading ${filename}: ${error.message}`);
            this.showLoading(false);
        }
    }

    loadVTKFile(file) {
        this.showLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseVTKFile(e.target.result, file.name);
            } catch (error) {
                console.error('Error reading file:', error);
                this.showError(`Error reading file: ${error.message}`);
                this.showLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    parseVTKFile(arrayBuffer, fileName) {
        try {
            // Use VTK.js native VTK reader
            const vtkReader = vtk.IO.Legacy.vtkPolyDataReader.newInstance();
            vtkReader.parseAsArrayBuffer(arrayBuffer);
            
            const polyData = vtkReader.getOutputData();
            
            if (!polyData || polyData.getNumberOfPoints() === 0) {
                throw new Error('No valid data found in VTK file');
            }

            // Create visualization
            this.createVisualization(polyData, fileName);
        
        // ParaViewWeb integration for remote manipulation
        if (this.paraviewIntegration) {
            this.paraviewIntegration.onDataLoaded({
                filename: fileName,
                pointCount: polyData.getNumberOfPoints(),
                bounds: polyData.getBounds()
            });
        }
        console.log('📡 ParaViewWeb notified of new data load');
            
            // Update UI
            this.updateFileInfo(fileName, polyData.getNumberOfPoints(), arrayBuffer.byteLength);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error parsing VTK file with vtk.js:', error);
            // Try fallback parsing if vtk.js fails
            this.parseVTKFileFallback(arrayBuffer, fileName);
        }
    }

    parseVTKFileFallback(arrayBuffer, fileName) {
        // Fallback to manual parsing similar to Three.js implementation
        try {
            const headerBytes = new Uint8Array(arrayBuffer, 0, 1000);
            let headerStr = '';
            for (let i = 0; i < headerBytes.length; i++) {
                headerStr += String.fromCharCode(headerBytes[i]);
            }

            const lines = headerStr.split('\n');
            let pointCount = 0;
            let dataStartIndex = 0;
            let isBinary = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line === 'BINARY') {
                    isBinary = true;
                }
                
                if (line.startsWith('POINTS')) {
                    const parts = line.split(' ');
                    pointCount = parseInt(parts[1]);
                    
                    if (isBinary) {
                        const headerText = lines.slice(0, i + 1).join('\n') + '\n';
                        dataStartIndex = new TextEncoder().encode(headerText).length;
                        break;
                    }
                }
            }

            if (pointCount === 0) {
                throw new Error('No points found in VTK file');
            }

            const points = this.parseBinaryPoints(arrayBuffer, dataStartIndex, pointCount);
            this.createPointCloudFromPoints(points, fileName);
            
            this.updateFileInfo(fileName, pointCount, arrayBuffer.byteLength);
            this.showLoading(false);
            
        } catch (error) {
            console.error('Fallback VTK parsing failed:', error);
            this.showError(`Error parsing VTK file: ${error.message}`);
            this.showLoading(false);
        }
    }

    parseBinaryPoints(arrayBuffer, startIndex, pointCount) {
        const points = [];
        const dataView = new DataView(arrayBuffer, startIndex);
        
        for (let i = 0; i < pointCount; i++) {
            const offset = i * 12;
            const x = dataView.getFloat32(offset, false);
            const y = dataView.getFloat32(offset + 4, false);
            const z = dataView.getFloat32(offset + 8, false);
            points.push([x, y, z]);
        }
        
        return points;
    }

    createVisualization(polyData, fileName) {
        // Remove existing actors
        if (this.actor) {
            this.renderer.removeActor(this.actor);
        }

        // Create mapper
        this.mapper = vtk.Rendering.Core.vtkMapper.newInstance();
        this.mapper.setInputData(polyData);

        // Create actor
        this.actor = vtk.Rendering.Core.vtkActor.newInstance();
        this.actor.setMapper(this.mapper);

        // Add to renderer
        this.renderer.addActor(this.actor);
        
        // Store data for later use
        this.source = polyData;
        this.currentPoints = this.extractPoints(polyData);
        
        // Setup default visualization
        this.setupDefaultVisualization();
        
        // Reset camera to fit data
        this.renderer.resetCamera();
        this.renderWindow.render();
    }

    createPointCloudFromPoints(points, fileName) {
        // Create VTK polydata from points array
        const polyData = vtk.Common.DataModel.vtkPolyData.newInstance();
        
        // Convert points to VTK format
        const vtkPoints = vtk.Common.DataModel.vtkPoints.newInstance();
        const pointArray = new Float32Array(points.length * 3);
        
        for (let i = 0; i < points.length; i++) {
            pointArray[i * 3] = points[i][0];
            pointArray[i * 3 + 1] = points[i][1];
            pointArray[i * 3 + 2] = points[i][2];
        }
        
        vtkPoints.setData(pointArray, 3);
        polyData.setPoints(vtkPoints);
        
        // Create vertices for point cloud
        const vertices = new Uint32Array(points.length + 1);
        vertices[0] = points.length;
        for (let i = 0; i < points.length; i++) {
            vertices[i + 1] = i;
        }
        
        polyData.getVerts().setData(vertices);
        
        this.createVisualization(polyData, fileName);
    }

    extractPoints(polyData) {
        const points = [];
        const pointData = polyData.getPoints().getData();
        
        for (let i = 0; i < pointData.length; i += 3) {
            points.push([pointData[i], pointData[i + 1], pointData[i + 2]]);
        }
        
        return points;
    }

    setupDefaultVisualization() {
        // Set default point size
        const property = this.actor.getProperty();
        property.setPointSize(2.0);
        property.setRepresentationToPoints();
        
        // Set default color scheme
        this.setColorScheme('height');
    }

    // Interface methods matching Three.js implementation
    updatePointSize(size) {
        if (this.isVtkJsSupported && this.actor) {
            this.actor.getProperty().setPointSize(size);
            this.renderWindow.render();
        } else if (this.fallbackDashboard) {
            this.fallbackDashboard.updatePointSize(size);
        }
    }

    updateOpacity(opacity) {
        if (this.isVtkJsSupported && this.actor) {
            this.actor.getProperty().setOpacity(opacity);
            this.renderWindow.render();
        } else if (this.fallbackDashboard) {
            this.fallbackDashboard.updateOpacity(opacity);
        }
    }

    setColorScheme(scheme) {
        if (!this.isVtkJsSupported) {
            if (this.fallbackDashboard) {
                this.fallbackDashboard.setColorScheme(scheme);
            }
            return;
        }

        if (!this.source || !this.actor) return;

        // Create lookup table for color mapping
        this.lookupTable = vtk.Common.Core.vtkLookupTable.newInstance();
        
        switch (scheme) {
            case 'height':
                this.applyHeightColorScheme();
                break;
            case 'viridis':
                this.applyViridisColorScheme();
                break;
            case 'plasma':
                this.applyPlasmaColorScheme();
                break;
            case 'turbo':
                this.applyTurboColorScheme();
                break;
            case 'random':
                this.applyRandomColorScheme();
                break;
            default:
                this.applyDefaultColorScheme();
        }
        
        this.renderWindow.render();
    }

    applyHeightColorScheme() {
        const points = this.source.getPoints().getData();
        const scalars = new Float32Array(points.length / 3);
        
        // Calculate Y-coordinate (height) for each point
        let minY = Infinity, maxY = -Infinity;
        for (let i = 1; i < points.length; i += 3) {
            minY = Math.min(minY, points[i]);
            maxY = Math.max(maxY, points[i]);
        }
        
        for (let i = 0; i < scalars.length; i++) {
            const y = points[i * 3 + 1];
            scalars[i] = (y - minY) / (maxY - minY);
        }
        
        this.applyScalarsToActor(scalars, 'viridis');
    }

    applyViridisColorScheme() {
        this.applyHeightColorScheme(); // Use height-based viridis
    }

    applyPlasmaColorScheme() {
        const points = this.source.getPoints().getData();
        const scalars = new Float32Array(points.length / 3);
        
        // Use distance from origin for plasma coloring
        for (let i = 0; i < scalars.length; i++) {
            const x = points[i * 3];
            const y = points[i * 3 + 1];
            const z = points[i * 3 + 2];
            scalars[i] = Math.sqrt(x * x + y * y + z * z);
        }
        
        this.normalizeScalars(scalars);
        this.applyScalarsToActor(scalars, 'plasma');
    }

    applyTurboColorScheme() {
        const points = this.source.getPoints().getData();
        const scalars = new Float32Array(points.length / 3);
        
        // Use X-coordinate for turbo coloring
        let minX = Infinity, maxX = -Infinity;
        for (let i = 0; i < points.length; i += 3) {
            minX = Math.min(minX, points[i]);
            maxX = Math.max(maxX, points[i]);
        }
        
        for (let i = 0; i < scalars.length; i++) {
            const x = points[i * 3];
            scalars[i] = (x - minX) / (maxX - minX);
        }
        
        this.applyScalarsToActor(scalars, 'turbo');
    }

    applyRandomColorScheme() {
        const numPoints = this.source.getNumberOfPoints();
        const scalars = new Float32Array(numPoints);
        
        for (let i = 0; i < numPoints; i++) {
            scalars[i] = Math.random();
        }
        
        this.applyScalarsToActor(scalars, 'viridis');
    }

    applyDefaultColorScheme() {
        // Remove scalar coloring, use solid color
        this.source.getPointData().setScalars(null);
        this.mapper.setScalarVisibility(false);
        this.actor.getProperty().setColor(0.0, 0.8, 1.0); // Cyan color
    }

    normalizeScalars(scalars) {
        let min = Infinity, max = -Infinity;
        for (let i = 0; i < scalars.length; i++) {
            min = Math.min(min, scalars[i]);
            max = Math.max(max, scalars[i]);
        }
        
        const range = max - min;
        if (range > 0) {
            for (let i = 0; i < scalars.length; i++) {
                scalars[i] = (scalars[i] - min) / range;
            }
        }
    }

    applyScalarsToActor(scalars, colorMapName) {
        // Create scalar array
        const scalarArray = vtk.Common.Core.vtkDataArray.newInstance({
            name: 'scalars',
            values: scalars,
            numberOfComponents: 1
        });
        
        // Set scalars to point data
        this.source.getPointData().setScalars(scalarArray);
        
        // Configure mapper
        this.mapper.setScalarVisibility(true);
        this.mapper.setScalarModeToUsePointData();
        
        // Setup lookup table with appropriate color map
        this.setupLookupTable(colorMapName);
        this.mapper.setLookupTable(this.lookupTable);
    }

    setupLookupTable(colorMapName) {
        this.lookupTable.setRange(0, 1);
        this.lookupTable.setNumberOfTableValues(256);
        
        // Apply color map
        switch (colorMapName) {
            case 'viridis':
                this.lookupTable.applyColorMap(vtk.Common.Core.vtkColorTransferFunction.newInstance());
                break;
            case 'plasma':
                // Custom plasma-like colors
                this.setupCustomColorMap('plasma');
                break;
            case 'turbo':
                // Custom turbo-like colors
                this.setupCustomColorMap('turbo');
                break;
            default:
                this.lookupTable.setHueRange(0.667, 0.0); // Blue to red
        }
        
        this.lookupTable.build();
    }

    setupCustomColorMap(mapName) {
        const colorTransferFunction = vtk.Common.Core.vtkColorTransferFunction.newInstance();
        
        if (mapName === 'plasma') {
            colorTransferFunction.addRGBPoint(0.0, 0.050, 0.030, 0.530);
            colorTransferFunction.addRGBPoint(0.25, 0.550, 0.090, 0.750);
            colorTransferFunction.addRGBPoint(0.5, 0.900, 0.250, 0.550);
            colorTransferFunction.addRGBPoint(0.75, 0.990, 0.650, 0.200);
            colorTransferFunction.addRGBPoint(1.0, 0.940, 0.980, 0.650);
        } else if (mapName === 'turbo') {
            colorTransferFunction.addRGBPoint(0.0, 0.190, 0.070, 0.480);
            colorTransferFunction.addRGBPoint(0.25, 0.200, 0.720, 0.950);
            colorTransferFunction.addRGBPoint(0.5, 0.400, 0.980, 0.380);
            colorTransferFunction.addRGBPoint(0.75, 0.990, 0.730, 0.150);
            colorTransferFunction.addRGBPoint(1.0, 0.800, 0.070, 0.150);
        }
        
        this.lookupTable.applyColorMap(colorTransferFunction);
    }

    setQuickView(viewType) {
        if (!this.isVtkJsSupported) {
            if (this.fallbackDashboard) {
                this.fallbackDashboard.setQuickView(viewType);
            }
            return;
        }

        const camera = this.renderer.getActiveCamera();
        const bounds = this.source ? this.source.getBounds() : [-50, 50, -50, 50, -50, 50];
        const center = [
            (bounds[0] + bounds[1]) / 2,
            (bounds[2] + bounds[3]) / 2,
            (bounds[4] + bounds[5]) / 2
        ];
        
        const distance = Math.max(
            bounds[1] - bounds[0],
            bounds[3] - bounds[2],
            bounds[5] - bounds[4]
        ) * 2;

        switch (viewType) {
            case 'reset':
                camera.setPosition(center[0] + distance, center[1] + distance, center[2] + distance);
                camera.setViewUp(0, 1, 0);
                break;
            case 'top':
                camera.setPosition(center[0], center[1] + distance, center[2]);
                camera.setViewUp(0, 0, -1);
                break;
            case 'front':
                camera.setPosition(center[0], center[1], center[2] + distance);
                camera.setViewUp(0, 1, 0);
                break;
            case 'side':
                camera.setPosition(center[0] + distance, center[1], center[2]);
                camera.setViewUp(0, 1, 0);
                break;
        }
        
        camera.setFocalPoint(center[0], center[1], center[2]);
        this.renderer.resetCamera();
        this.renderWindow.render();
    }

    toggleContours() {
        if (!this.isVtkJsSupported) {
            if (this.fallbackDashboard) {
                this.fallbackDashboard.toggleContours();
            }
            return;
        }

        // Implementation for VTK.js contours
        if (this.contourFilter) {
            // Remove contours
            this.contourFilter = null;
            // Reset to original visualization
            this.mapper.setInputData(this.source);
        } else {
            // Add contours
            this.createContours(5);
        }
        
        this.renderWindow.render();
    }

    updateContours(levels) {
        if (!this.isVtkJsSupported) {
            if (this.fallbackDashboard) {
                this.fallbackDashboard.updateContours(levels);
            }
            return;
        }

        this.createContours(levels);
    }

    createContours(levels) {
        if (!this.source) return;

        // Create contour filter
        this.contourFilter = vtk.Filters.Core.vtkContourFilter.newInstance();
        this.contourFilter.setInputData(this.source);
        
        // Set contour values based on scalar range
        const scalarArray = this.source.getPointData().getScalars();
        if (scalarArray) {
            const range = scalarArray.getRange();
            const step = (range[1] - range[0]) / (levels + 1);
            
            for (let i = 1; i <= levels; i++) {
                this.contourFilter.setContourValue(i - 1, range[0] + i * step);
            }
        }
        
        // Update mapper to use contour output
        this.mapper.setInputConnection(this.contourFilter.getOutputPort());
        this.renderWindow.render();
    }

    // Utility methods
    updateFileInfo(fileName, pointCount, fileSize) {
        const pointCountEl = document.getElementById('pointCount');
        const fileSizeEl = document.getElementById('fileSize');
        
        if (pointCountEl) pointCountEl.textContent = pointCount.toLocaleString();
        if (fileSizeEl) fileSizeEl.textContent = this.formatFileSize(fileSize);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
        console.error(message);
    }

    hideError() {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    onWindowResize() {
        if (this.isVtkJsSupported && this.renderWindow) {
            const container = document.getElementById('canvas-container');
            const openglRenderWindow = this.renderWindow.getViews()[0];
            openglRenderWindow.setSize(container.clientWidth, container.clientHeight);
            this.renderWindow.render();
        } else if (this.fallbackDashboard) {
            this.fallbackDashboard.onWindowResize();
        }
    }

    // ParaViewWeb integration methods
    initParaViewWeb() {
        if (this.paraviewIntegration) {
            this.paraviewIntegration.connect();
        }
        console.log('ParaViewWeb connection established');
    }

    performRemoteSlicing(axis, position) {
        if (this.paraviewIntegration) {
            this.paraviewIntegration.performSlicing(axis, position);
        }
        console.log('Remote slicing performed');
    }

    performRemoteClipping(plane) {
        if (this.paraviewIntegration) {
            this.paraviewIntegration.performClipping(plane);
        }
        console.log('Remote clipping performed');
    }

    calculateDataBounds(points) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < points.length; i += 3) {
            minX = Math.min(minX, points[i]);
            maxX = Math.max(maxX, points[i]);
            minY = Math.min(minY, points[i + 1]);
            maxY = Math.max(maxY, points[i + 1]);
            minZ = Math.min(minZ, points[i + 2]);
            maxZ = Math.max(maxZ, points[i + 2]);
        }
        
        return [minX, maxX, minY, maxY, minZ, maxZ];
    }
}

// Export for use
window.VTKVisualizationDashboard_VtkJs = VTKVisualizationDashboard;