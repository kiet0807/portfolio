/*
 * GLSL for the fluid sphere. A unit icosphere is displaced along its normal by
 * animated simplex noise; normals are rebuilt from two neighbouring samples so
 * the surface shades like a smooth liquid.
 *
 * snoise(): 3D simplex noise by Ian McEwan / Stefan Gustavson (Ashima Arts), MIT licence.
 */
const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uPointer;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vWave;

${SIMPLEX_NOISE}

// Height of the liquid surface above the unit sphere at direction n.
float field(vec3 n) {
  float t = uTime * 0.26;
  // Slowly rotate the noise domain around Y: reads as the sphere turning.
  float a = uTime * 0.11;
  vec3 q = vec3(n.x * cos(a) - n.z * sin(a), n.y, n.x * sin(a) + n.z * cos(a));
  // One broad swell plus a faint ripple: large soft forms read as liquid, small ones as rock.
  float h = snoise(q * 0.9 + vec3(0.0, t, t * 0.6)) * 0.2;
  h += snoise(q * 1.9 - vec3(t * 0.9, 0.0, t * 0.4)) * 0.03;
  // Gentle swell toward the pointer.
  vec3 toward = normalize(vec3(uPointer * 1.1, 1.0));
  h += 0.1 * smoothstep(0.25, 1.0, dot(n, toward));
  return h;
}

vec3 surface(vec3 p) {
  vec3 n = normalize(p);
  return n * (1.0 + field(n));
}

void main() {
  vec3 n0 = normalize(position);
  vec3 axis = abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(n0, axis));
  vec3 t2 = cross(n0, t1);

  vec3 p = surface(n0);
  vec3 pa = surface(n0 + t1 * 0.02);
  vec3 pb = surface(n0 + t2 * 0.02);
  vec3 n = normalize(cross(pa - p, pb - p));
  if (dot(n, n0) < 0.0) n = -n;

  vWave = length(p) - 1.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vViewPosition = mv.xyz;
  vNormal = normalize(normalMatrix * n);
  gl_Position = projectionMatrix * mv;
}
`;

export const fragmentShader = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uLight;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vWave;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(-vViewPosition);
  float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);

  vec3 L1 = normalize(vec3(0.5, 0.8, 0.6));
  vec3 L2 = normalize(vec3(-0.7, -0.2, 0.5));
  float diffuse = clamp(dot(N, L1), 0.0, 1.0);
  float spec = pow(clamp(dot(N, normalize(L1 + V)), 0.0, 1.0), 70.0);
  float spec2 = pow(clamp(dot(N, normalize(L2 + V)), 0.0, 1.0), 28.0);

  float crest = smoothstep(-0.2, 0.26, vWave);
  vec3 base = mix(uDeep, uMid, clamp(crest * 0.5 + diffuse * 0.62, 0.0, 1.0));
  vec3 color = mix(base, uLight, fresnel * 0.9);
  color += vec3(1.0) * spec * 0.7 + uLight * spec2 * 0.22;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/*
 * Round, soft-edged dots for the order network: sized in CSS pixels at the distance of
 * the scene's centre, and dimmer the further they are behind it, so the far side of the
 * shell reads as depth instead of clutter.
 */
export const dotVertexShader = /* glsl */ `
attribute float aSize;
uniform float uPixelRatio;
varying float vNear;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  // The camera sits 4.6 units from the centre; the shell spans roughly 3.3 to 5.9.
  vNear = smoothstep(-5.9, -3.3, mv.z);
  gl_PointSize = aSize * uPixelRatio * (4.6 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

export const dotFragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vNear;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.2, d) * mix(0.16, 0.95, vNear);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
