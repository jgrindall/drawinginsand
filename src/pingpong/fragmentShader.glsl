uniform vec2 u_resolution;
uniform vec3 u_mouse;
uniform float u_time;
uniform sampler2D u_buffer;
uniform sampler2D u_foam;
uniform sampler2D u_tray_bottom;
uniform sampler2D u_contents;
uniform sampler2D u_foam_contents;
uniform sampler2D u_light_environment;
uniform bool u_renderpass;
uniform int u_frame;

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}
vec4 permute(vec4 x){return mod289((x * 34.0 + 1.0) * x);}

vec4 snoise(vec3 v)
{
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);

    // First corner
    vec3 i  = floor(v + dot(v, vec3(C.y)));
    vec3 x0 = v   - i + dot(i, vec3(C.x));

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.x;
    vec3 x2 = x0 - i2 + C.y;
    vec3 x3 = x0 - 0.5;

    // Permutations
    vec4 p =
      permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
                            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    vec4 j = p - 49.0 * floor(p / 49.0);  // mod(p,7*7)

    vec4 x_ = floor(j / 7.0);
    vec4 y_ = floor(j - 7.0 * x_); 

    vec4 x = (x_ * 2.0 + 0.5) / 7.0 - 1.0;
    vec4 y = (y_ * 2.0 + 0.5) / 7.0 - 1.0;

    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 g0 = vec3(a0.xy, h.x);
    vec3 g1 = vec3(a0.zw, h.y);
    vec3 g2 = vec3(a1.xy, h.z);
    vec3 g3 = vec3(a1.zw, h.w);

    // Compute noise and gradient at P
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    vec4 m2 = m * m;
    vec4 m3 = m2 * m;
    vec4 m4 = m2 * m2;
    vec3 grad =
      -6.0 * m3.x * x0 * dot(x0, g0) + m4.x * g0 +
      -6.0 * m3.y * x1 * dot(x1, g1) + m4.y * g1 +
      -6.0 * m3.z * x2 * dot(x2, g2) + m4.z * g2 +
      -6.0 * m3.w * x3 * dot(x3, g3) + m4.w * g3;
    vec4 px = vec4(dot(x0, g0), dot(x1, g1), dot(x2, g2), dot(x3, g3));
    return 42.0 * vec4(grad, dot(m4, px));
}

vec4 get_caustic2(vec2 uv ){

    vec2 p = uv;
    // camera matrix
    vec3 ww = normalize(-vec3(0., 1., 1.));
    vec3 uu = normalize(cross(ww, vec3(0., 1., 0.)));
    vec3 vv = normalize(cross(uu,ww));

    float size = 15.0;
    float speed = 0.1;

	vec3 rd = p.x*uu + p.y*vv + 1.5*ww;	// view ray
    vec3 pos = -ww + rd*(ww.y/rd.y);	// raytrace plane
    pos.y = u_time * speed;					// animate noise slice
    pos *= size;							// tiling frequency

    // caustic effect
        
    vec4 n = snoise( pos );
        
    pos -= 0.07*n.xyz;
    n = snoise( pos );

    pos -= 0.07*n.xyz;
    n = snoise( pos );

    // noise [-1..+1] -> color
    
    float intensity = (n.w + 1.0) * 0.5; // from 0 to 1
    intensity = pow(intensity, 2.0);
    float a = pow(intensity, 1.0); // also 0 to 1
	return vec4(intensity, intensity, intensity, a);
   
}

vec4 get_foam(vec2 uv){
    // use the caustics to push the foam around a little
    
    vec4 caustic = get_caustic2(uv); // 0 to 1
    
    float a = caustic.a - 0.5; // -0.5 to 0.5
    
    float intensity = 0.015;

    // translate a little - make the foam move
    vec2 f = uv + intensity*vec2(a, a);

    vec4 foamColor = texture(u_foam, f);
    vec4 foamContentColor = texture(u_foam_contents, f);

    if(foamContentColor.a > 0.0){
        foamColor = foamContentColor;
    }

    float foamWeight = foamColor.a;

    vec3 clr = vec3(foamWeight); // white

    return vec4(clr, foamColor.a * 0.25);
}

