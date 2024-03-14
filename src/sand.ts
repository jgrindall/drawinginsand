
import * as THREE from "three"
import {computeBoundsTree, disposeBoundsTree, acceleratedRaycast} from 'three-mesh-bvh';
import {getCanvas, getCanvasTexture, getTexture, rand} from "./utils"
import { vertexShader, fragmentShader } from "./shaders";
import { SandDrawer, ISandDrawer } from "./SandDrawer";
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


/**
 * set up three-mesh-bvh functionality
 */

//@ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree
//@ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree
THREE.Mesh.prototype.raycast = acceleratedRaycast

const SIZE = 256

class Sand{

    private mode: "draw" | "move" = "move"

    private scene: THREE.Scene | undefined
    private camera: THREE.Camera | undefined
    private renderer: THREE.WebGLRenderer | undefined
    private planeGeometry: THREE.BufferGeometry | undefined
    private planeMesh: THREE.Mesh | undefined
    private planeMaterial: THREE.MeshStandardMaterial | undefined
    private raycaster: THREE.Raycaster | undefined
    private bumpMap: THREE.CanvasTexture | undefined
    private bumpCanvas: HTMLCanvasElement | undefined
    private displacementCanvas: HTMLCanvasElement | undefined
    private grainOfSandCanvas: HTMLCanvasElement | undefined
    private displacementMap: THREE.CanvasTexture | undefined

    private pointsGeometry: THREE.BufferGeometry | undefined
    private pointsMaterial: THREE.ShaderMaterial | undefined
    private pointsMesh: THREE.Points | undefined

    private uniforms: any
    private b1: THREE.Float32BufferAttribute | undefined
    private b2: THREE.Float32BufferAttribute | undefined
    private b3: THREE.Float32BufferAttribute | undefined
    private b4: THREE.Float32BufferAttribute | undefined
    private b5: THREE.Float32BufferAttribute | undefined

    private drawer: ISandDrawer | undefined

    private controls: OrbitControls | undefined
    
