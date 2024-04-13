//@ts-ignore
import {Texture, Vector2, Vector3,} from "three"

type UniformF = {
    type: "f",
    value: number
}

type UniformI = {
    type: "i",
    value: number
}

type UniformB = {
    type: "b",
    value: boolean
}

type UniformV2 = {
    type: "v2",
    value: Vector2
}

type UniformV3 = {
    type: "v3",
    value: Vector3
}

type UniformT = {
    type: "t",
    value: Texture
}

export type Uniforms = {
    u_time: UniformF,
    u_resolution: UniformV2,
    u_buffer: UniformT,
    u_tray_bottom: UniformT,
    u_contents: UniformT,
    u_foam_contents: UniformT,
    u_foam: UniformT,
    u_light_environment: UniformT,
    u_mouse: UniformV3,
    u_frame: UniformI,
    u_renderpass: UniformB
}
