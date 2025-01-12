import * as THREE from 'three';
import {
    OrbitControls
} from 'three/addons/controls/OrbitControls.js';
import {
    EffectComposer
} from 'three/addons/postprocessing/EffectComposer.js';
import {
    RenderPass
} from 'three/addons/postprocessing/RenderPass.js';
import {
    UnrealBloomPass
} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
    SMAAPass
} from 'three/addons/postprocessing/SMAAPass.js';

// Initialize loading manager
const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
let assetsLoaded = false;

const parentDiv = document.getElementById('renderDiv');
let canvas = document.getElementById('threeRenderCanvas');
if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'threeRenderCanvas';
    parentDiv.appendChild(canvas);
}

// Create loading screen
const loadingScreen = document.createElement('div');
loadingScreen.style.position = 'absolute';
loadingScreen.style.top = '0';
loadingScreen.style.left = '0';
loadingScreen.style.width = '100%';
loadingScreen.style.height = '100%';
loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
loadingScreen.style.color = 'white';
loadingScreen.style.display = 'flex';
loadingScreen.style.justifyContent = 'center';
loadingScreen.style.alignItems = 'center';
loadingScreen.style.fontSize = '24px';
loadingScreen.innerHTML = 'Loading... 0%';
parentDiv.appendChild(loadingScreen);

// Loading manager events
loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    const progress = ((itemsLoaded / itemsTotal) * 100).toFixed(0);
    loadingScreen.innerHTML = `Loading... ${progress}%`;
};

loadingManager.onLoad = function() {
    assetsLoaded = true;
    loadingScreen.style.display = 'none';
};
// Force remove loading screen after 1 second
setTimeout(() => {
    assetsLoaded = true;
    loadingScreen.style.display = 'none';
}, 1000);

// Initialize the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Dark grey background

// Clock for animation
const clock = new THREE.Clock();

// Initialize the camera
const camera = new THREE.PerspectiveCamera(
    60, // Reduced FOV for better perspective
    canvas.offsetWidth / canvas.offsetHeight,
    0.1,
    1000
);
camera.position.set(120, 60, 120); // Position camera further back and up
camera.lookAt(0, 0, 0);

// Initialize the renderer with HDR
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas,
    powerPreference: 'high-performance',
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8; // Darker overall exposure

// Initialize post-processing
const composer = new EffectComposer(renderer);

// Regular scene render pass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Add subtle bloom effect
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5, // increased bloom strength
    0.7, // increased radius
    0.2 // lower threshold for more bloom effect
);
composer.addPass(bloomPass);

// Add anti-aliasing
const smaaPass = new SMAAPass(
    window.innerWidth * renderer.getPixelRatio(),
    window.innerHeight * renderer.getPixelRatio()
);
composer.addPass(smaaPass);

// Initialize composer size
composer.setSize(parentDiv.clientWidth, parentDiv.clientHeight);

// Define sky colors for environmental lighting
const skyColor = new THREE.Color(0x1a0033); // Dark purple sky
const groundColor = new THREE.Color(0x000033); // Very dark blue ground reflection

// Create sky dome with improved colors
const vertexShader = `
varying vec3 vWorldPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
const fragmentShader = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
varying vec3 vWorldPosition;
void main() {
    float h = normalize( vWorldPosition + offset ).y;
    gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h, 0.0 ), exponent ), 0.0 ) ), 1.0 );
}`;
const uniforms = {
    topColor: {
        value: skyColor
    },
    bottomColor: {
        value: groundColor
    },
    offset: {
        value: 33
    },
    exponent: {
        value: 0.6
    },
};
const skyGeo = new THREE.SphereGeometry(500, 32, 15);
const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide,
});
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// Modify OrbitControls setup
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 50;
controls.maxDistance = 200;
controls.target.set(0, 20, 0); // Look at the middle of the castle

