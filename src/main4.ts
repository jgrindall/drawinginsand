

import {Texture, Vector2, WebGLRenderTarget, PerspectiveCamera, WebGLRenderer, Scene,
    ShaderMaterial, Mesh, FloatType, LinearFilter, RGBAFormat} from "three"

import vertexShader from "./vShader"
import fragmentShader from "./fShader"

const SIZE = 512;

class Sand{

    private environmentTexture: Texture | undefined
    private channel1Texture: Texture | undefined
    private channel2Texture: Texture | undefined
    private poolTexture:Texture | undefined
    
    // two render textures
    private renderTexture1: WebGLRenderTarget | undefined
    private renderTexture2: WebGLRenderTarget | undefined
    private camera: PerspectiveCamera | undefined
    private scene: Scene | undefined
    private container: HTMLElement | undefined
    private renderer: WebGLRenderer | undefined
    private _canvas: HTMLCanvasElement | undefined
    private material:ShaderMaterial | undefined

    private uniforms: any | undefined

    // 0,0 means top left corner. 1,1 means bottom right corner, used to make splashes
    private mousePos = {
        x: 0,
        y: 0
    }

    constructor(container: HTMLElement){
        this.container = container
        this._canvas = document.createElement("canvas")
        this.container.appendChild(this._canvas)
        this._canvas.width = SIZE
        this._canvas.height = SIZE
        this.loadTextures().then(()=>{
            this.makeRenderTargets()
            this.init()
        })
    }
    makeRenderTargets(){
        this.renderTexture1 = new WebGLRenderTarget(SIZE, SIZE, {
            type: FloatType,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat
        })
        this.renderTexture2 = new WebGLRenderTarget(SIZE, SIZE, {
            type: FloatType,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat
        })
    }
    async loadTextures(){
        return null
    }
    init(){
        this.camera = new PerspectiveCamera()
        this.camera.position.z = 1
        this.scene = new Scene()
        
        this.uniforms = {
            u_time: {
                type: "f", 
                value: 1.0
            },
            u_resolution: {
                type: "v2",
                value: new Vector2(SIZE, SIZE)
            },
            u_buffer: {
                type: "t",
                value: this.renderTexture1!.texture
            },
            u_renderpass: {
                type: 'b',
                value: false
            }
        };
    
        this.material = new ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader,
            fragmentShader,
            transparent: true
        });
        
        const mesh = new Mesh(geometry!, this.material);
        this.scene.add(mesh);
        
        // two renderers with swapping between buffers

        this.renderer = new WebGLRenderer({
            alpha: true,
            canvas: this._canvas
        })

        this.realScene = new Scene()

        const bumpScale = 3.5
        const specular = 3.5
        
        this.renderer.setSize(this.width!, this.height!)
        this.makeRenderTargets()
        this.addListeners()
        this.animate(0)
    }
    getElement():HTMLElement{
        return this._canvas
    }
    setMousePos(e: any){
        const rect = this.parent.getBoundingClientRect()
        const w = rect.width
        const h = rect.height
        const x = (e.pageX - rect.left)/w
        const y = (e.pageY - rect.top)/h
        const xGuard = Math.max(Math.min(x, 1), 0)
        const yGuard = Math.max(Math.min(y, 1), 0)
        this.mousePos.x = xGuard - 0.5
        this.mousePos.y = -(yGuard - 0.5)
    }
    onPointerMove(e: PointerEvent){
        e.preventDefault()
        this.setMousePos(e)
    }
    onPointerDown(e:PointerEvent){
        e.preventDefault()
        //this.setMousePos(e)
        this.downTime = Date.now();
        this.uniforms.u_mouse.value.z = 1;
        document.addEventListener('pointermove', this.onPointerMove)
        document.addEventListener('pointerup', this.onPointerUp)
    }
    onPointerUp(e:PointerEvent){
        e.preventDefault()
        this.uniforms.u_mouse.value.z = 0;
        document.removeEventListener('pointermove', this.onPointerMove)
        document.removeEventListener('pointerup', this.onPointerUp)
    }
    addListeners(){
        this.container!.addEventListener('pointerdown', this.onPointerDown)
    }
    removeListeners(){
        this.container!.removeEventListener('pointerdown', this.onPointerDown)
        document.removeEventListener('pointermove', this.onPointerMove)
        document.removeEventListener('pointerup', this.onPointerUp)
    }
    animate(delta: number){
        const downTimeDuration = Date.now() - this.downTime!
        if(downTimeDuration > 5000){
            // you can only move for 5 secs
            //this.uniforms.u_mouse.value.z = 0;
        }
        this.uniforms.u_frame.value = this.uniforms.u_frame.value + 1
        this.uniforms.u_mouse.value.x += (this.mousePos.x - this.uniforms.u_mouse.value.x) * this.divisor!
        this.uniforms.u_mouse.value.y += (this.mousePos.y - this.uniforms.u_mouse.value.y) * this.divisor!
        this.uniforms.u_time.value = delta * 0.0005
        this.renderer!.render(this.scene!, this.camera!)
        this.renderTexture()
        this.animationFrame = requestAnimationFrame(this.animate)
    }
    swap(){
        let t = this.renderTexture1
        this.renderTexture1 = this.renderTexture2
        this.renderTexture2 = t
    }
    renderTexture(){
        this.uniforms.u_buffer.value = this.renderTexture2!.texture
        this.uniforms.u_renderpass.value = true
        this.renderer!.setRenderTarget(this.renderTexture1!)
        this.renderer!.render(this.scene!, this.camera!)
        this.renderer!.setRenderTarget(null)
        this.swap()
        this.uniforms.u_buffer.value = this.renderTexture1!.texture
        this.uniforms.u_renderpass.value = false
        this.renderer!.render(this.scene!, this.camera!)
    }
    async updateTexture(){

        const image = new Image()
        image.onload = ()=>{
            const ctx = this.poolCanvas!.getContext('2d');
            ctx.drawImage(image, 200, 200, 140, 140);
            this.poolTexture!.needsUpdate = true
            this.material!.needsUpdate = true
        }

        image.src = "/images/sdk/builderstray/dino/stego_lower.png"
        

    }
   
}

new Sand()