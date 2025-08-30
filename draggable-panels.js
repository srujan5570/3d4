/**
 * Draggable Panels System
 * Provides drag and drop functionality for control panels with hide/show toggle buttons
 */

class DraggablePanels {
    constructor() {
        this.panels = [];
        this.isDragging = false;
        this.currentPanel = null;
        this.offset = { x: 0, y: 0 };
        this.init();
    }

    init() {
        // Initialize draggable panels
        this.setupPanels();
        this.createToggleButtons();
        this.bindEvents();
    }

    setupPanels() {
        // Find all control panels and identify them by their content
        const allPanels = document.querySelectorAll('.control-panel');
        
        allPanels.forEach(panel => {
            const header = panel.querySelector('h3');
            if (header) {
                const headerText = header.textContent.trim();
                
                if (headerText.includes('Advanced Measurement Tools')) {
                    this.setupPanel(panel, 'measurement-panel', '🔧 Advanced Measurement Tools');
                } else if (headerText.includes('3D Annotations')) {
                    this.setupPanel(panel, 'annotation-panel', '📝 3D Annotations');
                }
            }
        });
    }

    setupPanel(panel, id, title) {
        // Add unique ID and draggable class
        panel.id = id;
        panel.classList.add('draggable-panel');
        
        // Add drag handle
        const header = panel.querySelector('h3');
        if (header) {
            header.classList.add('drag-handle');
            header.style.cursor = 'move';
            header.style.userSelect = 'none';
            header.title = 'Drag to move panel';
        }

        // Store panel info
        this.panels.push({
            element: panel,
            id: id,
            title: title,
            visible: true,
            originalPosition: {
                top: panel.style.top || getComputedStyle(panel).top,
                right: panel.style.right || getComputedStyle(panel).right,
                left: panel.style.left || getComputedStyle(panel).left,
                bottom: panel.style.bottom || getComputedStyle(panel).bottom
            }
        });

        // Ensure panel has position absolute
        panel.style.position = 'absolute';
        panel.style.zIndex = '1000';
    }

