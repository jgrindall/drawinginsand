import * as THREE from 'three';
import {
	CONTAINED,
	INTERSECTED,
	NOT_INTERSECTED
} from 'three-mesh-bvh';

type A = any

export class SandSculptTool{
	constructor(private targetMesh: THREE.Mesh, private params: any){

	}

	perform(point: THREE.Vector3, brushOnly = false, accumulatedFields:A = {}){
		const {
			accumulatedTriangles = new Set(),
			accumulatedIndices = new Set(),
			accumulatedTraversedNodeIndices = new Set(),
		} = accumulatedFields
	
		const inverseMatrix = new THREE.Matrix4()
		inverseMatrix.copy( this.targetMesh.matrixWorld ).invert()
	
		const sphere = new THREE.Sphere()
		sphere.center.copy( point ).applyMatrix4( inverseMatrix )
		sphere.radius = this.params.size
	
		// Collect the intersected vertices
		const indices = new Set<number>()
		const tempVec = new THREE.Vector3()
		const normal = new THREE.Vector3()
		const indexAttr = this.targetMesh.geometry.index
		const posAttr = this.targetMesh.geometry.attributes.position
		const normalAttr = this.targetMesh.geometry.attributes.normal
		
		const colorAttr = this.targetMesh.geometry.attributes.color

		const triangles = new Set()
		//@ts-ignore
		const bvh = this.targetMesh.geometry.boundsTree;
		bvh.shapecast( {
			intersectsBounds: (box: any, isLeaf: any, score: any, depth: any, nodeIndex: any) => {
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
			intersectsTriangle: ( tri: any, index: any, contained: any ) => {
				const triIndex = index
				triangles.add( triIndex )
				accumulatedTriangles.add( triIndex )
				const i3 = 3 * index
				const a = i3 + 0
				const b = i3 + 1
				const c = i3 + 2
				const va = indexAttr!.getX( a )
				const vb = indexAttr!.getX( b )
				const vc = indexAttr!.getX( c )
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
		indices.forEach( (index:number) => {
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
		const targetHeight = this.params.intensity * 0.0001
		const plane = new THREE.Plane()
		plane.setFromNormalAndCoplanarPoint( normal, planePoint )
		indices.forEach( index => {
			tempVec.fromBufferAttribute( posAttr, index )
			// compute the offset intensity
			const dist = tempVec.distanceTo( localPoint )
			let intensity = 1.0 - ( dist / this.params.size )
			intensity = Math.pow( intensity, 2 );
			tempVec.addScaledVector( normal, - intensity * targetHeight )
	
			const noiseAmount = 0.002
			const noise = Math.random() * noiseAmount - (noiseAmount/2)
			tempVec.addScalar( noise )
	
			posAttr.setXYZ( index, tempVec.x, tempVec.y, tempVec.z )
			normalAttr.setXYZ( index, 0, 0, 0 )
	
			//colors.push(255/255, 150/255, 120/255)
			colorAttr.setXYZ(index, 220/255, 120/255, 80/255)
	
		} )
		// If we found vertices
		if ( indices.size ) {
			posAttr.needsUpdate = true
			colorAttr.needsUpdate = true
		}
	}

}