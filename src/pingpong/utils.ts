

import {Texture, TextureLoader,
    //@ts-ignore
    NearestMipMapNearestFilter, RepeatWrapping, BufferGeometry, Vector3} from "three"


export const wait = async (msecs: number): Promise<void>=>{
    return new Promise((resolve)=>{
        setTimeout(()=>{
            resolve()
        }, msecs)
    })
}

const loader = new TextureLoader()

export const getTexture = async (path: string): Promise<Texture>=>{
    return new Promise((resolve)=>{
        loader.load(
            path + "?rnd=" + Math.floor(Math.random()*1000),
            (tex:Texture) => {
                //tex.wrapS = RepeatWrapping;
                //tex.wrapT = RepeatWrapping;
                //tex.minFilter = NearestMipMapNearestFilter;
                resolve(tex)
            })
    })
}

const cache:{[key: string]: HTMLImageElement} = {}

export const getImageCached = async (path: string): Promise<HTMLImageElement>=>{
    if(cache[path]){
        return cache[path]
    }
    const image = await getImage(path)
    cache[path] = image
    return image
}

export const getImage = async (path: string): Promise<HTMLImageElement>=>{
    console.log("getimage", path)
    return new Promise((resolve)=>{
        const image = new Image()
        image.onload = ()=>{
            resolve(image)
        }
        image.src = path
    })
}

export const getSquare = (size: number)=>{

    /**  d--<------c
     *   |      /  |
     *   v    /    ^
     *   |  /      |
     *   a----->---b
     * 
     */
    
    return new BufferGeometry().setFromPoints([
        new Vector3(-size, -size, 0),
        new Vector3(size, -size, 0),
        new Vector3(size, size, 0),
    
        new Vector3(-size, -size, 0),
        new Vector3(size, size, 0),
        new Vector3(-size, size, 0),
        
    ])
    
}