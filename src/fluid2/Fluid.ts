
import * as THREE from 'three';
import { FluidSolver } from './fluidsolver.js';

type Options = {
    densitySource: string
}

export class Fluid{

    private renderer: THREE.WebGLRenderer | undefined
    private camera: THREE.PerspectiveCamera | undefined
    private scene: THREE.Scene | undefined


    constructor(private options: Options){
        this.update = this.update.bind(this)
        this.initFluidSolver()
        this.initScene()
        this.addListeners()
        this.update()
    }
    private update(){
        this.renderScene()
        this.updateFluid()
        requestAnimationFrame(this.update)
    }
    private updateFluid(){

    }
    private initScene(){
        const container = document.getElementById('three-canvas')
        const purple = 0x8E24AA
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        })
        
        container!.appendChild(this.renderer.domElement)
        
        const w = 800
        const h = 600
        
        this.renderer.setSize(w, h)
        
        this.camera = new THREE.PerspectiveCamera( 45, w/h, 1, 10000 )
        this.camera.position.set( 0, 0, 10 )
        
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color( purple )
        
        const color = 0xf3e9bd //0xffffff
        
        const light = new THREE.DirectionalLight( color, 4 )
        light.position.set( 0.5, 0.5, 1 )
        this.scene.add( light )
        
        const ambientLight = new THREE.AmbientLight( color, 1 )
        this.scene.add( ambientLight )
        
        let geometry = new THREE.PlaneGeometry(5, 5, 1, 1)
        
        const displacementScale = 0.125
        
        let material = new THREE.MeshPhysicalMaterial({
            color: color,
            //bumpMap: contentsTexture,
            bumpScale: 50,
            //displacementMap: contentsTexture,
            displacementScale: displacementScale,
            //alphaMap: aTexture,
            transparent: true
        })
        const targetMesh = new THREE.Mesh(
            geometry,
            material
        )
        let material2 = new THREE.MeshBasicMaterial({
            color: purple,
            opacity: 1
        })
        const targetMesh2 = new THREE.Mesh(
            geometry,
            material2
        )
        const g = new THREE.Group()
        g.rotateX(-0.25)
        targetMesh2.position.z = displacementScale * 0.5
        g.add(targetMesh)
        g.add(targetMesh2)
        this.scene.add(g)
    }
    private renderScene(){
        this.renderer!.render(this.scene!, this.camera!)
        //contentsTexture.needsUpdate = true
        //aTexture.needsUpdate = true
        //material.needsUpdate = true
    }
    private initFluidSolver(){

    }
    private addListeners(){

    }
}

