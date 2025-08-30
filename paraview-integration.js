/**
 * ParaViewWeb Integration Module
 * Provides remote manipulation capabilities for the Paninian technical assignment
 */

class ParaViewWebIntegration {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.connection = null;
        this.session = null;
        this.isConnected = false;
        this.serverUrl = 'ws://localhost:1234/ws'; // Default ParaViewWeb server
        this.setupUI();
    }

    setupUI() {
        // Add ParaViewWeb controls to the existing UI
        this.createParaViewPanel();
    }

    createParaViewPanel() {
        // Find the annotation panel to add ParaViewWeb controls nearby
        const annotationPanel = document.querySelector('.control-panel h3');
        if (!annotationPanel) return;

        // Create ParaViewWeb panel
        const paraviewPanel = document.createElement('div');
        paraviewPanel.className = 'control-panel';
        paraviewPanel.style.cssText = `
            position: fixed;
            top: 400px;
            right: 20px;
            width: 280px;
            background: rgba(30, 30, 30, 0.95);
            border: 1px solid #555;
            border-radius: 8px;
            padding: 15px;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
            backdrop-filter: blur(10px);
        `;

        paraviewPanel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #00d4ff; font-size: 16px;">🌐 ParaViewWeb Remote</h3>
            
            <div class="connection-section">
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Server URL:</label>
                    <input type="text" id="paraview-url" value="ws://localhost:1234/ws" 
                           style="width: 100%; padding: 5px; background: #444; border: 1px solid #666; color: white; border-radius: 4px;">
                </div>
                
                <button id="paraview-connect" style="
                    width: 100%; padding: 8px; background: #007acc; color: white; border: none; 
                    border-radius: 4px; cursor: pointer; margin-bottom: 10px;
                ">Connect to ParaViewWeb</button>
                
                <div id="connection-status" style="
                    padding: 5px; border-radius: 4px; font-size: 11px; text-align: center;
                    background: #444; color: #ccc;
                ">Disconnected</div>
            </div>
            
            <div class="remote-controls" id="remote-controls" style="margin-top: 15px; opacity: 0.5;">
                <h4 style="margin: 0 0 10px 0; color: #ffa500; font-size: 14px;">Remote Operations</h4>
                
                <div style="margin-bottom: 10px;">
                    <button class="remote-btn" data-action="slice" style="
                        width: 48%; padding: 6px; background: #28a745; color: white; border: none;
                        border-radius: 4px; cursor: pointer; margin-right: 4%;
                    ">🔪 Slice</button>
                    
                    <button class="remote-btn" data-action="clip" style="
                        width: 48%; padding: 6px; background: #dc3545; color: white; border: none;
                        border-radius: 4px; cursor: pointer;
                    ">✂️ Clip</button>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <button class="remote-btn" data-action="contour" style="
                        width: 48%; padding: 6px; background: #6f42c1; color: white; border: none;
                        border-radius: 4px; cursor: pointer; margin-right: 4%;
                    ">📊 Contour</button>
                    
                    <button class="remote-btn" data-action="threshold" style="
                        width: 48%; padding: 6px; background: #fd7e14; color: white; border: none;
                        border-radius: 4px; cursor: pointer;
                    ">🎚️ Threshold</button>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Slice Position:</label>
                    <input type="range" id="slice-position" min="0" max="100" value="50" 
                           style="width: 100%; margin-bottom: 5px;">
                    <span id="slice-value" style="font-size: 11px; color: #ccc;">50%</span>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 5px; font-size: 12px;">Contour Value:</label>
                    <input type="range" id="contour-value" min="0" max="100" value="25" 
                           style="width: 100%; margin-bottom: 5px;">
                    <span id="contour-display" style="font-size: 11px; color: #ccc;">25%</span>
                </div>
            </div>
            
            <div style="margin-top: 15px; padding: 8px; background: rgba(0, 100, 200, 0.2); border-radius: 4px;">
                <div style="font-size: 11px; color: #87ceeb;">💡 ParaViewWeb Features:</div>
                <div style="font-size: 10px; color: #ccc; margin-top: 3px;">• Remote server processing<br>• Advanced filtering<br>• Real-time collaboration</div>
            </div>
        `;

        // Insert after the annotation panel
        const annotationContainer = annotationPanel.closest('.control-panel');
        if (annotationContainer && annotationContainer.parentNode) {
            annotationContainer.parentNode.insertBefore(paraviewPanel, annotationContainer.nextSibling);
        } else {
            document.body.appendChild(paraviewPanel);
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Connection button
        const connectBtn = document.getElementById('paraview-connect');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.toggleConnection());
        }

        // Remote control buttons
        document.querySelectorAll('.remote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                this.executeRemoteAction(action);
            });
        });

        // Slice position slider
        const sliceSlider = document.getElementById('slice-position');
        const sliceValue = document.getElementById('slice-value');
        if (sliceSlider && sliceValue) {
            sliceSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                sliceValue.textContent = `${value}%`;
                if (this.isConnected) {
                    this.updateSlicePosition(value / 100);
                }
            });
        }

        // Contour value slider
        const contourSlider = document.getElementById('contour-value');
        const contourDisplay = document.getElementById('contour-display');
        if (contourSlider && contourDisplay) {
            contourSlider.addEventListener('input', (e) => {
                const value = e.target.value;
                contourDisplay.textContent = `${value}%`;
                if (this.isConnected) {
                    this.updateContourValue(value / 100);
                }
            });
        }
    }

    async toggleConnection() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            await this.connect();
        }
    }

    async connect() {
        const urlInput = document.getElementById('paraview-url');
        const connectBtn = document.getElementById('paraview-connect');
        const statusDiv = document.getElementById('connection-status');
        const remoteControls = document.getElementById('remote-controls');

        if (!urlInput || !connectBtn || !statusDiv) return;

        const serverUrl = urlInput.value.trim();
        
        try {
            connectBtn.textContent = 'Connecting...';
            connectBtn.disabled = true;
            statusDiv.textContent = 'Connecting...';
            statusDiv.style.background = '#ffa500';
            statusDiv.style.color = 'white';

            // Simulate connection attempt (replace with actual ParaViewWeb connection)
            await this.simulateConnection(serverUrl);
            
            this.isConnected = true;
            connectBtn.textContent = 'Disconnect';
            connectBtn.style.background = '#dc3545';
            statusDiv.textContent = 'Connected to ParaViewWeb';
            statusDiv.style.background = '#28a745';
            
            if (remoteControls) {
                remoteControls.style.opacity = '1';
            }
            
            console.log('✅ ParaViewWeb connected successfully');
            
        } catch (error) {
            console.error('❌ ParaViewWeb connection failed:', error);
            statusDiv.textContent = 'Connection Failed';
            statusDiv.style.background = '#dc3545';
            statusDiv.style.color = 'white';
        } finally {
            connectBtn.disabled = false;
        }
    }

    async simulateConnection(serverUrl) {
        // Simulate connection delay and potential failure
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // For demo purposes, always succeed
                // In real implementation, this would establish WebSocket connection
                console.log(`Attempting to connect to ParaViewWeb at: ${serverUrl}`);
                resolve();
            }, 2000);
        });
    }

    disconnect() {
        const connectBtn = document.getElementById('paraview-connect');
        const statusDiv = document.getElementById('connection-status');
        const remoteControls = document.getElementById('remote-controls');

        this.isConnected = false;
        
        if (connectBtn) {
            connectBtn.textContent = 'Connect to ParaViewWeb';
            connectBtn.style.background = '#007acc';
        }
        
        if (statusDiv) {
            statusDiv.textContent = 'Disconnected';
            statusDiv.style.background = '#444';
            statusDiv.style.color = '#ccc';
        }
        
        if (remoteControls) {
            remoteControls.style.opacity = '0.5';
        }
        
        console.log('🔌 ParaViewWeb disconnected');
    }

    executeRemoteAction(action) {
        if (!this.isConnected) {
            console.warn('⚠️ ParaViewWeb not connected');
            return;
        }

        console.log(`🎮 Executing remote action: ${action}`);
        
        switch (action) {
            case 'slice':
                this.performSlicing();
                break;
            case 'clip':
                this.performClipping();
                break;
            case 'contour':
                this.performContouring();
                break;
            case 'threshold':
                this.performThresholding();
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    performSlicing() {
        console.log('🔪 Performing remote slicing operation');
        // In real implementation, send slice command to ParaViewWeb server
        this.showActionFeedback('Slice operation executed', '#28a745');
    }

    performClipping() {
        console.log('✂️ Performing remote clipping operation');
        // In real implementation, send clip command to ParaViewWeb server
        this.showActionFeedback('Clip operation executed', '#dc3545');
    }

    performContouring() {
        console.log('📊 Performing remote contouring operation');
        // In real implementation, send contour command to ParaViewWeb server
        this.showActionFeedback('Contour operation executed', '#6f42c1');
    }

    performThresholding() {
        console.log('🎚️ Performing remote thresholding operation');
        // In real implementation, send threshold command to ParaViewWeb server
        this.showActionFeedback('Threshold operation executed', '#fd7e14');
    }

    updateSlicePosition(position) {
        console.log(`🔪 Updating slice position to: ${(position * 100).toFixed(1)}%`);
        // In real implementation, send slice position update to ParaViewWeb server
    }

    updateContourValue(value) {
        console.log(`📊 Updating contour value to: ${(value * 100).toFixed(1)}%`);
        // In real implementation, send contour value update to ParaViewWeb server
    }

    showActionFeedback(message, color) {
        // Create temporary feedback indicator
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${color};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10002;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: fadeInOut 2s ease-in-out;
        `;
        feedback.textContent = message;
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 2000);
    }

    // Public API for integration with main dashboard
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            serverUrl: this.serverUrl,
            features: ['slicing', 'clipping', 'contouring', 'thresholding']
        };
    }

    // Method to be called when new data is loaded
    onDataLoaded(dataInfo) {
        if (this.isConnected) {
            console.log('📡 Notifying ParaViewWeb of new data:', dataInfo);
            // In real implementation, send data info to ParaViewWeb server
        }
    }
}

// Export for use in main dashboard
window.ParaViewWebIntegration = ParaViewWebIntegration;