// Create flat terrain
function createCastle() {
    const castleGroup = new THREE.Group();

    // Floor material (dark stone)
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1
    });
    // Wall material (darker stone)
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.8,
        metalness: 0.2
    });
    // Create ground floor
    const groundFloor = new THREE.Mesh(
        new THREE.BoxGeometry(100, 1, 100),
        floorMaterial
    );
    groundFloor.position.y = -0.5;
    groundFloor.receiveShadow = true;
    castleGroup.add(groundFloor);
    // Create outer walls
    const wallHeight = 20;
    const wallThickness = 2;
    // North wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(100, wallHeight, wallThickness),
        wallMaterial
    );
    northWall.position.set(0, wallHeight / 2, -50 + wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    castleGroup.add(northWall);
    // South wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(100, wallHeight, wallThickness),
        wallMaterial
    );
    southWall.position.set(0, wallHeight / 2, 50 - wallThickness / 2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    castleGroup.add(southWall);
    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, 100),
        wallMaterial
    );
    eastWall.position.set(50 - wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    castleGroup.add(eastWall);
    // West wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, 100),
        wallMaterial
    );
    westWall.position.set(-50 + wallThickness / 2, wallHeight / 2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    castleGroup.add(westWall);
    // Create second floor
    const secondFloor = new THREE.Mesh(
        new THREE.BoxGeometry(100, 1, 100),
        floorMaterial
    );
    secondFloor.position.y = wallHeight;
    secondFloor.receiveShadow = true;
    castleGroup.add(secondFloor);
    // Hidden computer room (small room in corner)
    const computerRoomSize = 20;
    const computerRoomHeight = 10;
    // Computer room walls
    const computerRoom = new THREE.Group();
    computerRoom.position.set(-40, 0, -40); // Position in corner
    // Computer room floor
    const computerRoomFloor = new THREE.Mesh(
        new THREE.BoxGeometry(computerRoomSize, 1, computerRoomSize),
        new THREE.MeshStandardMaterial({
            color: 0x0f0f0f
        })
    );
    computerRoomFloor.position.y = 0.5;
    computerRoom.add(computerRoomFloor);
    // Computer room walls
    const computerRoomWalls = new THREE.Mesh(
        new THREE.BoxGeometry(computerRoomSize, computerRoomHeight, computerRoomSize),
        new THREE.MeshStandardMaterial({
            color: 0x080808,
            transparent: true,
            opacity: 0.95
        })
    );
    computerRoomWalls.position.y = computerRoomHeight / 2;
    computerRoom.add(computerRoomWalls);
    // Add some computer-like objects
    for (let i = 0; i < 3; i++) {
        const computer = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0x333333
            })
        );
        computer.position.set(-5 + i * 5, 3, -5);
        computerRoom.add(computer);
    }
    castleGroup.add(computerRoom);
    scene.add(castleGroup);
    // Add point lights inside the castle
    const pointLight1 = new THREE.PointLight(0xffffff, 2, 100);
    pointLight1.position.set(0, 10, 0);
    castleGroup.add(pointLight1);
    const pointLight2 = new THREE.PointLight(0xffffff, 2, 100);
    pointLight2.position.set(-30, 10, -30);
    castleGroup.add(pointLight2);
    const pointLight3 = new THREE.PointLight(0xffffff, 2, 100);
    pointLight3.position.set(30, 10, 30);
    castleGroup.add(pointLight3);
    return castleGroup;
}

// Setup improved lighting system
const sunLight = new THREE.DirectionalLight(0x2b1a45, 2.0); // Increased intensity
sunLight.position.set(-50, 200, -50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 400;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);

// Add hemisphere light to simulate sky and ground bounce light
const hemiLight = new THREE.HemisphereLight(skyColor, groundColor, 1.0); // Increased intensity
scene.add(hemiLight);
// Add ambient light for better overall visibility
const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
scene.add(ambientLight);
// Reduce fog density for better visibility
scene.fog = new THREE.FogExp2(0x000000, 0.001);

// Create initial scene
const castle = createCastle();

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (assetsLoaded) {
        applyControls(); // Apply camera controls
        controls.update();
    }

    composer.render();
}

