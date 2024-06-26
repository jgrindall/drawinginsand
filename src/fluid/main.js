
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm';
import { FluidSolver } from './fluidsolver.js';
import { AppGUI } from './gui.js';
import * as THREE from 'three';
import * as StackBlur from 'stackblur-canvas';

const NUM_OF_CELLS = 128
    
const VIEW_SIZE = 128

const CELL_SIZE = VIEW_SIZE / NUM_OF_CELLS;

const CELL_SIZE_CEIL = Math.ceil(CELL_SIZE); // Size of each cell in pixels (ceiling)


const canvas = document.getElementById('main-canvas');
const context = canvas.getContext('2d');
const canvas2 = document.getElementById('main-canvas2')

// Create the fluid solver
const fluidSolver = new FluidSolver(NUM_OF_CELLS);
fluidSolver.resetVelocity();

const img = new Image()

const densityCanvas = document.createElement('canvas')


img.onload = ()=>{
    densityCanvas.width = NUM_OF_CELLS
    densityCanvas.height = NUM_OF_CELLS
    densityCanvas.
    Context('2d').drawImage(img, 0, 0, img.width, img.height, 0, 0, NUM_OF_CELLS, NUM_OF_CELLS)
    fluidSolver.resetDensityUsingCanvas(densityCanvas)
}
img.src = "/img1.jpg"

fluidSolver.resetDensityUsingCanvas()

// We draw the density on a bitmap for performance reasons
const fdBuffer = context.createImageData(VIEW_SIZE, VIEW_SIZE);

// Demo app variables
let isMouseDown = false,
    oldMouseX = 0,
    oldMouseY = 0;


// App options object for the gui
const appOptions = {
    fluidSolver: fluidSolver,
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
document.addEventListener('mouseup', () => { isMouseDown = false; }, false);
document.addEventListener('mousedown', () => { isMouseDown = true; }, false);

// Mouse move listener (on the canvas element)
canvas.addEventListener('mousemove', onMouseMove, false);


let drawingVal = 0

/**

setTimeout(() => {
    alert("0")
    drawingVal = 0.01
}, 5000)

**/



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

    
    //console.log("du, dv", du, dv)

    const speedScale = 20

    const size = 1

    const draw = (i, j, size, drawingVal)=>{
        for(let di = -size; di <= size; di++) {
            for(let dj = -size; dj <= size; dj++) {
                //fluidSolver.dOld[fluidSolver.getArrayIndex(i + di, j + dj)] = drawingVal
                fluidSolver.d[fluidSolver.getArrayIndex(i + di, j + dj)] = 0
            }
        }
    }

    const copyData1 = (i, j, iDisp, jDisp)=>{
        //console.log(i, j, iDisp, jDisp)
        const currentVal = fluidSolver.d[fluidSolver.getArrayIndex(i, j)]
        fluidSolver.d[fluidSolver.getArrayIndex(i + iDisp, j + jDisp)] = currentVal
        fluidSolver.dOld[fluidSolver.getArrayIndex(i + iDisp, j + jDisp)] = fluidSolver.dOld[fluidSolver.getArrayIndex(i, j)]
    }

    // copy data
    const copyData = (i, j, iDisp, jDisp, size)=>{
       // console.log("pushing", iDisp, jDisp)
        for(let di = -size; di <= size; di++) {
            for(let dj = -size; dj <= size; dj++) {
                //console.log(di, dj)
                copyData1(i + di, j + dj, iDisp, jDisp)
            }
        }
    }

    const updateUV =(i, j, du, dv)=>{
        for(let di = -size; di <= size; di++) {
            // Add the mouse velocity to cells above, below, to the left, and to the right.
            for(let dj = -size; dj <= size; dj++) {
                fluidSolver.uOld[fluidSolver.getArrayIndex(i + di, j + dj)] = du;
                fluidSolver.vOld[fluidSolver.getArrayIndex(i + di, j + dj)] = dv;
            }
        }
    }

    if (isMouseDown) {

        //copyData(i, j, 20, 20, 4)
       // copyData(i, j, du * speedScale, dv * speedScale, size)

        // If holding down the mouse, add density to the cell below the mouse

       // updateUV(i, j, du, dv)
      
        //and draw black

        //draw(i, j, size * 1.5, 1)
        //draw(i - dv, j + du, 1, 1)
      //  draw(i + dv, j - du, 1, 1)
        draw(i, j, 1, 0)
        
    }

    // Save current mouse position for next frame
    oldMouseX = mouseX;
    oldMouseY = mouseY;

}



/**
 * Update loop
 */
function update(/*time*/) {
    


    if(!isMouseDown){
            // Step the fluid simulation


        fluidSolver.velocityStep();
        fluidSolver.densityStep();

    }

        // Clear the canvas
        context.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE);

        // Draw the last frame's buffer and clear for drawing the current.
        context.putImageData(fdBuffer, 0, 0);

        const context2 = canvas2.getContext('2d');


        context2.putImageData(fdBuffer, 0, 0);

        clearImageData(fdBuffer);
    
    //StackBlur.canvasRGBA(canvas2, 0, 0, VIEW_SIZE, VIEW_SIZE, 4);



        // Render fluid
        for (let i = 1; i <= NUM_OF_CELLS; i++) {
            // The x position of current cell
            const dx = (i - 0.5) * CELL_SIZE;

            for (let j = 1; j <= NUM_OF_CELLS; j++) {
                // The y position of current cell
                const dy = (j - 0.5) * CELL_SIZE;

                const cellIndex = fluidSolver.getArrayIndex(i, j)

                // Draw density
                const density = fluidSolver.d[cellIndex];
                if (density >= 0) {
                    const color = density * 255;



                    const r = color;
                    const g = color
                    const b = color

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

            image.data[i] = 0;

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


//renderer.shadowMapEnabled = true;


container.appendChild(renderer.domElement)

const w = 800
const h = 600

renderer.setSize(w, h)

const camera = new THREE.PerspectiveCamera( 45, w/h, 1, 10000 )
camera.position.set( 0, 0, 8 )

const scene = new THREE.Scene()
scene.background = new THREE.Color( 0x050505 )

const light = new THREE.DirectionalLight( 0xffffff, 5)
light.position.set( 2, 2, 1 )
light.lookAt( 0, 0, 0 )
scene.add( light )

light.castShadow = true;




const ambientLight = new THREE.AmbientLight( 0xffffff, 0.5 )
scene.add( ambientLight )

let geometry = new THREE.PlaneGeometry(5, 5, 256, 256)

const matcapTexture = new THREE.TextureLoader().load('/Snow004.png')

const fTexture = new THREE.TextureLoader().load('/f1.jpg')

let material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    //map: fTexture,
    bumpMap: contentsTexture,
    bumpScale: 50,
    displacementMap: contentsTexture,
    displacementScale:0.75,
    //alphaMap: contentsTexture,
    transparent: true,

})




const targetMesh = new THREE.Mesh(
    geometry,
    material
)

//targetMesh.castShadow = true;
//targetMesh.receiveShadow = true;


targetMesh.rotateX(-0.25)

scene.add(targetMesh)

const render = () => {
    renderer.render(scene, camera)
    contentsTexture.needsUpdate = true
    material.needsUpdate = true
    requestAnimationFrame(render)
    //targetMesh.rotateX(-0.001)
}

render(0)







