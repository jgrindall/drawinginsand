import * as THREE from 'three';
import {acceleratedRaycast, computeBoundsTree, disposeBoundsTree} from 'three-mesh-bvh';
import { SandDraw, ISandDrawer } from './SandDraw';
import { SandPoints, ISandPoints } from './SandPoints';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
//@ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
//@ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

class SandSculpt{
	private scene: THREE.Scene | undefined
	private camera: THREE.PerspectiveCamera | undefined
	private renderer: THREE.Renderer | undefined
	private drawer: ISandDrawer | undefined
	private points: ISandPoints | undefined
	private group: THREE.Group | undefined
	private time:number = 0
	private enabled: boolean = true

	constructor(){
		this.render = this.render.bind(this)
		this.init()
		this.render(0)
	}

	/**
	 * Create the scene, add light and camera
	 */
	private makeScene(){
		this.renderer = new THREE.WebGLRenderer()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		document.body.appendChild(this.renderer.domElement)
		this.scene = new THREE.Scene()
		
		const light = new THREE.DirectionalLight(0xffffff, 0.9)
		light.position.set(1, 1, 1)
		this.scene.add(light)
		this.scene.add(new THREE.AmbientLight(0xffffff, 0.75))

		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50)
		this.camera.position.set(0, 0, 4)
		this.camera.far = 100
		this.camera.updateProjectionMatrix()

		this.group = new THREE.Group()
		this.scene.add(this.group)
	}

	/**
	 * add drawing and particles
	 */
	private init(){
		this.makeScene()
		this.drawer = new SandDraw(this.group!, this.camera!, {size: 5})
		this.points = new SandPoints(this.group!, this.camera!, {size: 5})
		this.group!.rotateX(-0.25)
	}
	
	private render(time: number){
		const delta = time- this.time
		this.time = time
		this.drawer?.onRender()
		this.points?.onRender(delta)
		this.renderer!.render(this.scene!, this.camera!)
		if(this.enabled){
			requestAnimationFrame(this.render)
		}
	}

	public destroy(){
		this.enabled = false
		if(this.drawer){
			this.drawer.destroy()
			this.drawer = undefined
		}
		if(this.points){
			this.points.destroy()
			this.points = undefined
		}
	}
}

new SandSculpt()
