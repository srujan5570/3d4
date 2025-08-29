/**
 * Simple Orbit Controls for Three.js
 * Provides mouse-based camera controls for 3D navigation
 */
THREE.OrbitControls = function(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement || document;
    
    // Settings
    this.enableDamping = true;
    this.dampingFactor = 0.05;
    this.screenSpacePanning = false;
    this.minDistance = 1;
    this.maxDistance = 1000;
    this.enableZoom = true;
    this.enableRotate = true;
    this.enablePan = true;
    this.rotateSpeed = 5.0;  // Maximum rotation speed
    this.panSpeed = 5.0;     // Maximum pan/drag speed
    this.zoomSpeed = 5.0;    // Maximum zoom speed
    
    // Internal state
    this.target = new THREE.Vector3();
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.panOffset = new THREE.Vector3();
    this.zoomChanged = false;
    
    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateDelta = new THREE.Vector2();
    
    this.panStart = new THREE.Vector2();
    this.panEnd = new THREE.Vector2();
    this.panDelta = new THREE.Vector2();
    
    this.dollyStart = new THREE.Vector2();
    this.dollyEnd = new THREE.Vector2();
    this.dollyDelta = new THREE.Vector2();
    
    this.scale = 1;
    this.state = 'NONE';
    
    // Mouse buttons
    this.mouseButtons = {
        LEFT: 0,
        MIDDLE: 1,
        RIGHT: 2
    };
    
    // Initialize
    this.update();
    this.setupEventListeners();
};

