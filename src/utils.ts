
import * as THREE from "three"

export const rand = (a:number, b:number):number=>{
    return Math.random()*(b - a) + a
}

const loader = new THREE.TextureLoader()

/**
 * Helper function to load a texture
 * @param path 
 * @returns 
 */
export const getTexture = async (path:string): Promise<THREE.Texture> => {
    return new Promise((resolve) => {
        loader.load(
            path + "?rnd=" + Math.floor(Math.random() * 100000),
            (tex: THREE.Texture) => {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.minFilter = THREE.NearestMipMapNearestFilter;
                resolve(tex)
            })
    })
}

export const getCanvasTexture = async (path:string): Promise<{texture: THREE.CanvasTexture, canvas: HTMLCanvasElement}> => {
    return new Promise((resolve) => {
        getCanvas(path).then((canvas: HTMLCanvasElement) => {
            resolve({
                texture: new THREE.CanvasTexture(canvas),
                canvas
            })
        })
    })
}

export const getCanvas = async (path:string): Promise<HTMLCanvasElement>=>{
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement("canvas")
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext("2d")
            ctx!.drawImage(img, 0, 0)
            resolve(canvas)
        }
        img.src = path
    })
}