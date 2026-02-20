export const nebulaVertexShader = `
// Simplex 3D Noise by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise3(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uMouseWorld;
uniform float uMouseStrength;
uniform float uChaos;

attribute vec3 aOffset;
attribute float aScale;

varying float vAlpha;

void main() {
  // Simplex 3D Noise oscillation
  float noise = snoise3(aOffset * 0.3 + vec3(0.0, 0.0, uTime * 0.08));

  vec3 pos = aOffset;
  // Chaos modifier controls turbulence amplitude
  pos += aOffset * noise * (0.15 + uChaos * 1.5);

  // Antigravity mouse attraction field
  if (uMouse.x < 100.0 && uMouseStrength > 0.01) {
    // Use pre-computed world-space mouse position (accounts for FOV + aspect)
    vec3 toMouse = uMouseWorld - pos;
    float dist = length(toMouse);

    // Gravity-like falloff: strong nearby, gentle far
    float attractionRadius = 8.0;
    float strength = smoothstep(attractionRadius, 0.0, dist);

    // Pull particles toward mouse with spring-like damping
    pos += normalize(toMouse) * strength * uMouseStrength * 1.5;

    // Nearby particles also orbit slightly (swirl effect)
    float swirl = strength * 0.4;
    pos.xy += vec2(-toMouse.y, toMouse.x) * swirl * sin(uTime + dist);
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Point size base scaled by depth
  gl_PointSize = (40.0 / -mvPosition.z) * aScale;
  gl_Position = projectionMatrix * mvPosition;

  // Fog factor (distance attenuation)
  vAlpha = smoothstep(20.0, -5.0, mvPosition.z);
}
`;

export const nebulaFragmentShader = `
uniform float uColorShift; // 0.0 = blue, 1.0 = red
uniform vec3 uColorBlue;
uniform vec3 uColorRed;
uniform float uOpacity; // 1.0 = visible, 0.0 = hidden

varying float vAlpha;

void main() {
  // Radial attenuation (disk)
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  // Soft edge
  float strength = 1.0 - smoothstep(0.1, 0.5, dist);

  // Transition between brass-blue and brick-red based on uColorShift
  vec3 finalColor = mix(uColorBlue, uColorRed, uColorShift);

  // Apply master opacity to hide particles
  gl_FragColor = vec4(finalColor, strength * vAlpha * 0.85 * uOpacity);
}
`;
