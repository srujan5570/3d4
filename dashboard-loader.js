/**
 * Dashboard Loader - Handles VTK.js primary with Three.js fallback
 * Meets Paninian technical assignment requirements
 */

class DashboardLoader {
    constructor() {
        this.dashboard = null;
        this.isVtkJsMode = false;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing 3D Visualization Dashboard...');
        console.log('📋 Paninian Technical Assignment - VTK.js Implementation');
        
        try {
            // Try VTK.js implementation first
            await this.initVtkJsDashboard();
        } catch (error) {
            console.warn('⚠️ VTK.js initialization failed, falling back to Three.js:', error);
            this.initThreeJsFallback();
        }
    }

    async initVtkJsDashboard() {
        console.log('🔬 Attempting VTK.js initialization...');
        
        // Check if VTK.js library is loaded
        if (typeof vtk === 'undefined') {
            throw new Error('VTK.js library not loaded (CDN may be blocked)');
        }
        
        // Check if VTK.js dashboard class is available
        if (typeof VTKVisualizationDashboard_VtkJs === 'undefined') {
            throw new Error('VTK.js dashboard class not available');
        }

        // Initialize VTK.js dashboard
        this.dashboard = new VTKVisualizationDashboard_VtkJs();
        
        // Wait a moment to see if initialization succeeds
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                if (this.dashboard && this.dashboard.isVtkJsSupported) {
                    this.isVtkJsMode = true;
                    console.log('✅ VTK.js dashboard initialized successfully!');
                    this.updateUIForVtkJs();
                    resolve();
                } else {
                    reject(new Error('VTK.js support check failed'));
                }
            }, 1500);
        });
    }

    initThreeJsFallback() {
        console.log('🔄 Initializing Three.js fallback dashboard...');
        
        if (typeof VTKVisualizationDashboard_ThreeJS === 'undefined') {
            console.error('❌ Three.js fallback class not available!');
            this.showCriticalError('Both VTK.js and Three.js implementations failed to load');
            return;
        }

        this.dashboard = new VTKVisualizationDashboard_ThreeJS();
        this.isVtkJsMode = false;
        console.log('✅ Three.js fallback dashboard initialized successfully!');
        this.updateUIForThreeJs();
    }

    updateUIForVtkJs() {
        // Add VTK.js indicator to the UI
        this.addRendererIndicator('VTK.js', '#00ff88', '🔬 VTK.js Renderer Active');
        this.addFeatureIndicators([
            '✅ Native VTK file support',
            '✅ Advanced color mapping',
            '✅ Scientific visualization',
            '🔄 ParaViewWeb ready'
        ]);
    }

    updateUIForThreeJs() {
        // Add Three.js indicator to the UI
        this.addRendererIndicator('Three.js', '#ff8800', '🎮 Three.js Fallback Active');
        this.addFeatureIndicators([
            '✅ Reliable 3D rendering',
            '✅ Custom VTK parsing',
            '✅ Interactive controls',
            '✅ Cross-platform support'
        ]);
    }

    addRendererIndicator(renderer, color, tooltip) {
        // Create renderer indicator (hidden by default)
        console.log(`🎯 Renderer Active: ${renderer} - ${tooltip}`);
        // Indicators removed to clean up UI
    }

    addFeatureIndicators(features) {
        // Log features instead of showing UI indicators
        console.log('📋 Active Features:', features);
        // Feature indicators removed to clean up UI
    }

    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10001;
            text-align: center;
            border: 2px solid #ff0000;
        `;
        errorDiv.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
            <div>Critical Error</div>
            <div style="font-size: 14px; margin-top: 10px; font-weight: normal;">${message}</div>
        `;
        document.body.appendChild(errorDiv);
    }

    // Public API methods
    getDashboard() {
        return this.dashboard;
    }

    isUsingVtkJs() {
        return this.isVtkJsMode;
    }

    getRendererInfo() {
        return {
            renderer: this.isVtkJsMode ? 'VTK.js' : 'Three.js',
            version: this.isVtkJsMode ? 'Latest' : 'r128',
            features: this.isVtkJsMode ? 
                ['Native VTK support', 'Scientific visualization', 'ParaViewWeb ready'] :
                ['Reliable rendering', 'Custom parsing', 'Cross-platform']
        };
    }
}

// Global dashboard loader instance
let dashboardLoader = null;

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    dashboardLoader = new DashboardLoader();
});

// Export for global access
window.getDashboardLoader = () => dashboardLoader;
window.getDashboard = () => dashboardLoader ? dashboardLoader.getDashboard() : null;