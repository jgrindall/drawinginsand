const vertexShader = `
uniform float time;
attribute float scale;
attribute float hue;
//varying float vHue;
void main() {

    //vec2 uv = position.xy;
    //vHue = hue;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = scale * 1.5;
}
`

const fragmentShader = `
//varying float vHue;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
void main() {
    vec2 _sample = gl_FragCoord.xy / u_resolution.xy;
    vec4 fragcolour = texture2D(u_texture, _sample);
    //vec4 sand = vec4(70.0/255.0, 55.0/255.0, 41.0/255.0, 0.75);
    vec4 sand = vec4(250.0/255.0, 55.0/255.0, 41.0/255.0, 0.75);
    gl_FragColor = sand;
}
`

export {
    vertexShader,
    fragmentShader
}