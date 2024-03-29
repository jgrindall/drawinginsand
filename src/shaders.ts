// shaders for the points material

const vertexShader = `
// different points can have a different scale and color
attribute float scale;
attribute vec3 hue;
varying vec3 vHue;
void main() {
    vHue = hue;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = scale;
}
`

const fragmentShader = `
// varying color for each point
varying vec3 vHue;
void main() {
    gl_FragColor = vec4(vec3(vHue/255.0), 1.0);
}
`

export {
    vertexShader,
    fragmentShader
}