    constructor(){
        this.onMouseDown = this.onMouseDown.bind(this)
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)
        this.init()
        this.addPlane()
        //this.addPoints()
        this.addListeners()
        this.render()
    }

    private addListeners(){
        window.addEventListener("mousedown", this.onMouseDown, false)
        this.drawer = new SandDrawer(this.planeGeometry!, this.planeMesh!, this.raycaster!, this.camera!)

        const moveButton = document.getElementById("move") as HTMLButtonElement
        const drawButton = document.getElementById("draw") as HTMLButtonElement

        moveButton.addEventListener("click", ()=>{
            this.mode = "move"
            this.controls!.enabled = true
        })

        drawButton.addEventListener("click", ()=>{
            this.mode = "draw"
            this.controls!.enabled = false
        })

    }


    /**
    private indent(pos: THREE.Vector2){
        const DEPTH:number = 0.02
        this.raycaster!.setFromCamera(pos, this.camera!)
        const intersections = this.raycaster!.intersectObject(this.planeMesh!)
        if(intersections){
            intersections.forEach((intersection: THREE.Intersection) => {
                let a = intersection.face!.a
                const p = this.getPosAttr(a)
                this.updatePosAttr(a, {
                    ...p,
                    y:p.y - DEPTH
                })
                this.updateColorAttr(a)
                this.updateNormAttr(a)
            })
        }
    }
    private drawBump(pos: THREE.Vector2){
        console.log("add some bumps")
        //draw some bumps
        console.log(this.bumpCanvas, this.displacementCanvas)
        this.bumpCanvas!.getContext("2d")!.drawImage(this.grainOfSandCanvas!, 64, 64, 32, 32)
        this.bumpMap!.needsUpdate = true
        this.displacementCanvas!.getContext("2d")!.drawImage(this.grainOfSandCanvas!, 64, 64, 32, 32)
        this.displacementMap!.needsUpdate = true
        this.planeMaterial!.needsUpdate = true
    }

    **/


    /**
     * Convert mouse event to 2D position in the camera view, -1 to 1
     * @param event 
     * @returns 
     */
    private eventToViewportPos(event: MouseEvent): THREE.Vector2{
        const x = (event.clientX / window.innerWidth) * 2 - 1
        const y = -(event.clientY / window.innerHeight) * 2 + 1
        return new THREE.Vector2(x, y)
    }

    /**
     * Draw and listen for movement
     * @param event 
     */
    private onMouseDown(event: MouseEvent){
        if(this.mode === "move"){
            return
        }
        const pos = this.eventToViewportPos(event)
        this.drawer!.drawAt(pos)
        window.addEventListener("mousemove", this.onMouseMove, false)
        window.addEventListener("mouseup", this.onMouseUp, false)
    }

    /**
     * Draw a line between the last position and the current position
     * @param event 
     */
    private onMouseMove(event: MouseEvent){
        const pos = this.eventToViewportPos(event)
        this.drawer!.moveTo(pos)
    }
    
    /**
     * remove the mouse move listeners
     */
    private onMouseUp(){
        window.removeEventListener("mousemove", this.onMouseMove, false)
        window.removeEventListener("mouseup", this.onMouseUp, false)
    }

    private async addPlane(){
        this.planeGeometry = new THREE.PlaneGeometry(10, 10, SIZE, SIZE)
        
        this.planeMaterial = new THREE.MeshStandardMaterial({
            color: "#e5d5ba",
            roughness: 1, 
            metalness: 0,
            bumpScale: 10,
            displacementScale: 12,

            // enable the color attribute
            vertexColors: true,
            side: THREE.DoubleSide
        })

        // create a color attribute
        const len = this.planeGeometry.getAttribute('position').count
        const colors = []
        for(let i = 0; i < len; i++){
            colors.push(255/255, 150/255, 120/255)
        }
        this.planeGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))


        /*
        load bump map (for sandy-ness looking)
        and displacement map (for the 3D look of dunes)
        */
        getTexture("/sand.jpg").then((tex) => {
            this.planeMaterial!.map = tex
            this.planeMaterial!.needsUpdate = true
        })

        getCanvas("/grain.jpg").then((canvas)=>{
            this.grainOfSandCanvas = canvas
        })

        getCanvasTexture("/bump.jpg").then(({texture, canvas}) => {
            //this.bumpMap = texture
            //this.bumpCanvas = canvas
            //this.planeMaterial!.bumpMap = this.bumpMap
            //this.planeMaterial!.needsUpdate = true
        })

        getCanvasTexture("/sandgray.jpg").then(({texture, canvas}) => {
            //this.displacementMap = texture
            //this.displacementCanvas = canvas
            //this.planeMaterial!.displacementMap = this.displacementMap
            //this.planeMaterial!.needsUpdate = true
        })
    
        this.planeMesh = new THREE.Mesh(this.planeGeometry, this.planeMaterial)

        this.planeMesh.updateMatrixWorld()

        //@ts-ignore
        //this.planeGeometry.computeBoundsTree()

        this.planeGeometry.computeBoundingBox()
 
        this.planeGeometry.computeBoundingSphere()

        //this.planeMaterial.wireframe = true
        this.scene!.add(this.planeMesh)

        this.raycaster = new THREE.Raycaster()
        this.raycaster.layers.enableAll()

        const helper = new VertexNormalsHelper(this.planeMesh)

        setInterval(()=>{
            //helper.update()
            this.planeGeometry?.computeVertexNormals()
        }, 1000)

        //this.scene!.add( helper )


        
    }

    private addPoints(){
        const MAX = 500

        const SIZE = 10
        
        const getPos = ()=>{
            const x = rand(-SIZE/2, SIZE/2)
            const y = rand(-SIZE/2, SIZE/2)
            const z = rand(-SIZE/2, SIZE/2)
            
            return {x, y:1.25, z}
        }
        
        const initialPositions = []
        const velocities = []
        const accelerations = []
        const hues = []
        const scale = []
        this.pointsGeometry = new THREE.BufferGeometry()
        for(let i = 0; i < MAX; i++) {
            const p = getPos()
            initialPositions.push(p.x)
            initialPositions.push(p.y)
            initialPositions.push(p.z)
            velocities.push(0)
            velocities.push(0)
            velocities.push(0)
            accelerations.push(0)
            accelerations.push(0)
            accelerations.push(0)

            hues.push(1)
            scale.push(10)
           
        }

        console.log(initialPositions)

        this.b1 = new THREE.Float32BufferAttribute(initialPositions, 3)
        this.b2 = new THREE.Float32BufferAttribute(velocities, 3)
        this.b3 = new THREE.Float32BufferAttribute(accelerations, 3)
        this.b4 = new THREE.Float32BufferAttribute(hues, 1)
        this.b5 = new THREE.Float32BufferAttribute(scale, 1)

        this.pointsGeometry!.setAttribute('position', this.b1)
        this.pointsGeometry!.setAttribute('velocity', this.b2)
        this.pointsGeometry!.setAttribute('acceleration', this.b3)
        this.pointsGeometry!.setAttribute('hue', this.b4)
        this.pointsGeometry!.setAttribute('scale', this.b5)
        
        this.uniforms = {
            u_resolution: {
                type: "v2",
                value: new THREE.Vector2(300, 300) 
            },
            u_texture:{
                type: "t",
                value: null
            }
        }
        this.pointsMaterial = new THREE.ShaderMaterial( {
            uniforms: this.uniforms,
            vertexShader,
            fragmentShader,
            vertexColors: true
        })
        this.pointsMesh = new THREE.Points(this.pointsGeometry, this.pointsMaterial)
        this.scene!.add(this.pointsMesh)

        
    }

    /**
     * Create the scene, camera, renderer, and plane
     */
    private init(){
        this.scene = new THREE.Scene()
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000)
        this.camera.position.set(0, 0, -12)
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))
        this.renderer = new THREE.WebGLRenderer({
            antialias: true
        })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)
        
        const light = new THREE.DirectionalLight(0xffffff, 4.0)
        light.position.set(-5, 5, -2)
        this.scene.add(light)
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5))
        this.controls = new OrbitControls(this.camera, this.renderer.domElement );


        const lightHelper = new THREE.DirectionalLightHelper( light, 5 );
        this.scene.add( lightHelper );


       
    }

    private applyWind(){
        return
        /**
        const b = this.pointsGeometry!.getAttribute("position")
        const v = this.pointsGeometry!.getAttribute("velocity")
        const a = this.pointsGeometry!.getAttribute("acceleration")
        const hu = this.pointsGeometry!.getAttribute("hue")
        const s = this.pointsGeometry!.getAttribute("scale")
        var positions = b.array
        const delta = 0.01

        const width:number = 512
        const height:number = 512

        const w:number = 10
        const h:number = 10

        for(let i = 0; i < positions.length/3; i++){
            const x = b.getX(i)
            const y = b.getY(i)
            const pos =  {
                x: (x + width/2) / width,
                y: (y + height/2) / height
            } // 0 to 1
            pos.x *= w
            pos.y *= h
            pos.y = h - pos.y
            pos.x = Math.round(pos.x)
            pos.y = Math.round(pos.y)
            const vx = v.getX(i)
            const vy = v.getY(i)
            const ax = a.getX(i)
            const ay = a.getY(i)
            //b.setXYZ( i, x + vx*delta, y + vy*delta, 0.1)
            const dx = pos.x - this.currentPos.x
            const dy = pos.y - this.currentPos.y
            const dist = Math.sqrt(dx*dx + dy*dy)
            const maxAccn = 80
            const fingerSize = 10
            if(dist < fingerSize){
                const accnNorm = {x: dx/dist, y: dy/dist}
                const requiredLength = (1 - dist/fingerSize) * maxAccn
                const finalAccn = {x: accnNorm.x * requiredLength, y:accnNorm.y*requiredLength}
                //a.setXYZ(i, finalAccn.x, -finalAccn.y, 0)
                //s.setX(i, rand(2, 7))
                //hu.setX(i, 0.0)
            }
            else{
                //a.setXYZ(i, 0, 0, 0)
            }
            const fallOff = 0.8
            //v.setXYZ(i, (vx + ax*delta)*fallOff, (vy + ay * delta)*fallOff, 0)
        }
         */
    }

    /*
    render loop
    */
    private render(){
        this.applyWind()
        requestAnimationFrame(this.render.bind(this))
        this.controls!.update();
        this.renderer!.render(this.scene!, this.camera!)
    }
}

