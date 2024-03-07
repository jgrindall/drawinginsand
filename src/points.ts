//@ts-ignore
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
            /**
            while (n < 5 && Math.abs(p.x - p.y) > 0.1){
                p = getPos()
                n++
            }
            **/
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















