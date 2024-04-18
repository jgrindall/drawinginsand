
import * as THREE from 'three';
import { FluidSolver } from './fluidsolver.js';


const SIZE = 64

const canvas = document.getElementById('main-canvas')
const context = canvas.getContext('2d')
const canvas2 = document.getElementById('main-canvas2')
const canvas3 = document.getElementById('main-canvas3')
const context3 = canvas3.getContext('2d')

canvas.width = canvas.height = SIZE
canvas2.width = canvas2.height = SIZE
canvas3.width = canvas3.height = SIZE

const img = new Image()
const imgCanvas = document.createElement('canvas')
imgCanvas.width = SIZE
imgCanvas.height = SIZE
const imgContext = imgCanvas.getContext('2d')

img.onload = ()=>{
    imgContext.drawImage(img, 0, 0, SIZE, SIZE)
    init()
}
img.src = "/paint.png"

const brush = new Image()
brush.src = "/brush3.png"

let fs, appOptions;

const init = ()=>{
    fs = new FluidSolver(SIZE, imgCanvas)
    fs.resetVelocity()
    fs.resetDensity()

    appOptions = {
        fluidSolver: fs,
        grayscale: true
    }
    update()
}

// We draw the density on a bitmap for performance reasons
const fdBuffer = context.createImageData(SIZE, SIZE)

// Demo app variables
let isMouseDown = false, oldMouseX = undefined, oldMouseY = undefined, oldI = undefined, oldJ = undefined

context3.fillStyle = "#ffffff"
context3.fillRect(0, 0, SIZE, SIZE)

document.addEventListener('mouseup', () => {
        isMouseDown = false;
        oldMouseX = undefined;
        oldMouseY = undefined;
        oldI = undefined;
        oldJ = undefined;
    }, false)

document.addEventListener('mousedown', () => { isMouseDown = true; }, false)
canvas.addEventListener('mousemove', onMouseMove, false)


function onMouseMove(e) {
    const mouseX = e.offsetX
    const mouseY = e.offsetY;

    // Find the cell below the mouse
    const i = mouseX + 1
    const j = mouseY + 1

    // Don't overflow grid bounds
    if (i > SIZE || i < 1 || j > SIZE || j < 1){
        return
    }

    // Mouse velocity
    const du = (mouseX - oldMouseX)
    const dv = (mouseY - oldMouseY)

    // Add the mouse velocity to cells above, below, to the left, and to the right.

    let speed = Math.sqrt(du * du + dv * dv)

    const MIN_SPEED = 0
    const MAX_SPEED = 16

    speed = Math.max(MIN_SPEED, Math.min(speed, MAX_SPEED))

    const speedFrac = speed/MAX_SPEED

    // 0 -> MAX_SIZE  1 -> MIN_SIZE

    const MIN_SIZE = SIZE / 100
    const MAX_SIZE = SIZE / 50

    const size = speedFrac * (MIN_SIZE - MAX_SIZE) + MAX_SIZE

    if (isMouseDown) {
        // If holding down the mouse, add density to the cell below the mouse
       
        const velScale = 10000

        const velSize = size*4

        for(let di = -velSize; di <= velSize; di++) {
            for(let dj = -velSize; dj <= velSize; dj++) {
                const ix = Math.round(i + di)
                const iy = Math.round(j + dj)
                fs.uOld[fs.getArrayIndex(ix, iy)] = du * velScale
                fs.vOld[fs.getArrayIndex(ix, iy)] = dv * velScale
            }
        }
    
        //todo - use du and dv to "push" the pixels in the direction of the mouse
        
        // draw pixels under the mouse, 

        const numSteps = 32

        const fromI = oldI || i
        const fromJ = oldJ || j


        for(let n = 0; n <= numSteps; n++){
            const t = n/numSteps
            const iDraw = Math.floor(fromI * (1 - t) + i * t)
            const jDraw = Math.floor(fromJ * (1 - t) + j * t)

            for(let di = -size; di <= size; di++) {
                for(let dj = -size; dj <= size; dj++) {
                    const r = (di*di + dj*dj) / (size*size)
                    if(r < 1) {
                        const val = 0.62
                        const randomness = 0.06
                        const drawingVal = val + (2*Math.random() - 1) * randomness

                        const ix = Math.round(iDraw + di)
                        const iy = Math.round(jDraw + dj)

                        fs.dOld[fs.getArrayIndex(ix, iy)] = drawingVal
                        fs.d[fs.getArrayIndex(ix, iy)] = drawingVal
                    }
                }
            }

        }
        //const brushSize = 14
        //context3.drawImage(brush, i - s/2, j - s/2, s, s) 
    }

    // Save current mouse position for next frame
    oldMouseX = mouseX
    oldMouseY = mouseY

    oldI = i
    oldJ = j

} 

