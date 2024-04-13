import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {acceleratedRaycast, computeBoundsTree, disposeBoundsTree} from 'three-mesh-bvh';
import {SandSculptTool} from "./SculptTool"
import { AccumFields, rand } from './utils';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
//@ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
//@ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const params = {
	size: 0.05,
	intensity: 250,
	maxSteps: 8
}

const SAND_COLOR = {
	r: 255,
	g: 255,
	b: 255
}

export interface ISandDrawer{
	onRender():void
	destroy():void
}

/**
 * Use the mouse to draw indentations in sand
 * https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/sculpt.js
 */
export class FoamDraw implements ISandDrawer{
	
	/**
	 * The mesh you will draw on
	 */
	private targetMesh: THREE.Mesh | undefined

	/**
	 * drawing on/off?
	 */
	private brushActive: boolean = false
	
	/**
	 * Current mouse pos
	 */
	private mouse: THREE.Vector2 = new THREE.Vector2()
	
	/**
	 * Last mouse pos
	 */
	private lastMouse: THREE.Vector2 = new THREE.Vector2()
	
	/**
	 * TODO - what is this?	
	 */
	private mouseState: boolean = false
	private lastMouseState: boolean = false
	private lastHitPosition: THREE.Vector3 = new THREE.Vector3()
	
	/**
	 * A tool to draw with
	 */
	private tool: SandSculptTool | undefined

	/**
	 * Find point of intersection
	 */
	private raycaster: THREE.Raycaster = new THREE.Raycaster()

	constructor(private group: THREE.Group, private camera: THREE.PerspectiveCamera, private options:any){
		this.onPointerDown = this.onPointerDown.bind(this)
		this.onPointerUp = this.onPointerUp.bind(this)
		this.onPointerMove = this.onPointerMove.bind(this)
		
		//@ts-ignore - this comes from the bvh plugin
		this.raycaster.firstHitOnly = true

		this.makeObjects()
		window.addEventListener('pointerdown', this.onPointerDown)
	}

	/**
	 * Returns -1 -> 1 in both directions
	 * @param e 
	 * @returns 
	 */
	private mouseEventToRendererCoord(e: PointerEvent){
		return {
			x: (e.clientX / window.innerWidth) * 2 - 1,
			y: -(e.clientY / window.innerHeight) * 2 + 1
		}
	}

	/**
	 * start drawing
	 * @param e 
	 */
	private onPointerDown(e: PointerEvent){
		const p = this.mouseEventToRendererCoord(e)
		this.mouse.set(p.x, p.y)
		//TODO - what does &3 do?
		console.log(e.buttons, e.buttons & 3)
		this.mouseState = Boolean(e.buttons & 3)
		this.brushActive = true
		window.addEventListener('pointermove', this.onPointerMove)
		window.addEventListener('pointerup', this.onPointerUp)
	}
	
	/**
	 * Update mouse pos
	 * @param e
	 */
	private onPointerMove(e: PointerEvent){
		if(this.brushActive){
			const p = this.mouseEventToRendererCoord(e)
			this.mouse.set(p.x, p.y)
		}
	}
	
	/**
	 * stop drawing
	 * @param e 
	 */
	private onPointerUp(e: PointerEvent){
		this.brushActive = false
		//TODO - what does &3 do?
		console.log(e.buttons, e.buttons & 3)
		this.mouseState = Boolean(e.buttons & 3)
		window.removeEventListener('pointermove', this.onPointerMove)
		window.removeEventListener('pointerup', this.onPointerUp)
	}

	/**
	 * make a plane buffer geom with 'SEGMENTS' segemnts
	 * increase this to make it more granular, but with worse performance
	 */
	private makeObjects(){
		const SEGMENTS = 256
		let geometry: THREE.BufferGeometry = new THREE.PlaneGeometry(this.options.size, this.options.size, SEGMENTS, SEGMENTS)
		geometry = mergeVertices(geometry);
		(geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
		(geometry.attributes.normal as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage)

		//@ts-ignore
		geometry.computeBoundsTree({
			setBoundingBox: false
		})

		// make it look like sand
		const map = new THREE.TextureLoader().load('./map.jpg')
		const bumpMap = new THREE.TextureLoader().load('./bump.png')
		let material = new THREE.MeshStandardMaterial({
			color:0xffffff
		})
		this.targetMesh = new THREE.Mesh(
			geometry,
			material,
		)
		// create a color attribute so we can make the sand lower down look dark (wet)
		const len = geometry.getAttribute('position').count
		const colors = []
		
		for(let i = 0; i < len; i++){
			colors.push(SAND_COLOR.r/255, SAND_COLOR.g/255, SAND_COLOR.b/255)
		}
		geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3))
		this.group!.add(this.targetMesh)

