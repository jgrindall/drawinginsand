

/**
 * Demo usage of the FluidSolver class.
 *
 * @author Topaz Bar <topaz1008@gmail.com>
 */
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm';
import { FluidSolver } from './fluidsolver.js';
import { AppGUI } from './gui.js';
import * as THREE from 'three';
import * as StackBlur from 'stackblur-canvas';

const NUM_OF_CELLS = 128
    
const VIEW_SIZE = 128

const CELL_SIZE = VIEW_SIZE / NUM_OF_CELLS;

const CELL_SIZE_CEIL = Math.ceil(CELL_SIZE); // Size of each cell in pixels (ceiling)


const canvas = document.getElementById('main-canvas'),
    context = canvas.getContext('2d');

    const canvas2 = document.getElementById('main-canvas2')

// Create the fluid solver
const fs = new FluidSolver(NUM_OF_CELLS);
fs.resetVelocity();
fs.resetDensity();

// We draw the density on a bitmap for performance reasons
const fdBuffer = context.createImageData(VIEW_SIZE, VIEW_SIZE);

// Demo app variables
let isMouseDown = false, oldMouseX = undefined, oldMouseY = undefined, oldI = undefined, oldJ = undefined

// App options object for the gui
const appOptions = {
    fluidSolver: fs,
    grayscale: true
};

// Set up the gui
const gui = new AppGUI(GUI, { width: 400, autoPlace: false }, appOptions);
gui.init();

// Set render states
canvas.width = canvas.height = VIEW_SIZE; // View size
canvas2.width = canvas2.height = VIEW_SIZE; 

context.lineWidth = 1;                    // Velocity field line width
context.strokeStyle = 'rgb(192, 0, 0)';   // Velocity field color

// Disable smoothing when using floating point pixel values
context.imageSmoothingEnabled = true;

//<editor-fold desc="Mouse and touch event listeners registration">
document.addEventListener('mouseup', () => { isMouseDown = false; oldMouseX = undefined; oldMouseY = undefined;oldI = undefined; oldJ = undefined;}, false);
document.addEventListener('mousedown', () => { isMouseDown = true; }, false);

// Mouse move listener (on the canvas element)
canvas.addEventListener('mousemove', onMouseMove, false);


let drawingVal = 0.05

/**
 * Main mouse move listener
 *
 * @param e {MouseEvent|Object}
 */
function onMouseMove(e) {
    const mouseX = e.offsetX,
        mouseY = e.offsetY;

    // Find the cell below the mouse
    const i = (mouseX / VIEW_SIZE) * NUM_OF_CELLS + 1,
        j = (mouseY / VIEW_SIZE) * NUM_OF_CELLS + 1;

    // Don't overflow grid bounds
    if (i > NUM_OF_CELLS || i < 1 || j > NUM_OF_CELLS || j < 1) return;

    // Mouse velocity
    const du = (mouseX - oldMouseX) * 0.5,
        dv = (mouseY - oldMouseY) * 0.5;

    // Add the mouse velocity to cells above, below, to the left, and to the right.

    let speed = Math.sqrt(du * du + dv * dv)

    const MIN_SPEED = 0
    const MAX_SPEED = 16

    speed = Math.max(MIN_SPEED, Math.min(speed, MAX_SPEED))

    const speedFrac = speed/MAX_SPEED

    // 0 -> MAX_SIZE  1 -> MIN_SIZE

    const MIN_SIZE = 2
    const MAX_SIZE = 3.5

    const size = speedFrac * (MIN_SIZE - MAX_SIZE) + MAX_SIZE

    if (isMouseDown) {
        // If holding down the mouse, add density to the cell below the mouse
       
        const velScale = 250

        for(let di = -size; di <= size; di++) {
            for(let dj = -size; dj <= size; dj++) {
                fs.uOld[fs.I(i + di, j + dj)] = du * velScale;
                fs.vOld[fs.I(i + di, j + dj)] = dv * velScale;
            }
        }
    
        //todo - use du and dv to "push" the pixels in the direction of the mouse
        
        // draw pixels under the mouse, 

        const numSteps = 20

        const fromI = oldI || i
        const fromJ = oldJ || j


        for(let n = 0; n <= numSteps; n++){
            const t = n/numSteps
            const iDraw = Math.floor(fromI * (1 - t) + i * t)
            const jDraw = Math.floor(fromJ * (1 - t) + j * t)

            for(let di = -size; di <= size; di++) {
                for(let dj = -size; dj <= size; dj++) {
                    if(di*di + dj*dj < size*size) {
                        fs.dOld[fs.I(iDraw + di, jDraw + dj)] = drawingVal
                        fs.d[fs.I(iDraw + di, jDraw + dj)] = drawingVal
                    }
                }
            }

        }

    }

    // Save current mouse position for next frame
    oldMouseX = mouseX;
    oldMouseY = mouseY;

    oldI = i
    oldJ = j

} // End onMouseMove()