// Handle window resize
function onWindowResize() {
    const width = parentDiv.clientWidth;
    const height = parentDiv.clientHeight;

    // Update camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer and composer
    renderer.setSize(width, height);
    composer.setSize(width, height);

    // Update post-processing passes
    bloomPass.resolution.set(width, height);
    smaaPass.setSize(width, height);
}

// Add event listeners
window.addEventListener('resize', onWindowResize);
const resizeObserver = new ResizeObserver(onWindowResize);
resizeObserver.observe(parentDiv);

// Start animation
animate();

// =========================
// Mobile Controls Integration
// =========================

// Create a container for the D-pad
const dpadContainer = document.createElement('div');
dpadContainer.id = 'dpadContainer';
document.body.appendChild(dpadContainer);

// Create directional buttons
const directions = ['up', 'down', 'left', 'right'];
directions.forEach(direction => {
    const button = document.createElement('button');
    button.id = `${direction}Button`;
    button.classList.add('dpad-button');
    // Set the appropriate icon based on direction
    let iconUrl = '';
    switch (direction) {
        case 'up':
            iconUrl = 'https://play.rosebud.ai/assets/up_chevron.png?RI99';
            break;
        case 'down':
            iconUrl = 'https://play.rosebud.ai/assets/down_chevron.png?ImyT';
            break;
        case 'left':
            iconUrl = 'https://play.rosebud.ai/assets/left_chevron.png?Sydw';
            break;
        case 'right':
            iconUrl = 'https://play.rosebud.ai/assets/right_chevron.png?mPwf';
            break;
    }
    button.style.backgroundImage = `url('${iconUrl}')`;
    dpadContainer.appendChild(button);
});

// Create a container for the Jump button
const jumpContainer = document.createElement('div');
jumpContainer.id = 'jumpContainer';
document.body.appendChild(jumpContainer);

// Create Jump button
const jumpButton = document.createElement('button');
jumpButton.id = 'jumpButton';
jumpButton.classList.add('jump-button');
jumpButton.style.backgroundImage = `url('https://play.rosebud.ai/assets/Up-Arrow.png?EXsR')`;
jumpContainer.appendChild(jumpButton);

// Inject CSS styles dynamically
const styles = `
/* D-Pad Container */
#dpadContainer {
    position: fixed;
    bottom: 150px; /* Moved up further */
    left: 30px; /* Moved inward */
    width: 150px; /* Increased size */
    height: 150px; /* Increased size */
    display: grid;
    grid-template-areas:
        ".   up   ."
        "left  . right"
        ".  down  .";
    grid-gap: 10px; /* Spacing between buttons */
    z-index: 1000;
}

/* Positioning each button in the grid */
#upButton {
    grid-area: up;
}

#downButton {
    grid-area: down;
}

#leftButton {
    grid-area: left;
}

#rightButton {
    grid-area: right;
}

/* D-Pad Buttons */
.dpad-button {
    width: 50px; /* Consistent size */
    height: 50px; /* Consistent size */
    margin: 0; /* Remove margin as grid-gap handles spacing */
    background-color: rgba(0, 0, 0, 0.5); /* Dark semi-transparent background */
    background-size: 60%; /* Uniform icon size */
    background-repeat: no-repeat;
    background-position: center;
    border: none;
    border-radius: 12px; /* Rounded corners */
    opacity: 0.9; /* Higher opacity */
    transition: 
        opacity 0.2s, 
        transform 0.1s, 
        box-shadow 0.2s, 
        filter 0.2s; /* Smooth transitions */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); /* Initial shadow */
}

/* Active State for D-Pad Buttons */
.dpad-button:active {
    opacity: 1;
    transform: scale(0.95);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); /* Shadow becomes more pronounced */
    filter: brightness(1.1); /* Slight brightness increase */
}

/* Jump Button Container */
#jumpContainer {
    position: fixed;
    bottom: 150px; /* Moved up further */
    right: 30px; /* Moved inward */
    width: 80px; /* Maintained size */
    height: 80px; /* Maintained size */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

/* Jump Button */
.jump-button {
    width: 70px; /* Increased size */
    height: 70px; /* Increased size */
    background-color: rgba(0, 0, 0, 0.5); /* Dark semi-transparent background */
    background-size: 60%; /* Uniform icon size */
    background-repeat: no-repeat;
    background-position: center;
    border: none;
    border-radius: 35px; /* Fully rounded */
    opacity: 0.9; /* Higher opacity */
    transition: 
        opacity 0.2s, 
        transform 0.1s, 
        box-shadow 0.2s, 
        filter 0.2s; /* Smooth transitions */
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); /* Initial shadow */
    background-image: url('https://play.rosebud.ai/assets/Up-Arrow.png?EXsR'); /* Jump button icon */
}

/* Active State for Jump Button */
.jump-button:active {
    opacity: 1;
    transform: scale(0.95);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); /* Shadow becomes more pronounced */
    filter: brightness(1.1); /* Slight brightness increase */
}

/* Responsive Adjustments */
@media (max-width: 600px) {
    /* D-Pad Container */
    #dpadContainer {
        bottom: 120px; /* Increased from 80px to move up on smaller screens */
        left: 25px;
        width: 120px;
        height: 120px;
    }

    /* D-Pad Buttons */
    .dpad-button {
        width: 40px;
        height: 40px;
        background-size: 60%; /* Ensure uniform size */
    }

    /* Jump Button Container */
    #jumpContainer {
        bottom: 120px; /* Increased from 80px */
        right: 25px;
        width: 60px;
        height: 60px;
    }

    /* Jump Button */
    .jump-button {
        width: 60px;
        height: 60px;
        background-size: 60%; /* Ensure uniform size */
    }
}
`;

