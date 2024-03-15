import * as THREE from 'three';
import { vertexShader, fragmentShader } from "./shaders";
import {rand, guard} from "./utils"

export interface ISandPoints{
	onRender(delta: number):void
	destroy():void
}

const NUM_POINTS = 4000

// useful for debugging
const POINT_SIZE = 2

//just on top of the plane
const Z_POSITION = 0.15

const POINT_COLOR = {
	r: 166,
	g: 120,
	b: 96
}

export class SandPoints implements ISandPoints{

	private pointsGeometry: THREE.BufferGeometry | undefined
	private currentPos: THREE.Vector3 = new THREE.Vector3()
	private mouse: THREE.Vector2 = new THREE.Vector2()
	private brushActive:boolean = false
	private raycaster: THREE.Raycaster = new THREE.Raycaster()
	private pointsMesh: THREE.Points | undefined
	private planeMesh: THREE.Mesh | undefined

	constructor(private group: THREE.Group, private camera: THREE.PerspectiveCamera, private options:any){
		this.onPointerDown = this.onPointerDown.bind(this)
		this.onPointerUp = this.onPointerUp.bind(this)
		this.onPointerMove = this.onPointerMove.bind(this)
		this.makeObjects()
		//@ts-ignore - this comes from the bvh plugin
		this.raycaster.firstHitOnly = true
		window.addEventListener('pointerdown', this.onPointerDown)

	}
	public onRender(delta: number):void{
		this.moveParticlesWithMouse(delta)
	}
	private mouseEventToRendererCoord(e: PointerEvent){
		return {
			x: (e.clientX / window.innerWidth) * 2 - 1,
			y: -(e.clientY / window.innerHeight) * 2 + 1
		}
	}
	public destroy(){

	}
	private updateMousePos(p: {x: number, y:number}){
		this.mouse.set(p.x, p.y)
		this.raycaster.setFromCamera(this.mouse, this.camera!)
		const hit = this.raycaster.intersectObject(this.planeMesh!, true )[0]
		if(hit){
			this.currentPos = hit.point
		}
	}
	private onPointerDown(e: PointerEvent){
		const p = this.mouseEventToRendererCoord(e)
		this.updateMousePos(p)
		this.brushActive = true
		window.addEventListener('pointermove', this.onPointerMove)
		window.addEventListener('pointerup', this.onPointerUp)
	}
	
	private onPointerMove(e: PointerEvent){
		if(this.brushActive){
			const p = this.mouseEventToRendererCoord(e)
			this.updateMousePos(p)
		}
	}
	
	private onPointerUp(){
		this.brushActive = false
		window.removeEventListener('pointermove', this.onPointerMove)
		window.removeEventListener('pointerup', this.onPointerUp)
	}
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

			// slightly different color for each point
			const COLOR_VARTAION = 25
			const darkenAmount = rand(-COLOR_VARTAION, COLOR_VARTAION)
	
			hues.push(POINT_COLOR.r + darkenAmount)
			hues.push(POINT_COLOR.g + darkenAmount)
			hues.push(POINT_COLOR.b + darkenAmount)

			scale.push(POINT_SIZE)
		   
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

			const FINGER_SIZE_SQR = 0.2 * 0.2
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

