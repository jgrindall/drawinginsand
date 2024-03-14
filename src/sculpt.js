import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
	acceleratedRaycast,
	computeBoundsTree,
	disposeBoundsTree,
	CONTAINED,
	INTERSECTED,
	NOT_INTERSECTED
} from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

let scene, camera, renderer
let targetMesh
let brushActive = false
let mouse = new THREE.Vector2()
let lastMouse = new THREE.Vector2()
let mouseState = false
let lastMouseState = false
let lastCastPose = new THREE.Vector3()
let texture

const params = {
	size: 0.075,
	intensity: 500,
	maxSteps: 8,
	flatShading: false,
	depth: 3
}
init()
render()

function destroy(){
	// dispose of the mesh if it exists
	if ( targetMesh ) {
		targetMesh.geometry.dispose();
		targetMesh.material.dispose();
		scene.remove( targetMesh );
	}

}

// reset the sculpt mesh
function reset() {
	destroy()
	let geometry = new THREE.PlaneGeometry( 3, 3, 256, 256 )
	geometry = BufferGeometryUtils.mergeVertices( geometry )
	geometry.attributes.position.setUsage( THREE.DynamicDrawUsage )
	geometry.attributes.normal.setUsage( THREE.DynamicDrawUsage )
	geometry.computeBoundsTree({
		setBoundingBox: false
	})

	let material = new THREE.MeshStandardMaterial( {
		map: new THREE.TextureLoader().load('./map.jpg'),
		displacementMap: new THREE.TextureLoader().load('./map.jpg'),
		displacementScale: 0.05,
		normalMap: new THREE.TextureLoader().load('./norm.png'),
		normalScale: new THREE.Vector2( 0.25, 0.25 )
	})

	targetMesh = new THREE.Mesh(
		geometry,
		material,
	)
	targetMesh.rotateX(-0.25)
	scene.add( targetMesh )
}

function init() {
	renderer = new THREE.WebGLRenderer()
	renderer.setSize( window.innerWidth, window.innerHeight )
	document.body.appendChild( renderer.domElement )
	scene = new THREE.Scene()
	
	const light = new THREE.DirectionalLight( 0xffffff, 0.85 )
	light.position.set( 1, 1, 1 )
	scene.add( light )
	scene.add( new THREE.AmbientLight( 0xffffff, 0.66 ) )

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 50 );
	camera.position.set( 0, 0, 3 );
	camera.far = 100;
	camera.updateProjectionMatrix();
	reset()
	window.addEventListener( 'pointermove', function ( e ) {
		mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1
		mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1
		brushActive = true
	})
	window.addEventListener( 'pointerdown', e => {
		mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1
		mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1
		mouseState = Boolean( e.buttons & 3 )
		brushActive = true
		const raycaster = new THREE.Raycaster()
		raycaster.setFromCamera( mouse, camera )
		raycaster.firstHitOnly = true
	}, true )
	window.addEventListener( 'pointerup', e => {
		mouseState = Boolean( e.buttons & 3 );
	})
}

// Run the perform the brush movement
function performStroke( point, brushOnly = false, accumulatedFields = {} ) {
	const {
		accumulatedTriangles = new Set(),
		accumulatedIndices = new Set(),
		accumulatedTraversedNodeIndices = new Set(),
	} = accumulatedFields;

	const inverseMatrix = new THREE.Matrix4();
	inverseMatrix.copy( targetMesh.matrixWorld ).invert();

	const sphere = new THREE.Sphere();
	sphere.center.copy( point ).applyMatrix4( inverseMatrix );
	sphere.radius = params.size;

	// Collect the intersected vertices
	const indices = new Set();
	const tempVec = new THREE.Vector3();
	const normal = new THREE.Vector3();
	const indexAttr = targetMesh.geometry.index;
	const posAttr = targetMesh.geometry.attributes.position;
	const normalAttr = targetMesh.geometry.attributes.normal;
	const triangles = new Set();
	const bvh = targetMesh.geometry.boundsTree;
	bvh.shapecast( {
		intersectsBounds: ( box, isLeaf, score, depth, nodeIndex ) => {
			accumulatedTraversedNodeIndices.add( nodeIndex );
			const intersects = sphere.intersectsBox( box );
			const { min, max } = box;
			if ( intersects ) {
				for ( let x = 0; x <= 1; x ++ ) {
					for ( let y = 0; y <= 1; y ++ ) {
						for ( let z = 0; z <= 1; z ++ ) {
							tempVec.set(
								x === 0 ? min.x : max.x,
								y === 0 ? min.y : max.y,
								z === 0 ? min.z : max.z
							);
							if ( ! sphere.containsPoint( tempVec ) ) {
								return INTERSECTED
							}
						}
					}
				}
				return CONTAINED
			}
			return intersects ? INTERSECTED : NOT_INTERSECTED
		},
		intersectsTriangle: ( tri, index, contained ) => {
			const triIndex = index
			triangles.add( triIndex )
			accumulatedTriangles.add( triIndex )
			const i3 = 3 * index
			const a = i3 + 0
			const b = i3 + 1
			const c = i3 + 2
			const va = indexAttr.getX( a )
			const vb = indexAttr.getX( b )
			const vc = indexAttr.getX( c )
			if ( contained ) {
				indices.add( va )
				indices.add( vb )
				indices.add( vc )
				accumulatedIndices.add( va )
				accumulatedIndices.add( vb )
				accumulatedIndices.add( vc )
			}
			else {
				if ( sphere.containsPoint( tri.a ) ) {
					indices.add( va )
					accumulatedIndices.add( va )
				}
				if ( sphere.containsPoint( tri.b ) ) {
					indices.add( vb )
					accumulatedIndices.add( vb )
				}
				if ( sphere.containsPoint( tri.c ) ) {
					indices.add( vc )
					accumulatedIndices.add( vc )
				}
			}
			return false;
		}
	})

	// Compute the average normal at this point
	const localPoint = new THREE.Vector3();
	localPoint.copy( point ).applyMatrix4( inverseMatrix )

	const planePoint = new THREE.Vector3()
	let totalPoints = 0
	indices.forEach( index => {
		tempVec.fromBufferAttribute( normalAttr, index )
		normal.add( tempVec )
		// compute the average point for cases where we need to flatten to the plane.
		if ( ! brushOnly ) {
			totalPoints ++
			tempVec.fromBufferAttribute( posAttr, index )
			planePoint.add( tempVec )
		}
	})
	normal.normalize()
	if ( totalPoints ) {
		planePoint.multiplyScalar( 1 / totalPoints )
	}
	// Early out if we just want to adjust the brush
	if ( brushOnly ) {
		return
	}
	// perform vertex adjustment
	const targetHeight = params.intensity * 0.0001
	const plane = new THREE.Plane()
	plane.setFromNormalAndCoplanarPoint( normal, planePoint )
	indices.forEach( index => {
		tempVec.fromBufferAttribute( posAttr, index )
		// compute the offset intensity
		const dist = tempVec.distanceTo( localPoint )
		let intensity = 1.0 - ( dist / params.size )
		intensity = Math.pow( intensity, 2 );
		tempVec.addScaledVector( normal, - intensity * targetHeight )
		posAttr.setXYZ( index, tempVec.x, tempVec.y, tempVec.z )
		normalAttr.setXYZ( index, 0, 0, 0 )

	} )
	// If we found vertices
	if ( indices.size ) {
		posAttr.needsUpdate = true
	}
}