/**
 * Update loop
 */
function update(/*time*/) {
    

    // Step the fluid simulation
    fs.velocityStep()
    fs.densityStep()

    // Clear the canvas
    context.clearRect(0, 0, SIZE, SIZE)

    // Draw the last frame's buffer and clear for drawing the current.
    context.putImageData(fdBuffer, 0, 0)

    const context2 = canvas2.getContext('2d')
    context2.putImageData(fdBuffer, 0, 0)

    const p = 0.01
    const f = n => Math.pow((n/255), p) * 255
    
    const imageData = context2.getImageData(0,0,canvas2.width,canvas2.height)
    var data = imageData.data

    for(var x = 0, len = data.length; x < len; x+=4) {
        data[x] = f(data[x])
        data[x + 1] = f(data[x + 1])
        data[x + 2] = f(data[x + 2])
    }

    context2.putImageData(imageData, 0, 0)

    clearImageData(fdBuffer)


    // Render fluid
    for (let i = 1; i <= SIZE; i++) {

        for (let j = 1; j <= SIZE; j++) {

            const cellIndex = i + (SIZE + 2) * j

            // Draw density
            const density = 1 - fs.d[cellIndex]

            if (density >= 0) {
                const color = density * 255;



                const r = color
                const g = color
                const b = color

                // Draw the cell on an image for performance reasons
                for (let l = 0; l < 1; l++) {
                    for (let m = 0; m < 1; m++) {
                        const pxX = (i - 1) + l
                        const pxY = (j - 1) + m
                        const pxIdx = ((pxX | pxX) + (pxY | pxY) * SIZE) * 4

                        fdBuffer.data[pxIdx    ] = r
                        fdBuffer.data[pxIdx + 1] = g
                        fdBuffer.data[pxIdx + 2] = b
                        fdBuffer.data[pxIdx + 3] = 255
                    }
                }
            }

          
        }

    }

    requestAnimationFrame(update)
}



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

const contentsTexture = new THREE.CanvasTexture(canvas)

const aTexture = new THREE.CanvasTexture(canvas2)

const container = document.getElementById('three-canvas')
const purple = 0x8E24AA

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    backgroundColor: purple
})

container.appendChild(renderer.domElement)

const w = 800
const h = 600

renderer.setSize(w, h)

const camera = new THREE.PerspectiveCamera( 45, w/h, 1, 10000 )
camera.position.set( 0, 0, 10 )

const scene = new THREE.Scene({
    backgroundColor: new THREE.Color( purple )
})

const color = 0xf3e9bd
//0xffffff

const light = new THREE.DirectionalLight( color, 4 )
light.position.set( 0.5, 0.5, 1 )
scene.add( light )

const ambientLight = new THREE.AmbientLight( color, 1 )
scene.add( ambientLight )

let geometry = new THREE.PlaneGeometry(5, 5, 256, 256)

const displacementScale = 0.125

let material = new THREE.MeshPhysicalMaterial({
    color: color,
    bumpMap: contentsTexture,
    bumpScale: 50,
    displacementMap: contentsTexture,
    displacementScale: displacementScale,
    alphaMap: aTexture,
    transparent: true
})

const targetMesh = new THREE.Mesh(
    geometry,
    material
)

let material2 = new THREE.MeshBasicMaterial({
    color: purple,
    opacity: 1
})

const targetMesh2 = new THREE.Mesh(
    geometry,
    material2
)


 const g = new THREE.Group()
 
g.rotateX(-0.25)

targetMesh2.position.z = displacementScale * 0.5

g.add(targetMesh)
g.add(targetMesh2)
scene.add(g)
const render = () => {
    renderer.render(scene, camera)
    contentsTexture.needsUpdate = true
    //g.rotateX(-0.005)
    aTexture.needsUpdate = true
    material.needsUpdate = true
    requestAnimationFrame(render)
}

render(0)




