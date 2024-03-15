import * as THREE from 'three';
import { vertexShader, fragmentShader } from "./shaders";
import {rand, guard, getWeightedColor} from "./utils"

export interface ISandPoints{
	onRender(delta: number):void
	destroy():void
}

const NUM_POINTS = 20000

// useful for debugging
const MIN_POINT_SIZE = 1
const MAX_POINT_SIZE = 2

//just on top of the plane
const Z_POSITION = 0.05

const POINT_COLOR = {
	r: 176,
	g: 130,
	b: 112
}

export class SandPoints implements ISandPoints{

	/**
	 * The points themselves (particles of sand)
	 */
	private pointsGeometry: THREE.BufferGeometry | undefined
	private pointsMesh: THREE.Points | undefined
	
	/**
	 * an invisible plane, purely to cast the mouse position on
	 */
	private planeMesh: THREE.Mesh | undefined
	
	/**
	 * mouse position from -options.width to options.width
	 */
	private currentPos: THREE.Vector3 = new THREE.Vector3()
	
	/**
	 * drawing or not?
	 */
	private brushActive:boolean = false

	/**
	 * For finding where they clicked on the mesh
	 */
	private raycaster: THREE.Raycaster = new THREE.Raycaster()

	/**
	 * For colors of particles
	 */
	private mapCanvas: HTMLCanvasElement | undefined
	private pointsImageData: Uint8ClampedArray | undefined
	
	constructor(private group: THREE.Group, private camera: THREE.PerspectiveCamera, private options:any){
		this.onPointerDown = this.onPointerDown.bind(this)
		this.onPointerUp = this.onPointerUp.bind(this)
		this.onPointerMove = this.onPointerMove.bind(this)
		window.addEventListener('pointerdown', this.onPointerDown)

		new THREE.TextureLoader().load('./points.png', (texture: any)=>{
			this.mapCanvas = document.createElement( 'canvas' )
			this.mapCanvas.width = texture.image.width
			this.mapCanvas.height = texture.image.height
			const context = this.mapCanvas.getContext( '2d' )
			context!.drawImage( texture.image, 0, 0)
			this.pointsImageData = context!.getImageData(0, 0, this.mapCanvas.width, this.mapCanvas.height).data
			this.makeObjects()
			//@ts-ignore - this comes from the bvh plugin
			this.raycaster.firstHitOnly = true

		})

	}
	/**
	 * Called every frame
	 * @param delta - time since last render (ms), used for making things run at the right speed
	 */
	public onRender(delta: number):void{
		if(this.pointsGeometry){
			this.moveParticlesWithMouse(delta)
		}
	}
	
	/**
	 * Get the coordinates (-1 -> 1 in both directions)
	 * @param e 
	 * @returns 
	 */
	private mouseEventToRendererCoord(e: PointerEvent){
		return {
			x: (e.clientX / window.innerWidth) * 2 - 1,
			y: -(e.clientY / window.innerHeight) * 2 + 1
		}
	}

	public destroy(){
		this.brushActive = false
		window.removeEventListener('pointermove', this.onPointerMove)
		window.removeEventListener('pointerup', this.onPointerUp)
		window.removeEventListener('pointerdown', this.onPointerDown)
		this.pointsMesh!.geometry.dispose()
		this.planeMesh!.geometry.dispose()
		
		//@ts-ignore
		this.pointsMesh!.material!.dispose()
		
		//@ts-ignore
		this.planeMesh!.material!.dispose()

		this.group.remove(this.pointsMesh!)
		this.group.remove(this.planeMesh!)
	}
	
	/**
	 * raycast to find the mouse position in the world
	 * if you hit, save the point
	 * @param p - the mouse position
	 */
	private updateMousePos(p: {x: number, y:number}){
		this.raycaster.setFromCamera(new THREE.Vector2(p.x, p.y), this.camera!)
		const hit = this.raycaster.intersectObject(this.planeMesh!, true )[0]
		if(hit){
			this.currentPos = hit.point
		}
	}

	/**
	 * brush active becomes true, and we start listening for pointer events
	 * @param e 
	 */
	private onPointerDown(e: PointerEvent){
		const p = this.mouseEventToRendererCoord(e)
		this.updateMousePos(p)
		this.brushActive = true
		window.addEventListener('pointermove', this.onPointerMove)
		window.addEventListener('pointerup', this.onPointerUp)
	}
	
	/**
	 * update the position
	 * @param e
	 */
	private onPointerMove(e: PointerEvent){
		if(this.brushActive){
			const p = this.mouseEventToRendererCoord(e)
			this.updateMousePos(p)
		}
	}
	/**
	 * brush is no longer active
	 */
	private onPointerUp(){
		this.brushActive = false
		window.removeEventListener('pointermove', this.onPointerMove)
		window.removeEventListener('pointerup', this.onPointerUp)
	}

	/**
	 * Look up the color of the sand, make the particles match
	 * @param x 
	 * @param y 
	 * @returns 
	 */
	private getHueFor(x:number, y:number):{r:number, g:number, b:number}{
		const w = this.mapCanvas!.width
		const h = this.mapCanvas!.height
		let x2 = (x + this.options.size/2) * w/this.options.size
		let y2 = (this.options.size/2 - y) * h/this.options.size
		x2 = Math.floor(x2)
		y2 = Math.floor(y2)
		const index = (y2 * this.mapCanvas!.width + x2) * 4
		const pixelClr = {
			r: this.pointsImageData![index + 0],
			g: this.pointsImageData![index + 1],
			b: this.pointsImageData![index + 2],
		}
		return getWeightedColor(POINT_COLOR, pixelClr, 0.5)
	}