/**
 * Update loop
 */
function update(/*time*/) {
    const invMaxColor = 1.0 / 255;


    // Step the fluid simulation
    fs.velocityStep();
    fs.densityStep();

    // Clear the canvas
    context.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

    // Draw the last frame's buffer and clear for drawing the current.
    context.putImageData(fdBuffer, 0, 0);

    const context2 = canvas2.getContext('2d');


    context2.putImageData(fdBuffer, 0, 0);



    clearImageData(fdBuffer);
 
   //StackBlur.canvasRGBA(canvas2, 0, 0, VIEW_SIZE, VIEW_SIZE, 6);



    // Render fluid
    for (let i = 1; i <= NUM_OF_CELLS; i++) {
        // The x position of current cell
        const dx = (i - 0.5) * CELL_SIZE;

        for (let j = 1; j <= NUM_OF_CELLS; j++) {
            // The y position of current cell
            const dy = (j - 0.5) * CELL_SIZE;

            const cellIndex = i + (NUM_OF_CELLS + 2) * j;

            // Draw density
            const density = fs.d[cellIndex];
            if (density > 0) {
                const color = density * 255;



                const r = color;
                const g = ((appOptions.grayscale) ? color : color * dx * invMaxColor);
                const b = ((appOptions.grayscale) ? color : color * dy * invMaxColor);

                // Draw the cell on an image for performance reasons
                for (let l = 0; l < CELL_SIZE_CEIL; l++) {
                    for (let m = 0; m < CELL_SIZE_CEIL; m++) {
                        const pxX = (i - 1) * CELL_SIZE + l;
                        const pxY = (j - 1) * CELL_SIZE + m;
                        const pxIdx = ((pxX | pxX) + (pxY | pxY) * VIEW_SIZE) * 4;

                        fdBuffer.data[pxIdx    ] = r;
                        fdBuffer.data[pxIdx + 1] = g;
                        fdBuffer.data[pxIdx + 2] = b;
                        fdBuffer.data[pxIdx + 3] = 255;
                    }
                }
            }

          
        } // End for all cells in the y direction

    } // End for all cells in the x direction

   

    
    requestAnimationFrame(update);

} // End update()

// Start app
update();

/**
 * Clears all the pixels on the image data.
 *
 * @param image {ImageData}
 */
function clearImageData(image) {
    for (let i = 0; i < image.data.length; i++) {
        if ((i % 4) === 0) {
            image.data[i] = 100;

        } else {
            image.data[i] = 0;
        }
    }
}


///////////////

const contentsTexture = new THREE.CanvasTexture(canvas2)

const container = document.getElementById('three-canvas')

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
})

container.appendChild(renderer.domElement)

const w = 800
const h = 600

renderer.setSize(w, h)

const camera = new THREE.PerspectiveCamera( 45, w/h, 1, 10000 )
camera.position.set( 0, 0, 10 )

const scene = new THREE.Scene()
scene.background = new THREE.Color( 0x050505 )

const light = new THREE.DirectionalLight( 0xffffff, 1 )
light.position.set( 0.5, 0.5, 1 )
scene.add( light )

const ambientLight = new THREE.AmbientLight( 0x323232, 0.5 )
scene.add( ambientLight )

let geometry = new THREE.PlaneGeometry(5, 5, 256, 256)

const t1 = new THREE.TextureLoader().load("/PlasterPlain001_Sphere.png")
const t2 = new THREE.TextureLoader().load("/Snow004.png")
const t3 = new THREE.TextureLoader().load("/istockphoto-1268215953-612x612.jpg")
const t4 = new THREE.TextureLoader().load("/snow-pbr-material1-01.jpg")
const t5 = new THREE.TextureLoader().load("/snow-pbr-material6-01.jpg")


let material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: contentsTexture,
    bumpScale: 50,
    map: t3,
    //displacementMap: contentsTexture,
    //alphaMap: contentsTexture,
    transparent: true,
})

const targetMesh = new THREE.Mesh(
    geometry,
    material
)

targetMesh.rotateX(-0.25)

scene.add(targetMesh)

const render = () => {
    renderer.render(scene, camera)
    contentsTexture.needsUpdate = true
    material.needsUpdate = true
    requestAnimationFrame(render)
}

render(0)







