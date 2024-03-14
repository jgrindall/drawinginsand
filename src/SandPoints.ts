import * as THREE from 'three';
import { vertexShader, fragmentShader } from "./shaders";
import {rand} from "./utils"

export interface ISandPoints{
	onRender():void
	destroy():void
}

const MAX = 32

export class SandPoints implements ISandPoints{
	private pointsGeometry: THREE.BufferGeometry | undefined
	
	private currentPos: any

	constructor(private scene: THREE.Scene, private camera: THREE.PerspectiveCamera){
		this.makeObjects()
		this.addListeners()
	}
	public onRender(){
		this.applyWind()
		this.pointsGeometry!.getAttribute("position").needsUpdate = true
        this.pointsGeometry!.getAttribute("hue").needsUpdate = true
        this.pointsGeometry!.getAttribute("scale").needsUpdate = true
	}
	public destroy(){

	}
	private addListeners(){

	}
	private makeObjects(){

		const SIZE = 2
		
		const getPos = ()=>{
			const x = rand(-SIZE/2, SIZE/2)
			const y = rand(-SIZE/2, SIZE/2)
			const z = rand(-SIZE/2, SIZE/2)
			
			return {x, y, z: 0}
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
	
		const b1 = new THREE.Float32BufferAttribute(initialPositions, 3)
		const b2 = new THREE.Float32BufferAttribute(velocities, 3)
		const b3 = new THREE.Float32BufferAttribute(accelerations, 3)
		const b4 = new THREE.Float32BufferAttribute(hues, 1)
		const b5 = new THREE.Float32BufferAttribute(scale, 1)
	
		this.pointsGeometry.setAttribute('position', b1)
		this.pointsGeometry.setAttribute('velocity', b2)
		this.pointsGeometry.setAttribute('acceleration', b3)
		this.pointsGeometry.setAttribute('hue', b4)
		this.pointsGeometry.setAttribute('scale', b5)
		
		const uniforms = {
			u_resolution: {
				type: "v2",
				value: new THREE.Vector2(300, 300) 
			},
			u_texture:{
				type: "t",
				value: null
			}
		}
		const pointsMaterial = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader,
			fragmentShader,
			vertexColors: true
		})
		const pointsMesh = new THREE.Points(this.pointsGeometry, pointsMaterial)
		this.scene!.add(pointsMesh)
	}

	private applyWind(){
		return
		const width = 256
		const height = 256
		const b = this.pointsGeometry!.getAttribute("position")
        const v = this.pointsGeometry!.getAttribute("velocity")
        const a = this.pointsGeometry!.getAttribute("acceleration")
        const hu = this.pointsGeometry!.getAttribute("hue")
        const s = this.pointsGeometry!.getAttribute("scale")
        var positions = b.array
        const delta = 0.01
        for(let i = 0; i < positions.length/3; i++){
            const x = b.getX(i)
            const y = b.getY(i)
            const pos =  {
                x: (x + width/2) / width,
                y: (y + height/2) / height
            } // 0 to 1
            pos.x *= width
            pos.y *= height
            pos.y = height - pos.y
            pos.x = Math.round(pos.x)
            pos.y = Math.round(pos.y)
            pos.x = Math.min(Math.max(0, pos.x), width)
            pos.y = Math.min(Math.max(0, pos.y), height)
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
}
