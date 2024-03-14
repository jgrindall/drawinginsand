
import * as THREE from "three"

const getAttr = (geom: THREE.BufferGeometry, name: "position" | "normal" | "color", a:number): THREE.Vector3=>{
    const x = geom.attributes[name].getX(a)
    const y = geom.attributes[name].getY(a)
    const z = geom.attributes[name].getZ(a)
    return new THREE.Vector3(x, y, z)
}

const setAttr = (geom: THREE.BufferGeometry, name: "position" | "normal" | "color", a:number, p:THREE.Vector3)=>{
    geom.attributes[name].setXYZ(a, p.x, p.y, p.z)
}

export const getPosAttr = (geom: THREE.BufferGeometry, a: number): THREE.Vector3 => getAttr(geom, "position", a)
export const getNormAttr = (geom: THREE.BufferGeometry, a: number): THREE.Vector3 => getAttr(geom, "normal", a)
export const updatePosAttr = (geom: THREE.BufferGeometry, a: number, p:THREE.Vector3) => setAttr(geom, "position", a, p)
export const updateNormAttr = (geom: THREE.BufferGeometry, a: number, p:THREE.Vector3) => setAttr(geom, "normal", a, p)
export const updateColorAttr = (geom: THREE.BufferGeometry, a: number, p:THREE.Vector3) => setAttr(geom, "color", a, p)

export const computeVertexNormals = (geom: THREE.BufferGeometry, a:number, b:number, c:number)=>{
    // https://github.com/mrdoob/three.js/blob/f4a695c408227de4a003a104307703bdc34b14fe/src/core/BufferGeometry.js#L631
    const pA:THREE.Vector3 = getPosAttr(geom, a)
    const pB:THREE.Vector3 = getPosAttr(geom, b)
    const pC:THREE.Vector3 = getPosAttr(geom, c)

    const cb = new THREE.Vector3()
    const ab = new THREE.Vector3()
    
    const nA:THREE.Vector3 = getNormAttr(geom, a)
    const nB:THREE.Vector3 = getNormAttr(geom, b)
    const nC:THREE.Vector3 = getNormAttr(geom, c)


    cb.subVectors(pC, pB)
    ab.subVectors(pA, pB)
    cb.cross(ab)

    nA.add(cb)
    nB.add(cb)
    nC.add(cb)

    nA.normalize()
    nB.normalize()
    nC.normalize()

    updateNormAttr(geom, a, nA)
    updateNormAttr(geom, b, nB)
    updateNormAttr(geom, c, nC)

}