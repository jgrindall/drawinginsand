
import * as THREE from "three"
import {computeVertexNormals, getPosAttr, updatePosAttr, updateColorAttr} from "./Attrs"



export interface ISandDrawer{
    drawAt(pos: THREE.Vector2):void
    moveTo(pos: THREE.Vector2): void
}

export class SandDrawer implements ISandDrawer{

    private currentPos: THREE.Vector2 | undefined = undefined
    private planeGeometry: THREE.BufferGeometry | undefined
    private planeMesh: THREE.Mesh | undefined
    private raycaster: THREE.Raycaster | undefined
    private camera: THREE.Camera | undefined

    constructor(planeGeometry: THREE.BufferGeometry, planeMesh: THREE.Mesh, raycaster: THREE.Raycaster, camera: THREE.Camera){
        this.planeGeometry = planeGeometry
        this.planeMesh = planeMesh
        this.raycaster = raycaster
        this.camera = camera
    }

    /**
     * 
     * @param pos 
     */
    drawAt(pos: THREE.Vector2): void{
        const OFFSET_LENGTH = 0.01
        if(this.currentPos){
            const delta = pos
                .clone()
                .sub(this.currentPos)
            delta.setLength(OFFSET_LENGTH)
            delta.rotateAround(new THREE.Vector2(0, 0), Math.PI * 0.5)
            
            const offset1 = pos
                .clone()
                .add(delta)
            
            const offset2 = pos
                .clone()
                .sub(delta)

            //this.drawBump(offset1)
            //this.drawBump(offset2)
        }
        this.indentPlane(pos)
        this.currentPos = pos
        
        //this.indent(pos.clone().add(new THREE.Vector2(0.02, 0.02)))
        //this.indent(pos.clone().add(new THREE.Vector2(0.05, 0.05)))
        //this.bump()
    }

    moveTo(pos: THREE.Vector2): void{
        const dx = pos.x - this.currentPos!.x
        const dy = pos.y - this.currentPos!.y
        const lenSqr =  dx * dx + dy * dy
        // use 'num' segments to make it continuous
        let num = Math.round(lenSqr * 50000) + 16
        num = 8
        for(let i = 0; i < num; i++){
            const lerp = i / (num - 1)
            const p = new THREE.Vector2(
                this.currentPos!.x + lerp * dx,
                this.currentPos!.y + lerp * dy
            )
            this.drawAt(p)
        }
        // and store the last position for next time
        this.currentPos = pos
    }

    /**
     * push vertices of plane down, as if you had drawn on them
     * @param pos 
     */
    private indentPlane(pos: THREE.Vector2){
        const clrs = [
            new THREE.Vector3(44/255, 31/255, 23/355),
            new THREE.Vector3(54/255, 45/255, 30/355),
            new THREE.Vector3(50/255, 35/255, 27/355)
        ]
        const DEPTH:number = 0.25
        this.raycaster!.setFromCamera(pos, this.camera!)
        const intersections = this.raycaster!.intersectObject(this.planeMesh!)

        const drawIntersection = (intersection: THREE.Intersection)=>{
            const face = intersection.face!

            const ud = (index:number)=>{
                const p = getPosAttr(this.planeGeometry!, index)
                const newP = new THREE.Vector3(p.x, p.y, DEPTH)
                updatePosAttr(this.planeGeometry!, index, newP)
            }

            ud(face.a)
            //ud(face.b)
            //ud(face.c)

            updateColorAttr(this.planeGeometry!, face.a, clrs[face.a % clrs.length])
            computeVertexNormals(this.planeGeometry!, face.a, face.b, face.c)
        }

        if(intersections[0]){
            //intersections.forEach(drawIntersection)
            drawIntersection(intersections[0])

            this.planeGeometry!.attributes.position.needsUpdate = true
            this.planeGeometry!.attributes.normal.needsUpdate = true
            this.planeGeometry!.attributes.color.needsUpdate = true
        }
    }
}