THREE.OrbitControls.prototype = {
    constructor: THREE.OrbitControls,
    
    update: function() {
        const offset = new THREE.Vector3();
        const quat = new THREE.Quaternion().setFromUnitVectors(
            this.camera.up, 
            new THREE.Vector3(0, 1, 0)
        );
        const quatInverse = quat.clone().invert();
        
        const position = this.camera.position;
        
        offset.copy(position).sub(this.target);
        offset.applyQuaternion(quat);
        
        this.spherical.setFromVector3(offset);
        
        if (this.enableDamping) {
            this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
            this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
        } else {
            this.spherical.theta += this.sphericalDelta.theta;
            this.spherical.phi += this.sphericalDelta.phi;
        }
        
        // Restrict phi to be between desired limits
        this.spherical.phi = Math.max(0.000001, Math.min(Math.PI - 0.000001, this.spherical.phi));
        
        this.spherical.radius *= this.scale;
        this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
        
        // Move target to panned location
        if (this.enableDamping) {
            this.target.addScaledVector(this.panOffset, this.dampingFactor);
        } else {
            this.target.add(this.panOffset);
        }
        
        offset.setFromSpherical(this.spherical);
        offset.applyQuaternion(quatInverse);
        
        position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
        
        if (this.enableDamping) {
            this.sphericalDelta.theta *= (1 - this.dampingFactor);
            this.sphericalDelta.phi *= (1 - this.dampingFactor);
            this.panOffset.multiplyScalar(1 - this.dampingFactor);
        } else {
            this.sphericalDelta.set(0, 0, 0);
            this.panOffset.set(0, 0, 0);
        }
        
        this.scale = 1;
        
        return false;
    },
    
    reset: function() {
        this.target.set(0, 0, 0);
        this.camera.position.set(50, 50, 50);
        this.camera.lookAt(this.target);
        this.sphericalDelta.set(0, 0, 0);
        this.panOffset.set(0, 0, 0);
        this.scale = 1;
        this.update();
    },
    
    setupEventListeners: function() {
        const scope = this;
        
        function onMouseDown(event) {
            event.preventDefault();
            
            switch (event.button) {
                case scope.mouseButtons.LEFT:
                    if (scope.enableRotate) {
                        scope.handleMouseDownRotate(event);
                        scope.state = 'ROTATE';
                    }
                    break;
                case scope.mouseButtons.MIDDLE:
                    if (scope.enableZoom) {
                        scope.handleMouseDownDolly(event);
                        scope.state = 'DOLLY';
                    }
                    break;
                case scope.mouseButtons.RIGHT:
                    if (scope.enablePan) {
                        scope.handleMouseDownPan(event);
                        scope.state = 'PAN';
                    }
                    break;
            }
            
            if (scope.state !== 'NONE') {
                document.addEventListener('mousemove', onMouseMove, false);
                document.addEventListener('mouseup', onMouseUp, false);
            }
        }
        
        function onMouseMove(event) {
            event.preventDefault();
            
            switch (scope.state) {
                case 'ROTATE':
                    if (scope.enableRotate) {
                        scope.handleMouseMoveRotate(event);
                    }
                    break;
                case 'DOLLY':
                    if (scope.enableZoom) {
                        scope.handleMouseMoveDolly(event);
                    }
                    break;
                case 'PAN':
                    if (scope.enablePan) {
                        scope.handleMouseMovePan(event);
                    }
                    break;
            }
        }
        
        function onMouseUp(event) {
            document.removeEventListener('mousemove', onMouseMove, false);
            document.removeEventListener('mouseup', onMouseUp, false);
            scope.state = 'NONE';
        }
        
        function onMouseWheel(event) {
            event.preventDefault();
            
            if (scope.enableZoom) {
                scope.handleMouseWheel(event);
            }
        }
        
        function onContextMenu(event) {
            event.preventDefault();
        }
        
        this.domElement.addEventListener('mousedown', onMouseDown, false);
        this.domElement.addEventListener('wheel', onMouseWheel, false);
        this.domElement.addEventListener('contextmenu', onContextMenu, false);
    },
    
    handleMouseDownRotate: function(event) {
        this.rotateStart.set(event.clientX, event.clientY);
    },
    
    handleMouseDownDolly: function(event) {
        this.dollyStart.set(event.clientX, event.clientY);
    },
    
    handleMouseDownPan: function(event) {
        this.panStart.set(event.clientX, event.clientY);
    },
    
    handleMouseMoveRotate: function(event) {
        this.rotateEnd.set(event.clientX, event.clientY);
        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(0.01 * this.rotateSpeed);
        
        const element = this.domElement;
        
        this.sphericalDelta.theta -= 2 * Math.PI * this.rotateDelta.x / element.clientHeight;
        this.sphericalDelta.phi -= 2 * Math.PI * this.rotateDelta.y / element.clientHeight;
        
        this.rotateStart.copy(this.rotateEnd);
    },
    
    handleMouseMoveDolly: function(event) {
        this.dollyEnd.set(event.clientX, event.clientY);
        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
        
        const zoomFactor = 0.98 + (1 - this.zoomSpeed) * 0.01;  // Smooth zoom
        
        if (this.dollyDelta.y > 0) {
            this.scale /= zoomFactor;
        } else if (this.dollyDelta.y < 0) {
            this.scale *= zoomFactor;
        }
        
        this.dollyStart.copy(this.dollyEnd);
    },
    
    handleMouseMovePan: function(event) {
        this.panEnd.set(event.clientX, event.clientY);
        this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(0.01 * this.panSpeed);
        
        this.pan(this.panDelta.x, this.panDelta.y);
        
        this.panStart.copy(this.panEnd);
    },
    
    handleMouseWheel: function(event) {
        const zoomFactor = 0.98 + (1 - this.zoomSpeed) * 0.01;  // Smooth zoom
        
        if (event.deltaY < 0) {
            this.scale *= zoomFactor;
        } else if (event.deltaY > 0) {
            this.scale /= zoomFactor;
        }
    },
    
    pan: function(deltaX, deltaY) {
        const offset = new THREE.Vector3();
        const element = this.domElement;
        
        if (this.camera.isPerspectiveCamera) {
            const position = this.camera.position;
            offset.copy(position).sub(this.target);
            let targetDistance = offset.length();
            
            targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);
            
            this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.camera.matrix);
            this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.camera.matrix);
        }
    },
    
    panLeft: function(distance, objectMatrix) {
        const v = new THREE.Vector3();
        v.setFromMatrixColumn(objectMatrix, 0);
        v.multiplyScalar(-distance);
        this.panOffset.add(v);
    },
    
    panUp: function(distance, objectMatrix) {
        const v = new THREE.Vector3();
        v.setFromMatrixColumn(objectMatrix, 1);
        v.multiplyScalar(distance);
        this.panOffset.add(v);
    }
};