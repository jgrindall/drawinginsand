import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
	acceleratedRaycast,
	computeBoundsTree,
	disposeBoundsTree
} from 'three-mesh-bvh';
import { vertexShader, fragmentShader } from "./shaders";
import {rand} from "./utils"
import {SandSculptTool} from "./SculptTool"

THREE.Mesh.prototype.raycast = acceleratedRaycast;
//@ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
//@ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

type A = any

const SAND_COLOR = {r: 255, g: 150, b: 120}

const params = {
	size: 0.05,
	intensity: 250,
	maxSteps: 8,
	flatShading: false,
	depth: 3
}

class SandSculpt{
	private scene: THREE.Scene | undefined
	private camera: THREE.PerspectiveCamera | undefined
	private renderer: THREE.Renderer | undefined
	private targetMesh: THREE.Mesh | undefined
	private brushActive: boolean = false
	private mouse: THREE.Vector2 = new THREE.Vector2()
	private lastMouse: THREE.Vector2 = new THREE.Vector2()
	private mouseState: boolean = false
	private lastMouseState: boolean = false
	private lastCastPose: THREE.Vector3 = new THREE.Vector3()
	private tool: SandSculptTool | undefined

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

		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
		this.camera.position.set( 0, 0, 3 );
		this.camera.far = 100;

