
import * as THREE from 'three';
import { FluidSolver, IFluidSolver } from './fluidsolver';
import {clearImageData} from './utils'

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement
const canvas2 = document.getElementById('main-canvas2') as HTMLCanvasElement
const canvas3 = document.getElementById('main-canvas3') as HTMLCanvasElement
const container = document.getElementById('three-canvas')

type Options = {
    densitySource: string,
    size:number
}
export class Fluid{

    private renderer: THREE.WebGLRenderer | undefined
    private camera: THREE.PerspectiveCamera | undefined
    private scene: THREE.Scene | undefined
    private fdBuffer: ImageData | undefined
    private fs: IFluidSolver | undefined
    private isMouseDown:boolean = false
    private oldMouseX:number | undefined = undefined
    private oldMouseY:number | undefined = undefined
    private mouseX:number | undefined = undefined
    private mouseY:number | undefined = undefined
    private oldI:number | undefined = undefined
    private oldJ:number | undefined = undefined
    private imgCanvas: HTMLCanvasElement | undefined
    private contentsTexture: THREE.CanvasTexture | undefined

    constructor(private options: Options){

        canvas!.width = this.options.size
        canvas!.height = this.options.size
        canvas2!.width = this.options.size
        canvas2!.height = this.options.size
        canvas3!.width = this.options.size
        canvas3!.height = this.options.size

        this.update = this.update.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseDown = this.onMouseDown.bind(this)

        const context = canvas!.getContext('2d')
        this.fdBuffer = context!.createImageData(this.options.size, this.options.size)

        const img = new Image()
        this.imgCanvas = document.createElement('canvas')
        this.imgCanvas.width = this.options.size
        this.imgCanvas.height = this.options.size
        const imgContext = this.imgCanvas.getContext('2d')

        img.onload = ()=>{
            imgContext!.drawImage(img, 0, 0, this.options.size, this.options.size)
            this.initFluidSolver()
            this.initScene()
            this.addListeners()
            this.update()
        }

        img.src = this.options.densitySource
    }
    private update(){
        this.renderScene()
        this.updateFluid()
        requestAnimationFrame(this.update)
    }
    private updateFluid(){
        this.fs!.velocityStep()
        this.fs!.densityStep()

        const context = canvas!.getContext('2d')
    
        context!.clearRect(0, 0, this.options.size, this.options.size)
        // Draw the last frame's buffer and clear for drawing the current.
        context!.putImageData(this.fdBuffer!, 0, 0)
        //TODO - optimise this!
    
        const context2 = canvas2!.getContext('2d')
        context2!.putImageData(this.fdBuffer!, 0, 0)
        const p = 0.01
        const f = (n:number) => n
        //Math.pow((n/255), p) * 255
        
        const imageData = context2!.getImageData(0, 0, this.options.size, this.options.size)
        var data = imageData.data
    
        for(var x = 0, len = data.length; x < len; x+=4) {
            data[x] = f(data[x])
            data[x + 1] = f(data[x + 1])
            data[x + 2] = f(data[x + 2])
        }
    
        context2!.putImageData(imageData, 0, 0)
    
        clearImageData(this.fdBuffer)

        const den = this.fs!.getDensities()
    
        // Render fluid
        for (let i = 1; i <= this.options.size; i++) {
            for (let j = 1; j <= this.options.size; j++) {
                const cellIndex = i + (this.options.size + 2) * j
                // Draw density
                const density = 1 - den[cellIndex]
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
                            const pxIdx = ((pxX | pxX) + (pxY | pxY) * this.options.size) * 4
    
                            this.fdBuffer!.data[pxIdx    ] = r
                            this.fdBuffer!.data[pxIdx + 1] = g
                            this.fdBuffer!.data[pxIdx + 2] = b
                            this.fdBuffer!.data[pxIdx + 3] = 255
                        }
                    }
                }
            }
        }
    }

    private initScene(){
        const purple = 0x8E24AA
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        })
        
        container!.appendChild(this.renderer.domElement)
        
        const w = 800
        const h = 600
        
        this.renderer.setSize(w, h)
        
        this.camera = new THREE.PerspectiveCamera( 45, w/h, 1, 10000 )
        this.camera.position.set( 0, 0, 10 )
        
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color( 0xdddddd )
        
        const color = 0xf3e9bd //0xffffff
        
        const light = new THREE.DirectionalLight( color, 4 )
        light.position.set( 0.5, 0.5, 1 )
        this.scene.add( light )
        
        const ambientLight = new THREE.AmbientLight( color, 1 )
        this.scene.add( ambientLight )
        
        let geometry = new THREE.PlaneGeometry(5, 5, 1, 1)
        
        const displacementScale = 0.125

        this.contentsTexture = new THREE.CanvasTexture(canvas)
        
        let material = new THREE.MeshPhysicalMaterial({
            color: color,
            bumpMap: this.contentsTexture!,
            bumpScale: 50,
            //displacementMap: contentsTexture,
            displacementScale: displacementScale,
            //alphaMap: aTexture,
            transparent: true,
            side: THREE.DoubleSide
        })
        const meshAbove = new THREE.Mesh(
            geometry,
            material
        )
        let material2 = new THREE.MeshBasicMaterial({
            color: purple,
            side: THREE.DoubleSide
        })
        const meshBelow = new THREE.Mesh(
            geometry,
            material2
        )
        const group = new THREE.Group()
        group.rotateX(-0.25)
        
        meshBelow.position.z = -1;//displacementScale * 0.5
        group.add(meshAbove)
        group.add(meshBelow)
        this.scene.add(group)
    }
    private renderScene(){
        this.renderer!.render(this.scene!, this.camera!)
        this.contentsTexture!.needsUpdate = true
        //aTexture.needsUpdate = true
        //material.needsUpdate = true
    }
    private initFluidSolver(){
        this.fs = new FluidSolver(this.options.size, this.imgCanvas!)
        this.fs!.resetVelocity()
        this.fs!.resetDensity()
    }
    private onMouseUp(){
        this.isMouseDown = false
        this.oldMouseX = undefined
        this.oldMouseY = undefined
        this.oldI = undefined
        this.oldJ = undefined
    }
    private onMouseDown(e: {offsetX:number, offsetY:number}){
        this.isMouseDown = true
        this.oldMouseX = e.offsetX
        this.oldMouseX = e.offsetY
    }
    private onMouseMove(e: {offsetX:number, offsetY:number}){
        this.mouseX = e.offsetX
        this.mouseY = e.offsetY
    
        // Find the cell below the mouse
        const i = this.mouseX + 1
        const j = this.mouseY + 1
    
        // Don't overflow grid bounds
        if (i > this.options.size || i < 1 || j > this.options.size || j < 1){
            return
        }
    
        // Mouse velocity
        const du = (this.mouseX - this.oldMouseX!)
        const dv = (this.mouseY - this.oldMouseY!)
    
        // Add the mouse velocity to cells above, below, to the left, and to the right.
    
        let speed = Math.sqrt(du * du + dv * dv)
    
        const MIN_SPEED = 0
        const MAX_SPEED = 16
    
        speed = Math.max(MIN_SPEED, Math.min(speed, MAX_SPEED))
    
        const speedFrac = speed/MAX_SPEED
    
        // 0 -> MAX_SIZE  1 -> MIN_SIZE
    
        const MIN_SIZE = this.options.size / 100
        const MAX_SIZE = this.options.size / 50
    
        const size = speedFrac * (MIN_SIZE - MAX_SIZE) + MAX_SIZE
    
        if (this.isMouseDown) {

            // If holding down the mouse, add density to the cell below the mouse
           
            const velScale = 10000
    
            const velSize = size*4
    
            for(let di = -velSize; di <= velSize; di++) {
                for(let dj = -velSize; dj <= velSize; dj++) {
                    const ix = Math.round(i + di)
                    const iy = Math.round(j + dj)
                    this.fs!.updateVelocity(ix, iy, du * velScale, dv * velScale)
                }
            }
            
            // draw pixels under the mouse, 
    
            const numSteps = 12
    
            const fromI = this.oldI || i
            const fromJ = this.oldJ || j
    
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
    
                            this.fs!.updateDensity(ix, iy, drawingVal, true)
                        }
                    }
                }
            }
        }
    
        // Save current mouse position for next frame
        this.oldMouseX = this.mouseX
        this.oldMouseY = this.mouseY
    
        this.oldI = i
        this.oldJ = j
    }
    private addListeners(){
        document.addEventListener('mouseup', this.onMouseUp)
        document.addEventListener('mousedown', this.onMouseDown)
        canvas!.addEventListener('mousemove', this.onMouseMove)
    }
}

