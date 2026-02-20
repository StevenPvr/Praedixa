// ── Neural Network Node Shaders ──

export const neuralNodeVertexShader = `
uniform float uTime;

attribute float aActivation;
attribute float aLayerRatio;  // 0.0 = input layer, 1.0 = output layer
attribute float aHubSize;     // bigger for nodes with more connections

varying float vAlpha;
varying float vActivation;
varying float vLayerRatio;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Hub nodes are naturally larger
  float baseSize = 100.0 + aHubSize * 80.0;
  float activatedSize = baseSize + aActivation * 140.0;
  gl_PointSize = (activatedSize / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;

  vAlpha = smoothstep(40.0, -5.0, mvPosition.z);
  vActivation = aActivation;
  vLayerRatio = aLayerRatio;
}
`;

export const neuralNodeFragmentShader = `
uniform float uOpacity;
uniform float uTime;

// Layer gradient palette
uniform vec3 uColorInput;   // left side (blue)
uniform vec3 uColorMiddle;  // center (cyan/teal)
uniform vec3 uColorOutput;  // right side (brass/gold)

varying float vAlpha;
varying float vActivation;
varying float vLayerRatio;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  // ── Multi-layer glow for premium look ──
  float hardCore  = exp(-dist * dist * 120.0);  // tiny bright center
  float softCore  = exp(-dist * dist * 30.0);   // inner glow
  float innerGlow = exp(-dist * dist * 10.0);   // medium halo
  float outerGlow = exp(-dist * dist * 3.0);    // outer haze

  // Ambient breathing
  float pulse = 0.9 + 0.1 * sin(uTime * 0.8 + vLayerRatio * 6.28);

  // ── Color gradient across layers ──
  vec3 layerColor;
  if (vLayerRatio < 0.5) {
    layerColor = mix(uColorInput, uColorMiddle, vLayerRatio * 2.0);
  } else {
    layerColor = mix(uColorMiddle, uColorOutput, (vLayerRatio - 0.5) * 2.0);
  }

  // Active nodes get brighter, whiter core
  vec3 activeWhite = vec3(0.95, 0.97, 1.0);
  vec3 coreColor = mix(layerColor, activeWhite, hardCore * 0.6 + vActivation * 0.4);

  // ── Combine glow layers ──
  float baseBrightness = 0.35 * pulse;
  float activeBrightness = 0.65 * vActivation;
  float brightness = baseBrightness + activeBrightness;

  float shape = hardCore * 0.5 + softCore * 0.3 + innerGlow * 0.25 + outerGlow * 0.1;
  float alpha = shape * brightness * vAlpha * uOpacity;

  gl_FragColor = vec4(coreColor, alpha);
}
`;

// ── Neural Network Edge Shaders ──

export const neuralEdgeVertexShader = `
attribute float aEdgeActivation;
attribute float aEdgePosition;
attribute float aEdgeLayerRatio; // avg layer position of this edge

varying float vEdgeActivation;
varying float vPulsePos;
varying float vAlpha;
varying float vEdgeLayer;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vEdgeActivation = aEdgeActivation;
  vPulsePos = aEdgePosition;
  vAlpha = smoothstep(40.0, -5.0, mvPosition.z);
  vEdgeLayer = aEdgeLayerRatio;
}
`;

export const neuralEdgeFragmentShader = `
uniform vec3 uColorPulse;
uniform vec3 uColorIdle;
uniform float uTime;
uniform float uOpacity;

varying float vEdgeActivation;
varying float vPulsePos;
varying float vAlpha;
varying float vEdgeLayer;

void main() {
  // Base visibility — elegant thin lines
  float baseBrightness = 0.18;

  // ── Data flow pulse ──
  float pulseCenter = fract(uTime * 0.7);
  float pulse = smoothstep(0.22, 0.0, abs(vPulsePos - pulseCenter));
  // Second pulse for denser signal feel
  float pulseCenter2 = fract(uTime * 0.7 + 0.5);
  float pulse2 = smoothstep(0.15, 0.0, abs(vPulsePos - pulseCenter2)) * 0.5;
  float totalPulse = max(pulse, pulse2);

  // Ambient shimmer
  float shimmer = 0.04 * sin(uTime * 0.6 + vPulsePos * 12.56 + vEdgeLayer * 3.14);

  // ── Edge glow when activated ──
  float brightness = baseBrightness + shimmer
    + vEdgeActivation * (0.5 + totalPulse * 0.5);

  // Color: idle = subtle matching layer color, active = warm brass pulse
  vec3 idleColor = uColorIdle * (0.8 + vEdgeLayer * 0.4);
  vec3 color = mix(idleColor, uColorPulse, vEdgeActivation * (0.3 + totalPulse * 0.7));

  gl_FragColor = vec4(color, brightness * vAlpha * uOpacity);
}
`;