new Sand()


/**
 * //@ts-ignore
import * as THREE from 'three'
import Filter from './filter'

const w = 600
const h = 300

var width = 9
var height = 4

const rand = (a:number, b:number):number=>{
    return Math.random()*(b - a) + a
}

const makeCanvas = (name:string, w:number, h:number)=>{
    const c = document.createElement("canvas")
    c.id = name
    document.body.appendChild(c)
    c.width = w
    c.height = h
    return c
}
export class Points{

    container: any
    down: boolean
    currentPos: any = {x:Infinity, y:Infinity}
    scene: THREE.Scene
    mesh: THREE.Points
    box: THREE.Mesh
    camera: THREE.OrthographicCamera
    renderer: THREE.WebGLRenderer
    uniforms: any
    geo: THREE.BufferGeometry
    
    drawingCanvas: HTMLCanvasElement
    drawingContext: CanvasRenderingContext2D

    drawingCanvas2: HTMLCanvasElement
    drawingContext2: CanvasRenderingContext2D

    drawingCanvas3: HTMLCanvasElement
    drawingContext3: CanvasRenderingContext2D

    texture: any

    outlineCanvas: HTMLCanvasElement
    outlineContext: CanvasRenderingContext2D

    combinedCanvas: HTMLCanvasElement
    combinedContext: CanvasRenderingContext2D

    dryCanvas: HTMLCanvasElement
    dryContext: CanvasRenderingContext2D

    wetCanvas: HTMLCanvasElement
    wetContext: CanvasRenderingContext2D


    noiseCanvas: HTMLCanvasElement
    noiseContext: CanvasRenderingContext2D

    cTexture: THREE.CanvasTexture
    b1: THREE.Float32BufferAttribute
    b2: THREE.Float32BufferAttribute
    b3: THREE.Float32BufferAttribute
    b4: THREE.Float32BufferAttribute
    b5: THREE.Float32BufferAttribute
    time:number = 0;


    pen: HTMLImageElement
    dry: HTMLImageElement
    wet: HTMLImageElement
    noise: HTMLImageElement
    

    constructor(container: HTMLElement){
        this.container = container
        this.animate = this.animate.bind(this)
        this.load()
        this.pen = new Image()
        this.pen.src = "/images/sdk/sand/pen.png"

        this.dry = new Image()
        this.dry.src = "/images/sdk/sand/dry.png"
        
        this.wet = new Image()
        this.wet.src = "/images/sdk/sand/wet.png"
        
        this.noise = new Image()
        this.noise.src = "/images/sdk/sand/noise3.png"

    }
    load(){
        this.init();
        this.animate();
    }
    init(){
        this.drawingCanvas = makeCanvas("drawingCanvas", w, h)
        this.drawingContext = this.drawingCanvas.getContext('2d');

        this.drawingCanvas2 = makeCanvas("drawingCanvas2", w, h)
        this.drawingContext2 = this.drawingCanvas2.getContext('2d');

        this.drawingCanvas3 = makeCanvas("drawingCanvas3", w, h)
        this.drawingContext3 = this.drawingCanvas3.getContext('2d');

        this.outlineCanvas = makeCanvas("outline", w, h)
        this.outlineContext = this.outlineCanvas.getContext('2d')

        this.combinedCanvas = makeCanvas("combined", w, h)
        this.combinedContext = this.combinedCanvas.getContext('2d')

        this.dryCanvas = makeCanvas("dry", w, h)
        this.dryContext = this.dryCanvas.getContext('2d')

        this.wetCanvas = makeCanvas("wet", w, h)
        this.wetContext = this.wetCanvas.getContext('2d')

        this.noiseCanvas = makeCanvas("noise", w, h)
        this.noiseContext = this.noiseCanvas.getContext('2d')

        this.camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 )
        this.camera.position.z = 4.25;
        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer({alpha: true});
        this.renderer.setSize(w, h)
        this.container.appendChild(this.renderer.domElement);

        console.log(this.renderer.domElement)

        const MAX = 10000

        const getPos = ()=>{
            const x = rand(-width/2, width/2)
            const y = rand(-height/2, height/2)
            
            return {x, y, z:0}
        }

        const getPos2 = ()=>{
            let n = 0
            let p = getPos()
          
            return p
        }
        
        const initialPositions = []
        const velocities = []
        const accelerations = []
        const hues = []
        const scale = []
        this.geo = new THREE.BufferGeometry()
        for(let i = 0; i < MAX; i++) {

            const p = getPos2()

            const x = p.x
            const y = p.y
            const z = p.z

            initialPositions.push(x)
            initialPositions.push(y)
            initialPositions.push(z)
            velocities.push(0)
            velocities.push(0)
            velocities.push(0)
            accelerations.push(0)
            accelerations.push(0)
            accelerations.push(0)

            hues.push(1)
            
            scale.push(0)
           
        }
        this.b1 = new THREE.Float32BufferAttribute(initialPositions, 3)
        this.b2 = new THREE.Float32BufferAttribute(velocities, 3)
        this.b3 = new THREE.Float32BufferAttribute(accelerations, 3)
        this.b4 = new THREE.Float32BufferAttribute(hues, 1)
        this.b5 = new THREE.Float32BufferAttribute(scale, 1)

        this.geo.setAttribute('position', this.b1)
        this.geo.setAttribute('velocity', this.b2)
        this.geo.setAttribute('acceleration', this.b3)
        this.geo.setAttribute('hue', this.b4)
        this.geo.setAttribute('scale', this.b5)
        
        this.uniforms = {
            u_resolution: {
                type: "v2",
                value: new THREE.Vector2(w, h) 
            },
            u_texture:{
                type: "t",
                value: null
            }
        }

        const mat = new THREE.ShaderMaterial( {
            uniforms: this.uniforms,

            vertexShader: `
uniform float time;
attribute float scale;
attribute float hue;
varying float vHue;
void main() {

    vec2 uv = position.xy;
    vHue = hue;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = scale * 0.333;
}
`,

            fragmentShader: `
varying float vHue;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
void main() {
    vec2 _sample = gl_FragCoord.xy / u_resolution.xy;
    vec4 fragcolour = texture2D(u_texture, _sample);
    vec4 sand = vec4(70.0/255.0, 55.0/255.0, 41.0/255.0, 0.75);
    gl_FragColor = sand;
}
`,
            vertexColors: true
        });

        this.mesh = new THREE.Points(this.geo, mat)

        this.texture = new THREE.CanvasTexture(this.combinedCanvas)
        
        var material = new THREE.MeshPhongMaterial({
            map: this.texture
        })

        this.box = new THREE.Mesh(
            new THREE.PlaneGeometry(8.9, 3.9, 2, 2),
            material
        )
        
        var realLight = new THREE.PointLight(0xffffff, 0.9);
        realLight.position.set(0, 0, 10);
        
        this.scene.add(this.mesh)
        //this.scene.add(this.box)
        this.scene.add(realLight)
        this.scene.add(this.camera)
        
        this.addListeners()
    }
  
    drawLines(p: any){

        const dx = Math.abs(this.currentPos.x - p.x)
        const dy = Math.abs(this.currentPos.y - p.y)
        const speed = Math.sqrt(dx*dx + dy*dy)

        let scale = 1

        const maxSpeed = 3
        const minSpeed = 1

        const maxScale = 1.5
        const minScale = 0.5

        if(speed > maxSpeed){
            scale = minScale
        }
        else if(speed < minSpeed){
            scale = maxScale
        }
        else{
            scale = (speed - minSpeed) / (maxSpeed - minSpeed) // 0 to 1
            scale = scale * (minScale - maxScale) + maxScale
        }

        let numPoints = Math.max(Math.min(Math.ceil(speed/4), 20), 1) / scale;

        numPoints = Math.max(numPoints, 1)

        const drawingSize = 16
        const penSize = 10

        const drawAt = (p:{x:number, y:number})=>{
            let drawingW = drawingSize*scale
            this.drawingContext.drawImage(this.pen, 0, 0, penSize, penSize, p.x - drawingW/2, p.y - drawingW/2, drawingW, drawingW)
        }

        for(let i = 1; i <= numPoints; i++){
            const t = i/numPoints
            const x:any = this.currentPos.x + t*(p.x - this.currentPos.x)
            const y:any = this.currentPos.y + t*(p.y - this.currentPos.y)
            drawAt({x, y})
        
        }

        new Filter(this.drawingCanvas, this.drawingCanvas3).run()

        this.dryContext.drawImage(this.dry, 0, 0)
        
        this.noiseContext.drawImage(this.noise, 0, 0)
        this.noiseContext.globalCompositeOperation = "destination-in"
        this.noiseContext.drawImage(this.drawingCanvas3, 0, 0)
        this.noiseContext.globalCompositeOperation = "source-over"

        this.wetContext.drawImage(this.wet, 0, 0)
        this.wetContext.globalCompositeOperation = "destination-in"
        this.wetContext.drawImage(this.drawingCanvas, 0, 0)
        this.wetContext.globalCompositeOperation = "source-over"

        this.combinedContext.clearRect(0, 0, w, h)
        this.combinedContext.drawImage(this.dryCanvas, 0, 0)
        this.combinedContext.drawImage(this.noiseCanvas, 0, 0)
        this.combinedContext.drawImage(this.wetCanvas, 0, 0)
        
        this.texture.needsUpdate = true
    }

    addListeners(){
        
        document.addEventListener('pointermove', (e) => {
            e.preventDefault()
            if(this.down){
                const p = {
                    x:e.pageX,
                    y:e.pageY,
                }
                this.drawLines(p)
                this.currentPos = p
            }
        });
        document.addEventListener('pointerdown', (e) => {
            this.down = true
        });
        document.addEventListener('pointerup', () => {
            this.down = false
            this.currentPos = {
                x:Infinity,
                y:Infinity,
                t:0
            }
        });
    }
    applyWind(){
        const b = this.geo.getAttribute("position")
        const v = this.geo.getAttribute("velocity")
        const a = this.geo.getAttribute("acceleration")
        const hu = this.geo.getAttribute("hue")
        const s = this.geo.getAttribute("scale")
        var positions = b.array
        const delta = 0.01
        for(let i = 0; i < positions.length/3; i++){
            const x = b.getX(i)
            const y = b.getY(i)
            const pos =  {
                x: (x + width/2) / width,
                y: (y + height/2) / height
            } // 0 to 1
            pos.x *= w
            pos.y *= h
            pos.y = h - pos.y
            pos.x = Math.round(pos.x)
            pos.y = Math.round(pos.y)
            pos.x = Math.min(Math.max(0, pos.x), this.drawingCanvas.width)
            pos.y = Math.min(Math.max(0, pos.y), this.drawingCanvas.height)
            const vx = v.getX(i)
            const vy = v.getY(i)
            const ax = a.getX(i)
            const ay = a.getY(i)
            b.setXYZ( i, x + vx*delta, y + vy*delta, 0.1)
            const dx = pos.x - this.currentPos.x
            const dy = pos.y - this.currentPos.y
            const dist = Math.sqrt(dx*dx + dy*dy)
            const maxAccn = 80
            const fingerSize = 10
            if(dist < fingerSize){
                const accnNorm = {x: dx/dist, y: dy/dist}
                const requiredLength = (1 - dist/fingerSize) * maxAccn
                const finalAccn = {x: accnNorm.x * requiredLength, y:accnNorm.y*requiredLength}
                a.setXYZ(i, finalAccn.x, -finalAccn.y, 0)
                s.setX(i, rand(2, 7))
                hu.setX(i, 0.0)
            }
            else{
                a.setXYZ(i, 0, 0, 0)
            }
            const fallOff = 0.8
            v.setXYZ(i, (vx + ax*delta)*fallOff, (vy + ay * delta)*fallOff, 0)
        }
    }
    animate(){
        this.applyWind()
        this.uniforms.u_texture.value = this.texture
        this.renderer.render(this.scene, this.camera)

        this.geo.getAttribute("position").needsUpdate = true
        this.geo.getAttribute("hue").needsUpdate = true
        this.geo.getAttribute("scale").needsUpdate = true
        
        requestAnimationFrame(this.animate)
    }
}
















 */