    createToggleButtons() {
        // Create container for toggle buttons
        const toggleContainer = document.createElement('div');
        toggleContainer.id = 'panel-toggle-container';
        toggleContainer.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 1001;
        `;

        // Create toggle buttons for each panel
        this.panels.forEach(panel => {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = `toggle-${panel.id}`;
            toggleBtn.className = 'panel-toggle-btn';
            toggleBtn.innerHTML = panel.title;
            toggleBtn.style.cssText = `
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid ${panel.id === 'measurement-panel' ? '#00d4ff' : '#ff00ff'};
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                min-width: 200px;
                text-align: center;
            `;

            // Add hover effects
            toggleBtn.addEventListener('mouseenter', () => {
                toggleBtn.style.background = panel.id === 'measurement-panel' ? 
                    'rgba(0, 212, 255, 0.3)' : 'rgba(255, 0, 255, 0.3)';
                toggleBtn.style.transform = 'translateY(-2px)';
                toggleBtn.style.boxShadow = `0 5px 15px ${panel.id === 'measurement-panel' ? 
                    'rgba(0, 212, 255, 0.4)' : 'rgba(255, 0, 255, 0.4)'}`;
            });

            toggleBtn.addEventListener('mouseleave', () => {
                toggleBtn.style.background = 'rgba(0, 0, 0, 0.8)';
                toggleBtn.style.transform = 'translateY(0)';
                toggleBtn.style.boxShadow = 'none';
            });

            // Add click event
            toggleBtn.addEventListener('click', () => {
                this.togglePanel(panel.id);
            });

            toggleContainer.appendChild(toggleBtn);
        });

        // Add to main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(toggleContainer);
        }
    }

    bindEvents() {
        // Mouse events for dragging
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Prevent text selection during drag
        document.addEventListener('selectstart', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        });
    }

    handleMouseDown(e) {
        const dragHandle = e.target.closest('.drag-handle');
        if (!dragHandle) return;

        const panel = dragHandle.closest('.draggable-panel');
        if (!panel) return;

        this.isDragging = true;
        this.currentPanel = panel;

        // Calculate offset from mouse to panel top-left
        const rect = panel.getBoundingClientRect();
        this.offset.x = e.clientX - rect.left;
        this.offset.y = e.clientY - rect.top;

        // Bring panel to front
        panel.style.zIndex = '1002';
        
        // Add dragging class for visual feedback
        panel.classList.add('dragging');
        
        // Add temporary styles for dragging state
        panel.style.transition = 'none';
        panel.style.transform = 'scale(1.02)';
        panel.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';

        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.currentPanel) return;

        // Calculate new position
        const x = e.clientX - this.offset.x;
        const y = e.clientY - this.offset.y;

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const panelRect = this.currentPanel.getBoundingClientRect();

        // Constrain to viewport bounds
        const constrainedX = Math.max(0, Math.min(x, viewportWidth - panelRect.width));
        const constrainedY = Math.max(0, Math.min(y, viewportHeight - panelRect.height));

        // Apply position
        this.currentPanel.style.left = constrainedX + 'px';
        this.currentPanel.style.top = constrainedY + 'px';
        this.currentPanel.style.right = 'auto';
        this.currentPanel.style.bottom = 'auto';

        e.preventDefault();
    }

    handleMouseUp(e) {
        if (!this.isDragging || !this.currentPanel) return;

        // Remove dragging state
        this.currentPanel.classList.remove('dragging');
        this.currentPanel.style.transition = 'all 0.3s ease';
        this.currentPanel.style.transform = 'scale(1)';
        this.currentPanel.style.zIndex = '1000';

        // Reset dragging state
        this.isDragging = false;
        this.currentPanel = null;
        this.offset = { x: 0, y: 0 };
    }

    togglePanel(panelId) {
        const panelInfo = this.panels.find(p => p.id === panelId);
        if (!panelInfo) return;

        const panel = panelInfo.element;
        const toggleBtn = document.getElementById(`toggle-${panelId}`);

        if (panelInfo.visible) {
            // Hide panel
            panel.style.display = 'none';
            panelInfo.visible = false;
            toggleBtn.style.opacity = '0.5';
            toggleBtn.innerHTML = `${panelInfo.title} (Hidden)`;
        } else {
            // Show panel
            panel.style.display = 'block';
            panelInfo.visible = true;
            toggleBtn.style.opacity = '1';
            toggleBtn.innerHTML = panelInfo.title;
        }
    }

    resetPanelPositions() {
        this.panels.forEach(panelInfo => {
            const panel = panelInfo.element;
            const original = panelInfo.originalPosition;
            
            panel.style.top = original.top;
            panel.style.right = original.right;
            panel.style.left = original.left;
            panel.style.bottom = original.bottom;
        });
    }

    // Public methods for external control
    showPanel(panelId) {
        const panelInfo = this.panels.find(p => p.id === panelId);
        if (panelInfo && !panelInfo.visible) {
            this.togglePanel(panelId);
        }
    }

    hidePanel(panelId) {
        const panelInfo = this.panels.find(p => p.id === panelId);
        if (panelInfo && panelInfo.visible) {
            this.togglePanel(panelId);
        }
    }

    isPanelVisible(panelId) {
        const panelInfo = this.panels.find(p => p.id === panelId);
        return panelInfo ? panelInfo.visible : false;
    }
}

// CSS styles for draggable panels
const draggableStyles = `
    .draggable-panel {
        transition: all 0.3s ease;
        border-radius: 10px;
        backdrop-filter: blur(10px);
    }

    .draggable-panel.dragging {
        cursor: grabbing;
        user-select: none;
    }

    .drag-handle {
        cursor: move;
        user-select: none;
        position: relative;
    }

    .drag-handle:hover {
        opacity: 0.8;
    }

    .drag-handle::after {
        content: '⋮⋮';
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 14px;
        opacity: 0.6;
        letter-spacing: -2px;
    }

    .panel-toggle-btn {
        transition: all 0.3s ease;
    }

    .panel-toggle-btn:active {
        transform: translateY(0) scale(0.98);
    }

    @media (max-width: 768px) {
        #panel-toggle-container {
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            flex-direction: row;
            justify-content: space-between;
            z-index: 1001;
        }

        .panel-toggle-btn {
            min-width: auto;
            flex: 1;
            margin: 0 5px;
            font-size: 10px;
            padding: 6px 8px;
        }

        .draggable-panel {
            width: 90% !important;
            max-width: 300px;
        }
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = draggableStyles;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
let draggablePanelsInstance;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        draggablePanelsInstance = new DraggablePanels();
    });
} else {
    draggablePanelsInstance = new DraggablePanels();
}

// Export for global access
window.DraggablePanels = DraggablePanels;
window.draggablePanelsInstance = draggablePanelsInstance;