function updateNormals( triangles, indices ) {
	const tempVec = new THREE.Vector3()
	const tempVec2 = new THREE.Vector3()
	const indexAttr = targetMesh.geometry.index
	const posAttr = targetMesh.geometry.attributes.position
	const normalAttr = targetMesh.geometry.attributes.normal
	// accumulate the normals in place in the normal buffer
	const triangle = new THREE.Triangle()
	triangles.forEach( tri => {
		const tri3 = tri * 3
		const i0 = tri3 + 0
		const i1 = tri3 + 1
		const i2 = tri3 + 2
		const v0 = indexAttr.getX( i0 )
		const v1 = indexAttr.getX( i1 )
		const v2 = indexAttr.getX( i2 )
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
		normalAttr.setXYZ( index, tempVec.x, tempVec.y, tempVec.z )
	})
	normalAttr.needsUpdate = true
}

function render() {
	requestAnimationFrame( render )
	if ( ! brushActive ) {
		lastCastPose.setScalar( Infinity )
	} 
	else {
		const raycaster = new THREE.Raycaster()
		raycaster.setFromCamera( mouse, camera )
		raycaster.firstHitOnly = true
		const hit = raycaster.intersectObject( targetMesh, true )[ 0 ]
		// if we hit the target mesh
		if ( hit ) {
			// if the last cast pose was missed in the last frame then set it to
			// the current point so we don't streak across the surface
			if ( lastCastPose.x === Infinity ) {
				lastCastPose.copy( hit.point )
			}
			// If the mouse isn't pressed don't perform the stroke
			if ( ! ( mouseState || lastMouseState ) ) {
				performStroke( hit.point, true )
				lastMouse.copy( mouse )
				lastCastPose.copy( hit.point )
			}
			else {
				// compute the distance the mouse moved and that the cast point moved
				const mdx = ( mouse.x - lastMouse.x ) * window.innerWidth * window.devicePixelRatio
				const mdy = ( mouse.y - lastMouse.y ) * window.innerHeight * window.devicePixelRatio
				let mdist = Math.sqrt( mdx * mdx + mdy * mdy )
				let castDist = hit.point.distanceTo( lastCastPose )

				const step = params.size * 0.15
				const percent = Math.max( step / castDist, 1 / params.maxSteps )
				const mstep = mdist * percent
				let stepCount = 0

				// perform multiple iterations toward the current mouse pose for a consistent stroke
				// TODO: recast here so he cursor is on the surface of the model which requires faster
				// refitting of the model
				const changedTriangles = new Set()
				const changedIndices = new Set()
				const traversedNodeIndices = new Set()
				const sets = {
					accumulatedTriangles: changedTriangles,
					accumulatedIndices: changedIndices,
					accumulatedTraversedNodeIndices: traversedNodeIndices,
				}
				while ( castDist > step && mdist > params.size * 200 / hit.distance ) {
					lastMouse.lerp( mouse, percent )
					lastCastPose.lerp( hit.point, percent )
					castDist -= step
					mdist -= mstep
					performStroke( lastCastPose, false, sets )
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
					updateNormals( changedTriangles, changedIndices )
					targetMesh.geometry.boundsTree.refit( traversedNodeIndices )
				} 
				else {
					performStroke( hit.point, true )
				}
			}
		} 
		else {
			// if we didn't hit
			lastMouse.copy( mouse )
			lastCastPose.setScalar( Infinity )
		}
	}
	lastMouseState = mouseState
	renderer.render( scene, camera )
}