float get_wind(){
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float wind_speed = 10.0;
    float wind_strength = 0.0001;
    //10, 25 control the direction of the wind
    return sin(u_time * wind_speed + 25.0*uv.x + 10.0*uv.y) * wind_strength;
}

vec4 renderPass() {
    
    float gap_x = 5.0 / u_resolution.x;
    float gap_y = 5.0 / u_resolution.y;

    vec2 _sample = gl_FragCoord.xy / u_resolution.xy;

    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);

    vec2 mouse = u_mouse.xy - uv;

    vec4 fragcolour = texture2D(u_buffer, _sample);

    float t = texture2D(u_buffer, _sample - vec2(0.0, gap_y), 1.0).x;
    float r = texture2D(u_buffer, _sample - vec2(gap_x, 0.0), 1.0).x;
    float b = texture2D(u_buffer, _sample + vec2(gap_x, 0.0), 1.0).x;
    float l = texture2D(u_buffer, _sample + vec2(0.0, gap_y), 1.0).x;

    float shade = 0.0;
    if(u_mouse.z > 0.0) {
        float _sin = sin(u_time * 10.0) * 0.001;
        shade = smoothstep(0.05 + _sin, 0.0, length(mouse) * 2.5);
    }
    float d;
    if(u_frame < 10){
        d = 0.5;
    }
    else{
        float attenuation = 0.5;
        d = shade;
        d += -(fragcolour.y - 0.5)*2.0 + (t + r + b + l - 2.0);
        d *= attenuation;
        d = d*0.5 + 0.5;
    }

    // a bit of wind/ripples
    d += get_wind();
    return vec4(d, fragcolour.x, 0, 1.0);
}

vec3 get_normal(){
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float g = 0.002;
    float fx = texture2D(u_buffer, uv + vec2(g, 0.0)).r;
    float fy = texture2D(u_buffer, uv + vec2(0.0, g)).r;
    float f =  texture2D(u_buffer, uv + vec2(0.0, 0.0)).r;

    return vec3((fx - f)/g, (fy - f)/g, 0) * 0.5;
}

vec4 renderRipples() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec3 uv_up = vec3(uv, 1.0);
    vec3 normal = vec3(0.0, 0.0, -1.0);
    vec3 v = get_normal();
    normal = normalize(normal + v);
    
    vec3 reflect_ray = reflect(uv_up, normal);

    float distort_text = 0.0075;

    vec2 rr = (uv + distort_text * reflect_ray.xy)/(1.0 + distort_text);

    vec4 tray_bottom = texture2D(u_tray_bottom, rr);

    vec4 contents = texture2D(u_contents, rr);

    vec4 below_water = tray_bottom * 0.8;

    if(contents.a > 0.0){
        //tray bottom or contents
        below_water = contents * 0.8;
    }

    vec4 caustic = get_caustic2(uv);
    
    float caustic_light_strength = 0.045;
    vec2 castic_light_disturbance =  vec2(caustic.a * caustic_light_strength, caustic.a * caustic_light_strength);
    vec4 lights = texture2D(u_light_environment, reflect_ray.xy + castic_light_disturbance);
    
    float w_below = 5.0;
    float w_lights = 2.0;
    float w_caustic = 0.5;

    vec4 foam = get_foam(uv);

    w_below *= below_water.a;
    w_lights *= lights.a;
    w_caustic *= caustic.a;

    float total =  w_below + w_lights + w_caustic;

    w_below /= total;
    w_lights /= total;
    w_caustic /= total;


    vec4 clr = (
        w_below *       below_water + 
        w_lights *      lights +
        w_caustic  *    caustic
    );

    return clr + foam;
}

void main() {
    if(u_renderpass) {
        gl_FragColor = renderPass();
    }
    else {
        gl_FragColor = renderRipples();
    }
}