		//@ts-ignore
		this.camera.updateProjectionMatrix();
	}

	private init(){
		this.makeScene()
		this.makeObjects()
		this.tool = new SandSculptTool(this.targetMesh!, params)
		this.addListeners()
	}

	private mouseEventToRendererCoord(e: PointerEvent){
		return {
			x: (e.clientX / window.innerWidth ) * 2 - 1,
			y: -( e.clientY / window.innerHeight ) * 2 + 1
		}
	}

	private addListeners(){
		window.addEventListener( 'pointermove', (e) => {
			const p = this.mouseEventToRendererCoord(e)
			this.mouse.set(p.x, p.y)
			this.brushActive = true
		})
		
		window.addEventListener( 'pointerdown', (e) => {
			const p = this.mouseEventToRendererCoord(e)
			this.mouse.set(p.x, p.y)
			this.mouseState = Boolean( e.buttons & 3 )
			this.brushActive = true
			const raycaster = new THREE.Raycaster()
			raycaster.setFromCamera(this.mouse, this.camera!)
			//@ts-ignore
			raycaster.firstHitOnly = true
		}, true )

		window.addEventListener( 'pointerup', (e) => {
			this.mouseState = Boolean( e.buttons & 3 );
		})
	}

	private render(){
		if (!this.brushActive ) {
			this.lastCastPose.setScalar( Infinity )
		} 
		else {
			const raycaster = new THREE.Raycaster()
			raycaster.setFromCamera(this.mouse, this.camera!)
			//@ts-ignore
			raycaster.firstHitOnly = true
			const hit = raycaster.intersectObject(this.targetMesh!, true )[ 0 ]
			// if we hit the target mesh
			if ( hit ) {
				// if the last cast pose was missed in the last frame then set it to
				// the current point so we don't streak across the surface
				if ( this.lastCastPose.x === Infinity ) {
					this.lastCastPose.copy( hit.point )
				}
				// If the mouse isn't pressed don't perform the stroke
				if ( ! ( this.mouseState || this.lastMouseState ) ) {
					this.performStroke( hit.point, true )
					this.lastMouse.copy( this.mouse )
					this.lastCastPose.copy( hit.point )
				}
				else {
					// compute the distance the mouse moved and that the cast point moved
					const mdx = ( this.mouse.x - this.lastMouse.x ) * window.innerWidth * window.devicePixelRatio
					const mdy = ( this.mouse.y - this.lastMouse.y ) * window.innerHeight * window.devicePixelRatio
					let mdist = Math.sqrt( mdx * mdx + mdy * mdy )
					let castDist = hit.point.distanceTo( this.lastCastPose )
	
					const step = params.size * 0.15
					const percent = Math.max( step / castDist, 1 / params.maxSteps )
					const mstep = mdist * percent
					let stepCount = 0
	
					// perform multiple iterations toward the current mouse pose for a consistent stroke
					// TODO: recast here so he cursor is on the surface of the model which requires faster
					// refitting of the model
					const changedTriangles = new Set<number>()
					const changedIndices = new Set<number>()
					const traversedNodeIndices = new Set()
					const sets = {
						accumulatedTriangles: changedTriangles,
						accumulatedIndices: changedIndices,
						accumulatedTraversedNodeIndices: traversedNodeIndices,
					}
					while ( castDist > step && mdist > params.size * 200 / hit.distance ) {
						this.lastMouse.lerp( this.mouse, percent )
						this.lastCastPose.lerp( hit.point, percent )
						castDist -= step
						mdist -= mstep
						this.performStroke( this.lastCastPose, false, sets )
						stepCount ++;
						if ( stepCount > params.maxSteps ) {
							break
						}
					}
	
					// refit the bounds and update the normals if we adjusted the mesh
					if ( stepCount > 0 ) {
						// refit bounds and normal updates could happen after every stroke
						// so it's up to date for the next one because both of those are used when updating
						// the model but it's faster to do them here.
						this.updateNormals( changedTriangles, changedIndices )
						//@ts-ignore
						this.targetMesh!.geometry.boundsTree.refit( traversedNodeIndices )
					} 
					else {
						this.performStroke( hit.point, true )
					}
				}
			} 
			else {
				// if we didn't hit
				this.lastMouse.copy(this.mouse )
				this.lastCastPose.setScalar( Infinity )
			}
		}
		this.lastMouseState = this.mouseState
		this.renderer!.render( this.scene!, this.camera! )
		requestAnimationFrame(this.render)
	}

	private performStroke(point: THREE.Vector3, brushOnly = false, accumulatedFields:A = {}){
		this.tool!.perform(point, brushOnly, accumulatedFields)
	}

	private updateNormals(triangles: Set<number>, indices: Set<number>){
		const tempVec = new THREE.Vector3()
		const tempVec2 = new THREE.Vector3()
		const indexAttr = this.targetMesh!.geometry.index
		const posAttr = this.targetMesh!.geometry.attributes.position
		const normalAttr = this.targetMesh!.geometry.attributes.normal
		// accumulate the normals in place in the normal buffer
		const triangle = new THREE.Triangle()
		triangles.forEach( tri => {
			const tri3 = tri * 3
			const i0 = tri3 + 0
			const i1 = tri3 + 1
			const i2 = tri3 + 2
			const v0 = indexAttr!.getX( i0 )
			const v1 = indexAttr!.getX( i1 )
			const v2 = indexAttr!.getX( i2 )
			triangle.a.fromBufferAttribute( posAttr, v0 )
			triangle.b.fromBufferAttribute( posAttr, v1 )
			triangle.c.fromBufferAttribute( posAttr, v2 )
			triangle.getNormal( tempVec2 )
			if ( indices.has( v0 ) ) {
				tempVec.fromBufferAttribute( normalAttr, v0 )
				tempVec.add( tempVec2 )
				normalAttr.setXYZ( v0, tempVec.x, tempVec.y, tempVec.z )
			}
			if ( indices.has( v1 ) ) {
				tempVec.fromBufferAttribute( normalAttr, v1 )
				tempVec.add( tempVec2 )
				normalAttr.setXYZ( v1, tempVec.x, tempVec.y, tempVec.z )
			}
			if ( indices.has( v2 ) ) {
				tempVec.fromBufferAttribute( normalAttr, v2 )
				tempVec.add( tempVec2 )
				normalAttr.setXYZ( v2, tempVec.x, tempVec.y, tempVec.z )
			}
		})

		// normalize the accumulated normals
		indices.forEach( index => {
			tempVec.fromBufferAttribute( normalAttr, index )
			tempVec.normalize()
			const noiseAmount = 0.1
			const noise = Math.random() * noiseAmount - (noiseAmount/2)
			tempVec.addScalar( noise )
			normalAttr.setXYZ( index, tempVec.x, tempVec.y, tempVec.z )
		})
		normalAttr.needsUpdate = true

	}

	private makeObjects(){
		this.addPlane()
		this.addPoints()
	}

	addPlane(){
		let geometry: THREE.BufferGeometry = new THREE.PlaneGeometry( 3, 3, 256, 256 )
		geometry = mergeVertices( geometry );
		(geometry.attributes.position as THREE.BufferAttribute).setUsage( THREE.DynamicDrawUsage );
		(geometry.attributes.normal as THREE.BufferAttribute).setUsage( THREE.DynamicDrawUsage );
		//@ts-ignore
		geometry.computeBoundsTree({
			setBoundingBox: false
		})
		let material = new THREE.MeshStandardMaterial( {
			map: new THREE.TextureLoader().load('./map.jpg'),
			bumpMap: new THREE.TextureLoader().load('./bump2.png'),
			displacementMap: new THREE.TextureLoader().load('./map.jpg'),
			
			displacementScale: 0.05,
			bumpScale:3,
			vertexColors: true,
			roughness: 50
		})
		this.targetMesh = new THREE.Mesh(
			geometry,
			material,
		)
		// create a color attribute
		const len = geometry.getAttribute('position').count
		const colors = []
		
		for(let i = 0; i < len; i++){
			colors.push(SAND_COLOR.r/255, SAND_COLOR.g/255, SAND_COLOR.b/255)
		}
		geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
		this.targetMesh.rotateX(-0.25)
		this.scene!.add(this.targetMesh)
	}

	addPoints(){

	}

	public destroy(){
		if (this.targetMesh ) {
			this.targetMesh!.geometry.dispose()
			//@ts-ignore
			this.targetMesh!.material.dispose()
			this.scene!.remove( this.targetMesh )
		}
		//more TODO
	}
}


function addPoints(){
	const MAX = 500

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
	const pointsGeometry = new THREE.BufferGeometry()
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

	const b1 = new THREE.Float32BufferAttribute(initialPositions, 3)
	const b2 = new THREE.Float32BufferAttribute(velocities, 3)
	const b3 = new THREE.Float32BufferAttribute(accelerations, 3)
	const b4 = new THREE.Float32BufferAttribute(hues, 1)
	const b5 = new THREE.Float32BufferAttribute(scale, 1)

	pointsGeometry.setAttribute('position', b1)
	pointsGeometry.setAttribute('velocity', b2)
	pointsGeometry.setAttribute('acceleration', b3)
	pointsGeometry.setAttribute('hue', b4)
	pointsGeometry.setAttribute('scale', b5)
	
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
	const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial)
	//scene.add(pointsMesh)

	
}

alert(1)
new SandSculpt()