		// make a 'tool' which does the sculpting
		this.tool = new SandSculptTool(this.targetMesh!, params)
	}

	/**
	 * After drawing, correct the normals so light reflects properly and you get shadows inside ridges
	 * @param triangles 
	 * @param indices 
	 */
	private updateNormals(triangles: Set<number>, indices: Set<number>){
		const tempVec = new THREE.Vector3()
		const tempVec2 = new THREE.Vector3()
		const indexAttr = this.targetMesh!.geometry.index
		const posAttr = this.targetMesh!.geometry.attributes.position
		const normalAttr = this.targetMesh!.geometry.attributes.normal
		// accumulate the normals in place in the normal buffer
		const triangle = new THREE.Triangle()
		triangles.forEach(tri => {
			const tri3 = tri * 3
			const i0 = tri3 + 0
			const i1 = tri3 + 1
			const i2 = tri3 + 2
			const v0 = indexAttr!.getX(i0)
			const v1 = indexAttr!.getX(i1)
			const v2 = indexAttr!.getX(i2)
			triangle.a.fromBufferAttribute(posAttr, v0)
			triangle.b.fromBufferAttribute(posAttr, v1)
			triangle.c.fromBufferAttribute(posAttr, v2)
			triangle.getNormal(tempVec2)
			if (indices.has(v0)) {
				tempVec.fromBufferAttribute(normalAttr, v0)
				tempVec.add(tempVec2)
				normalAttr.setXYZ(v0, tempVec.x, tempVec.y, tempVec.z)
			}
			if (indices.has(v1)) {
				tempVec.fromBufferAttribute(normalAttr, v1)
				tempVec.add(tempVec2)
				normalAttr.setXYZ(v1, tempVec.x, tempVec.y, tempVec.z)
			}
			if (indices.has(v2)) {
				tempVec.fromBufferAttribute(normalAttr, v2)
				tempVec.add(tempVec2)
				normalAttr.setXYZ(v2, tempVec.x, tempVec.y, tempVec.z)
			}
		})

		// normalize the accumulated normals
		indices.forEach(index => {
			tempVec.fromBufferAttribute(normalAttr, index)
			tempVec.normalize()
			// add some noise to the normals, makes it look messy and sandy(?)
			const NOISE_AMOUNT = 0.2
			const noise = rand(-NOISE_AMOUNT/2, NOISE_AMOUNT/2)
			tempVec.addScalar(noise)
			normalAttr.setXYZ(index, tempVec.x, tempVec.y, tempVec.z)
		})
		normalAttr.needsUpdate = true

	}

	/**
	 * Called every frame
	 */
	public onRender(){
		if (!this.brushActive) {
			this.lastHitPosition.setScalar(Infinity)
		} 
		else {
			this.raycaster.setFromCamera(this.mouse, this.camera!)
			const hit = this.raycaster.intersectObject(this.targetMesh!, true)[ 0 ]
			// if we hit the target mesh
			if (hit) {
				// if the last cast pose was missed in the last frame then set it to
				// the current point so we don't streak across the surface
				if (this.lastHitPosition.x === Infinity) {
					this.lastHitPosition.copy(hit.point)
				}
				// If the mouse isn't pressed don't perform the stroke
				if (! (this.mouseState || this.lastMouseState)) {
					this.tool!.perform(hit.point, true)
					this.lastMouse.copy(this.mouse)
					this.lastHitPosition.copy(hit.point)
				}
				else {
					// compute the distance the mouse moved and that the cast point moved
					const mdx = (this.mouse.x - this.lastMouse.x) * window.innerWidth * window.devicePixelRatio
					const mdy = (this.mouse.y - this.lastMouse.y) * window.innerHeight * window.devicePixelRatio
					let mdist = Math.sqrt(mdx * mdx + mdy * mdy)
					let castDist = hit.point.distanceTo(this.lastHitPosition)
	
					const step = params.size * 0.15
					const percent = Math.max(step / castDist, 1 / params.maxSteps)
					const mstep = mdist * percent
					let stepCount = 0
	
					// perform multiple iterations toward the current mouse pose for a consistent stroke
					// TODO: recast here so he cursor is on the surface of the model which requires faster
					// refitting of the model
					const changedTriangles = new Set<number>()
					const changedIndices = new Set<number>()
					const traversedNodeIndices = new Set<number>()
					const sets: AccumFields = {
						accumulatedTriangles: changedTriangles,
						accumulatedIndices: changedIndices,
						accumulatedTraversedNodeIndices: traversedNodeIndices,
					}
					while (castDist > step && mdist > params.size * 200 / hit.distance) {
						this.lastMouse.lerp(this.mouse, percent)
						this.lastHitPosition.lerp(hit.point, percent)
						castDist -= step
						mdist -= mstep
						this.tool!.perform(this.lastHitPosition, false, sets)
						stepCount ++;
						if (stepCount > params.maxSteps) {
							break
						}
					}
					// refit the bounds and update the normals if we adjusted the mesh
					if (stepCount > 0) {
						// refit bounds and normal updates could happen after every stroke
						// so it's up to date for the next one because both of those are used when updating
						// the model but it's faster to do them here.
						this.updateNormals(changedTriangles, changedIndices)
						//@ts-ignore
						//this.targetMesh!.geometry.boundsTree.refit(traversedNodeIndices)
					} 
					else {
						this.tool!.perform(hit.point, true)
					}
				}
			} 
			else {
				// if we didn't hit
				this.lastMouse.copy(this.mouse)
				this.lastHitPosition.setScalar(Infinity)
			}
		}
		this.lastMouseState = this.mouseState
	}

	/**
	 * tidy up
	 */
	public destroy(){
		this.brushActive = false
		window.removeEventListener('pointermove', this.onPointerMove)
		window.removeEventListener('pointerup', this.onPointerUp)
		window.removeEventListener('pointerdown', this.onPointerDown)
		if (this.targetMesh) {
			this.targetMesh!.geometry.dispose()
			//@ts-ignore
			this.targetMesh!.material!.dispose()
			this.group!.remove(this.targetMesh)
		}
	}

}