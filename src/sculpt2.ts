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

	constructor(){
		this.render = this.render.bind(this)
		this.init()
		this.render()
	}

	private makeScene(){
		this.renderer = new THREE.WebGLRenderer()
		this.renderer.setSize( window.innerWidth, window.innerHeight )
		document.body.appendChild( this.renderer.domElement )
		this.scene = new THREE.Scene()
		
		const light = new THREE.DirectionalLight( 0xffffff, 0.85 )
		light.position.set( 1, 1, 1 )
		this.scene.add( light )
		this.scene.add( new THREE.AmbientLight( 0xffffff, 0.66 ) )

		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 )
		this.camera.position.set( 0, 0, 3 )
		this.camera.far = 100
		this.camera.updateProjectionMatrix()
	}

	private init(){
		this.makeScene()
		this.drawer = new SandDraw(this.scene!, this.camera!)
		this.points = new SandPoints(this.scene!, this.camera!)
	}
	
	private render(){
		this.drawer?.onRender()
		this.points?.onRender()
		this.renderer!.render( this.scene!, this.camera! )
		requestAnimationFrame(this.render)
	}

	public destroy(){
		if(this.drawer){
			this.drawer.destroy()
		}
		if(this.points){
			this.points.destroy()
		}
	}
}

new SandSculpt()