	/**
	 * Make the points (particles) and the plane
	 * Make all the attributes for the points like velocity, acceleration etc
	 * We will use these to move them
	 */
	private makeObjects(){		
		let geometry: THREE.BufferGeometry = new THREE.PlaneGeometry(this.options.size, this.options.size, 1, 1)
		let material = new THREE.MeshPhongMaterial({
			color:"pinK",
			opacity: 0.1,
			transparent: true
		})
		this.planeMesh = new THREE.Mesh(
			geometry,
			material,
		)
		this.planeMesh.position.z = 0
		this.planeMesh.visible = false
		this.group!.add(this.planeMesh)

		const getRandomPositions = ()=>{
			const x = rand(-this.options.size/2, this.options.size/2)
			const y = rand(-this.options.size/2, this.options.size/2)
			return {
				x,
				y,
				z: Z_POSITION
			}
		}

		const getRandomSize = ()=>{
			return rand(MIN_POINT_SIZE, MAX_POINT_SIZE)
		}
		
		const initialPositions:number[] = []
		const velocities:number[] = []
		const accelerations:number[] = []
		const hues:number[] = []
		const scale:number[] = []

		for(let i = 0; i < NUM_POINTS; i++) {
			const p = getRandomPositions()
			initialPositions.push(p.x)
			initialPositions.push(p.y)
			initialPositions.push(p.z)

			velocities.push(0)
			velocities.push(0)
			velocities.push(0)
			
			accelerations.push(0)
			accelerations.push(0)
			accelerations.push(0)

			const hue = this.getHueFor(p.x, p.y)
			hues.push(hue.r)
			hues.push(hue.g)
			hues.push(hue.b)

			scale.push(getRandomSize())
		   
		}
	
		const posAttr = new THREE.Float32BufferAttribute(initialPositions, 3)  //vec3
		const velAttr = new THREE.Float32BufferAttribute(velocities, 3)  //vec3
		const accelAttr = new THREE.Float32BufferAttribute(accelerations, 3)  //vec3
		const hueAttr = new THREE.Float32BufferAttribute(hues, 3) //vec3
		const scaleAttr = new THREE.Float32BufferAttribute(scale, 1) // float

		this.pointsGeometry = new THREE.BufferGeometry()
	
		this.pointsGeometry.setAttribute('position', posAttr)
		this.pointsGeometry.setAttribute('velocity', velAttr)
		this.pointsGeometry.setAttribute('acceleration', accelAttr)
		this.pointsGeometry.setAttribute('hue', hueAttr)
		this.pointsGeometry.setAttribute('scale', scaleAttr)

		const pointsMaterial = new THREE.ShaderMaterial( {
			uniforms: {},
			vertexShader,
			fragmentShader,
			vertexColors: true
		})
		this.pointsMesh = new THREE.Points(this.pointsGeometry, pointsMaterial)
		this.group!.add(this.pointsMesh)
	}

	/**
	 * Move particles near the mouse away, as if you pushed them
	 * @param delta - time step
	 */
	private moveParticlesWithMouse(delta: number){
		const posAttr = this.pointsGeometry!.getAttribute("position")
        const velAttr = this.pointsGeometry!.getAttribute("velocity")
        const accelAttr = this.pointsGeometry!.getAttribute("acceleration")
        const positions = posAttr.array
		
        for(let i = 0; i < positions.length/3; i++){

			// current position
            const x = posAttr.getX(i)
            const y = posAttr.getY(i)

			// current velocity
			const velX = velAttr.getX(i)
            const velY = velAttr.getY(i)
            
			// current acceleration
			const accelX = accelAttr.getX(i)
            const accelY = accelAttr.getY(i)

			// distance from the touch
			const dx = x - this.currentPos.x
            const dy = -(y - this.currentPos.y)

			const distFromMouseSqr = dx*dx + dy*dy

			const FINGER_SIZE = 0.1
			const FINGER_SIZE_SQR = FINGER_SIZE * FINGER_SIZE
			const FORCE = 25

			/**
			 * update the acceleration of any particles near the mouse - they get pushed away
			 * new acceleration default to 0
			 */
			
			let newAcceleration = {
				x:0,
				y:0
			}

			if(distFromMouseSqr < FINGER_SIZE_SQR){
				// normalize the acceleration
                const accnNorm = {
					x: dx/distFromMouseSqr,
					y: dy/distFromMouseSqr
				}
				// the closer the particle is to the mouse, the stronger the force
                const requiredLength = (1 - distFromMouseSqr/FINGER_SIZE_SQR) * FORCE
				newAcceleration.x = accnNorm.x * requiredLength
				newAcceleration.y = accnNorm.y * requiredLength
            }
			
			// simple Euler step size
			const stepSize = delta/2000

			// next, update the velocity (using the acceleration) and the position
			const newVelocity = {
				x: velX + accelX*stepSize,
				y: velY + accelY*stepSize
			}

			const newPosition = {
				x: guard(x + velX*stepSize, -this.options.size/2, this.options.size/2),
				y: guard(y + velY*stepSize, -this.options.size/2, this.options.size/2)
			} 

			accelAttr.setXYZ(i, newAcceleration.x, -newAcceleration.y, 0)

			// dampen it so they stop
			const FRICTION = 0.85
			velAttr.setXYZ(i, newVelocity.x*FRICTION, newVelocity.y*FRICTION, 0)
			
			posAttr.setXYZ(i, newPosition.x, newPosition.y, Z_POSITION)
        }

		this.pointsGeometry!.getAttribute("position").needsUpdate = true

	}
}

