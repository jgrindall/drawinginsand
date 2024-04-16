
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.17/+esm';
import { FluidSolver } from './fluidsolver.js';
import { AppGUI } from './gui.js';
import * as THREE from 'three';
import * as StackBlur from 'stackblur-canvas';
import paper from 'paper'

const VIEW_SIZE = 512

const canvas1 = document.getElementById('main-canvas1');
const context1 = canvas1.getContext('2d');

const canvas2 = document.getElementById('main-canvas2');
const context2 = canvas2.getContext('2d');

const canvas3 = document.getElementById('main-canvas3');
const context3 = canvas3.getContext('2d');

const canvas4 = document.getElementById('main-canvas4');
const context4 = canvas4.getContext('2d');

const canvas5 = document.getElementById('main-canvas5');
const context5 = canvas5.getContext('2d');


const paperScope = new paper.PaperScope()
paperScope.setup(canvas5)
paperScope.view.autoUpdate = false
paperScope.view.viewSize = new paper.Size(VIEW_SIZE, VIEW_SIZE)
const tool = new paper.Tool()
tool.activate()

const path = new paper.Path({
    strokeJoin: 'round',
    strokeCap: 'round',
    strokeColor: paper.Color.random(),
    strokeWidth: 10
})

paperScope.project.activeLayer.addChild(path)

const img = new Image()

img.onload = ()=>{
    context4.drawImage(img, 0, 0, img.width, img.height, 0, 0, VIEW_SIZE, VIEW_SIZE)
}

img.src = "/img1.jpg"

// Demo app variables
let isMouseDown = false,
    oldMouseX = 0,
    oldMouseY = 0;


canvas1.width = canvas1.height = VIEW_SIZE;
canvas2.width = canvas2.height = VIEW_SIZE;
canvas3.width = canvas3.height = VIEW_SIZE;
canvas4.width = canvas4.height = VIEW_SIZE;
canvas5.width = canvas5.height = VIEW_SIZE;


context4.fillStyle = "rgb(100, 100, 100)";
context4.fillRect(0, 0, VIEW_SIZE, VIEW_SIZE);

document.addEventListener('mouseup', () => { isMouseDown = false; copyAllAndClear();}, false);
document.addEventListener('mousedown', () => { isMouseDown = true; startPath();}, false);

canvas1.addEventListener('mousemove', onMouseMove, false);



const drawPath = (x, y) => {

    const NUM = 10

    const f = (context, size, clr)=>{
        for(let n = 0; n <= NUM; n++){
            const t = n/NUM
            const xL = oldMouseX * t + (1 - t) * x
            const yL = oldMouseY * t + (1 - t) * y
    
            context.fillStyle = clr
            context.fillRect(xL - size/2, yL - size/2, size, size);
        }    
    }

    f(context1, 2, "rgb(80, 80, 80)")
    f(context2, 2.5, "rgb(120, 120, 120)")


    context3.drawImage(canvas2, 0, 0, VIEW_SIZE, VIEW_SIZE)
    context3.drawImage(canvas1, 0, 0, VIEW_SIZE, VIEW_SIZE)

    StackBlur.canvasRGBA(canvas3, 0, 0, VIEW_SIZE, VIEW_SIZE, 1)
   

    context4.drawImage(canvas3, 0, 0, VIEW_SIZE, VIEW_SIZE)
    
}

const copyPath = () => {
    
}

const startPath = ()=>{
    
}

const copyAllAndClear = ()=>{
    
    
    context4.drawImage(canvas3, 0, 0, VIEW_SIZE, VIEW_SIZE)
    context1.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE)  
    context2.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE)  
    context3.clearRect(0, 0, VIEW_SIZE, VIEW_SIZE)  

    

   
}

function onMouseMove(e) {
    const mouseX = e.offsetX,
        mouseY = e.offsetY;

    if (isMouseDown) {

        
        drawPath(mouseX, mouseY)

        copyPath()

        path.moveTo(new paper.Point(mouseX, mouseY))
         
    }

    // Save current mouse position for next frame
    oldMouseX = mouseX;
    oldMouseY = mouseY;

}



/**
 * Update loop
 */
function update(/*time*/) {
    
    requestAnimationFrame(update);

}

update();

///////////////

const contentsTexture = new THREE.CanvasTexture(canvas4)

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
    bumpScale: 4,
    displacementMap: contentsTexture,
    displacementScale:0.5,
    //alphaMap: contentsTexture,
    //alphaTest: 0.7,
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