// Append the styles to the head
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Define keysPressed object with standardized key names
const keysPressed = {
    up: false,
    down: false,
    left: false,
    right: false,
    jump: false,
};

// Helper functions to handle button presses
function addButtonListeners(buttonId, key) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    // Prevent default to avoid unwanted scrolling or other behaviors
    button.addEventListener('touchstart', (event) => {
        event.preventDefault();
        keysPressed[key] = true;
    }, {
        passive: false
    });

    button.addEventListener('touchend', (event) => {
        event.preventDefault();
        keysPressed[key] = false;
    }, {
        passive: false
    });

    // Also handle mouse events for desktop compatibility
    button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        keysPressed[key] = true;
    });

    button.addEventListener('mouseup', (event) => {
        event.preventDefault();
        keysPressed[key] = false;
    });

    button.addEventListener('mouseleave', (event) => {
        event.preventDefault();
        keysPressed[key] = false;
    });
}

// Map buttons to standardized keys
addButtonListeners('upButton', 'up');
addButtonListeners('downButton', 'down');
addButtonListeners('leftButton', 'left');
addButtonListeners('rightButton', 'right');
addButtonListeners('jumpButton', 'jump');

// =========================
// Keyboard Controls Integration
// =========================

// Add event listeners for keyboard controls
window.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            keysPressed.up = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            keysPressed.down = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            keysPressed.left = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            keysPressed.right = true;
            break;
        case 'Space':
            keysPressed.jump = true;
            break;
        default:
            break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            keysPressed.up = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            keysPressed.down = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            keysPressed.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            keysPressed.right = false;
            break;
        case 'Space':
            keysPressed.jump = false;
            break;
        default:
            break;
    }
});

// =========================
// End of Mobile and Keyboard Controls Integration
// =========================

// Function to apply controls based on keysPressed
function applyControls() {
    const moveSpeed = 1.0; // Adjust as needed
    const verticalSpeed = 1.0; // Speed for moving up/down

    if (keysPressed.up) {
        camera.position.z -= moveSpeed;
    }
    if (keysPressed.down) {
        camera.position.z += moveSpeed;
    }
    if (keysPressed.left) {
        camera.position.x -= moveSpeed;
    }
    if (keysPressed.right) {
        camera.position.x += moveSpeed;
    }
    if (keysPressed.jump) {
        camera.position.y += verticalSpeed;
    }
}