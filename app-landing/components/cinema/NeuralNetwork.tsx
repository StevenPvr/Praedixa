"use client";

import { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  PerspectiveCamera,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { useScrollStore } from "../../lib/stores/scroll-store";
import {
  neuralNodeVertexShader,
  neuralNodeFragmentShader,
  neuralEdgeVertexShader,
  neuralEdgeFragmentShader,
} from "./neural-shaders";

// ── Graph generation ──
interface Node {
  x: number;
  y: number;
  z: number;
  layer: number;
  layerRatio: number; // 0→1 across layers
  hubSize: number; // 0→1 based on connection count
  edges: number[];
}

interface Edge {
  from: number;
  to: number;
}

function buildNetwork(gpuTier: 1 | 2): { nodes: Node[]; edges: Edge[] } {
  const layers = gpuTier === 2 ? 9 : 6;
  const nodesPerLayer =
    gpuTier === 2 ? [5, 8, 12, 16, 18, 16, 12, 8, 5] : [4, 6, 9, 9, 6, 4];

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const spreadX = 18;
  const spreadY = 8;
  const depthSpread = 2.5;

  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let l = 0; l < layers; l++) {
    const count = nodesPerLayer[l]!;
    const x = -spreadX / 2 + (l / (layers - 1)) * spreadX;

    for (let n = 0; n < count; n++) {
      const y = -spreadY / 2 + (n / Math.max(count - 1, 1)) * spreadY;
      nodes.push({
        x: x + (rand() - 0.5) * 1.2,
        y: y + (rand() - 0.5) * 0.7,
        z: (rand() - 0.5) * depthSpread,
        layer: l,
        layerRatio: l / (layers - 1),
        hubSize: 0, // computed after edges
        edges: [],
      });
    }
  }

  // Connect adjacent layers
  let startIdx = 0;
  for (let l = 0; l < layers - 1; l++) {
    const currCount = nodesPerLayer[l]!;
    const nextCount = nodesPerLayer[l + 1]!;
    const nextStartIdx = startIdx + currCount;

    for (let i = 0; i < currCount; i++) {
      const nodeIdx = startIdx + i;
      const numConnections = 3 + Math.floor(rand() * 2);
      const connected = new Set<number>();

      for (let c = 0; c < numConnections; c++) {
        const closestLocal = Math.round(
          (i / Math.max(currCount - 1, 1)) * (nextCount - 1),
        );
        let targetLocal: number;
        if (rand() < 0.5) {
          targetLocal = closestLocal;
        } else {
          targetLocal = closestLocal + Math.round((rand() - 0.5) * 4);
        }
        targetLocal = Math.max(0, Math.min(nextCount - 1, targetLocal));

        const targetIdx = nextStartIdx + targetLocal;
        if (!connected.has(targetIdx)) {
          connected.add(targetIdx);
          edges.push({ from: nodeIdx, to: targetIdx });
          nodes[nodeIdx]!.edges.push(targetIdx);
          nodes[targetIdx]!.edges.push(nodeIdx);
        }
      }
    }
    startIdx += currCount;
  }

  // Skip connections
  startIdx = 0;
  for (let l = 0; l < layers - 2; l++) {
    const currCount = nodesPerLayer[l]!;
    const skipCount = nodesPerLayer[l + 2]!;
    let skipStartIdx = 0;
    for (let s = 0; s <= l + 1; s++) skipStartIdx += nodesPerLayer[s]!;

    const numSkips = 1 + Math.floor(rand() * 2);
    for (let s = 0; s < numSkips; s++) {
      const fromIdx = startIdx + Math.floor(rand() * currCount);
      const toIdx = skipStartIdx + Math.floor(rand() * skipCount);
      edges.push({ from: fromIdx, to: toIdx });
      nodes[fromIdx]!.edges.push(toIdx);
      nodes[toIdx]!.edges.push(fromIdx);
    }
    startIdx += currCount;
  }

  // Compute hub sizes based on connection count
  let maxEdges = 1;
  for (const node of nodes) maxEdges = Math.max(maxEdges, node.edges.length);
  for (const node of nodes) node.hubSize = node.edges.length / maxEdges;

  return { nodes, edges };
}

// ── Component ──
interface NeuralNetworkProps {
  gpuTier: 1 | 2;
}

export function NeuralNetwork({ gpuTier }: NeuralNetworkProps) {
  const nodeMaterialRef = useRef<ShaderMaterial>(null);
  const edgeMaterialRef = useRef<ShaderMaterial>(null);
  const mouseRef = useRef(new Vector2(999, 999));
  const smoothMouseWorld = useRef(new Vector3(999, 999, 0));
  const { size, camera } = useThree();

  const network = useMemo(() => buildNetwork(gpuTier), [gpuTier]);
  const activations = useRef(new Float32Array(network.nodes.length));

  // Rest positions
  const restPositions = useMemo(() => {
    const rp = new Float32Array(network.nodes.length * 3);
    network.nodes.forEach((node, i) => {
      rp[i * 3] = node.x;
      rp[i * 3 + 1] = node.y;
      rp[i * 3 + 2] = node.z;
    });
    return rp;
  }, [network]);

  const currentPositions = useRef(new Float32Array(restPositions));

  // ── Node geometry ──
  const nodeGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(restPositions);
    const acts = new Float32Array(network.nodes.length);
    const layerRatios = new Float32Array(network.nodes.length);
    const hubSizes = new Float32Array(network.nodes.length);

    network.nodes.forEach((node, i) => {
      acts[i] = 0;
      layerRatios[i] = node.layerRatio;
      hubSizes[i] = node.hubSize;
    });

    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute("aActivation", new Float32BufferAttribute(acts, 1));
    geo.setAttribute("aLayerRatio", new Float32BufferAttribute(layerRatios, 1));
    geo.setAttribute("aHubSize", new Float32BufferAttribute(hubSizes, 1));
    return geo;
  }, [network, restPositions]);

  // ── Edge geometry ──
  const edgeGeometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(network.edges.length * 6);
    const edgeActs = new Float32Array(network.edges.length * 2);
    const edgePos = new Float32Array(network.edges.length * 2);
    const edgeLayerRatios = new Float32Array(network.edges.length * 2);

    network.edges.forEach((edge, i) => {
      const from = network.nodes[edge.from]!;
      const to = network.nodes[edge.to]!;
      positions[i * 6] = from.x;
      positions[i * 6 + 1] = from.y;
      positions[i * 6 + 2] = from.z;
      positions[i * 6 + 3] = to.x;
      positions[i * 6 + 4] = to.y;
      positions[i * 6 + 5] = to.z;
      edgeActs[i * 2] = 0;
      edgeActs[i * 2 + 1] = 0;
      edgePos[i * 2] = 0;
      edgePos[i * 2 + 1] = 1;
      // Average layer ratio of the two connected nodes
      const avgLayer = (from.layerRatio + to.layerRatio) / 2;
      edgeLayerRatios[i * 2] = avgLayer;
      edgeLayerRatios[i * 2 + 1] = avgLayer;
    });

    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute(
      "aEdgeActivation",
      new Float32BufferAttribute(edgeActs, 1),
    );
    geo.setAttribute("aEdgePosition", new Float32BufferAttribute(edgePos, 1));
    geo.setAttribute(
      "aEdgeLayerRatio",
      new Float32BufferAttribute(edgeLayerRatios, 1),
    );
    return geo;
  }, [network]);

  // ── Uniforms ──
  const nodeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
      // Layer gradient: deep blue → cyan/teal → warm brass
      uColorInput: { value: new Vector3(0.3, 0.45, 0.9) },
      uColorMiddle: { value: new Vector3(0.25, 0.75, 0.85) },
      uColorOutput: { value: new Vector3(0.85, 0.68, 0.3) },
    }),
    [],
  );

  const edgeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 1.0 },
      uColorPulse: { value: new Vector3(0.9, 0.78, 0.4) },
      uColorIdle: { value: new Vector3(0.25, 0.4, 0.7) },
    }),
    [],
  );

  // ── Mouse tracking ──
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      mouseRef.current.set(
        (e.clientX / size.width) * 2 - 1,
        -(e.clientY / size.height) * 2 + 1,
      );
    },
    [size],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  // ── Data flow pulses (ambient signals traveling through network) ──
  const dataFlows = useRef<
    Array<{ path: number[]; progress: number; speed: number }>
  >([]);
  const nextFlowTime = useRef(0);

  function spawnDataFlow(time: number) {
    // Pick a random node in layer 0, trace a path to the last layer
    const nodes = network.nodes;
    const startCandidates = nodes.filter((n) => n.layer === 0);
    if (startCandidates.length === 0) return;

    const startNode =
      startCandidates[Math.floor(Math.random() * startCandidates.length)]!;
    const startIdx = nodes.indexOf(startNode);
    const path = [startIdx];
    let current = startIdx;

    // Greedily walk toward higher layers
    for (let step = 0; step < 12; step++) {
      const node = nodes[current]!;
      const forwardNeighbors = node.edges.filter(
        (nb) => nodes[nb]!.layer > node.layer,
      );
      if (forwardNeighbors.length === 0) break;
      current =
        forwardNeighbors[Math.floor(Math.random() * forwardNeighbors.length)]!;
      path.push(current);
    }

    if (path.length > 2) {
      dataFlows.current.push({
        path,
        progress: 0,
        speed: 0.6 + Math.random() * 0.4,
      });
    }

    nextFlowTime.current = time + 0.8 + Math.random() * 1.5;
  }

  // ── Per-frame update ──
  useFrame((_state, delta) => {
    const store = useScrollStore.getState();
    const progress = store.progress;
    if (progress > 0.16) return;

    const nodeMat = nodeMaterialRef.current;
    const edgeMat = edgeMaterialRef.current;
    if (!nodeMat || !edgeMat) return;

    const time = (nodeMat.uniforms.uTime!.value as number) + delta;
    nodeMat.uniforms.uTime!.value = time;
    edgeMat.uniforms.uTime!.value = time;

    if (!(camera instanceof PerspectiveCamera)) return;

    // ── Mouse → world-space (smoothed) ──
    const fovRad = (camera.fov * Math.PI) / 180;
    const halfH = Math.tan(fovRad / 2) * Math.abs(camera.position.z);
    const aspect = size.width / size.height;
    const targetX = mouseRef.current.x * halfH * aspect;
    const targetY = mouseRef.current.y * halfH;

    const sm = smoothMouseWorld.current;
    sm.x += (targetX - sm.x) * Math.min(6 * delta, 1);
    sm.y += (targetY - sm.y) * Math.min(6 * delta, 1);

    // ── Spawn data flow pulses ──
    if (time > nextFlowTime.current) {
      spawnDataFlow(time);
    }

    // Advance data flows and compute their activation boosts
    const flowBoosts = new Float32Array(network.nodes.length);
    const flows = dataFlows.current;
    for (let f = flows.length - 1; f >= 0; f--) {
      const flow = flows[f]!;
      flow.progress += delta * flow.speed;
      const pathPos = flow.progress * (flow.path.length - 1);

      if (pathPos >= flow.path.length) {
        flows.splice(f, 1);
        continue;
      }

      // Boost nodes near the current pulse position
      for (let p = 0; p < flow.path.length; p++) {
        const dist = Math.abs(p - pathPos);
        if (dist < 1.5) {
          const boost = (1.0 - dist / 1.5) * 0.85;
          const nodeIdx = flow.path[p]!;
          flowBoosts[nodeIdx] = Math.max(flowBoosts[nodeIdx]!, boost);
        }
      }
    }

    // ── Compute displaced positions + activations ──
    const acts = activations.current;
    const nodes = network.nodes;
    const curPos = currentPositions.current;
    const rest = restPositions;
    const nodePosBuf = nodeGeometry.getAttribute("position")
      .array as Float32Array;

    const attractRadius = 5.0;
    const attractStrength = 2.0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const rx = rest[i * 3]!;
      const ry = rest[i * 3 + 1]!;
      const rz = rest[i * 3 + 2]!;

      const dx = sm.x - rx;
      const dy = sm.y - ry;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Elastic pull toward cursor
      let displaceX = 0;
      let displaceY = 0;
      if (dist < attractRadius && dist > 0.01) {
        const strength =
          Math.pow(1.0 - dist / attractRadius, 2) * attractStrength;
        displaceX = (dx / dist) * strength;
        displaceY = (dy / dist) * strength;
      }

      const targetPosX = rx + displaceX;
      const targetPosY = ry + displaceY;

      const springSpeed = 5.0;
      curPos[i * 3] =
        curPos[i * 3]! +
        (targetPosX - curPos[i * 3]!) * Math.min(springSpeed * delta, 1);
      curPos[i * 3 + 1] =
        curPos[i * 3 + 1]! +
        (targetPosY - curPos[i * 3 + 1]!) * Math.min(springSpeed * delta, 1);
      curPos[i * 3 + 2] = rz;

      nodePosBuf[i * 3] = curPos[i * 3]!;
      nodePosBuf[i * 3 + 1] = curPos[i * 3 + 1]!;
      nodePosBuf[i * 3 + 2] = curPos[i * 3 + 2]!;

      // ── Activation: cursor + data flow + neighbor propagation ──
      const cursorAct =
        dist < attractRadius ? Math.pow(1.0 - dist / attractRadius, 1.5) : 0;
      const flowAct = flowBoosts[i] ?? 0;

      let neighborBoost = 0;
      for (const nb of node.edges) {
        neighborBoost = Math.max(neighborBoost, acts[nb]! * 0.45);
      }

      const targetAct = Math.min(
        1.0,
        Math.max(cursorAct, neighborBoost, flowAct),
      );
      const actSpeed = targetAct > acts[i]! ? 12.0 : 2.0;
      acts[i]! += (targetAct - acts[i]!) * Math.min(actSpeed * delta, 1);
    }

    nodeGeometry.getAttribute("position").needsUpdate = true;

    const nodeActAttr = nodeGeometry.getAttribute("aActivation");
    for (let i = 0; i < nodes.length; i++) {
      (nodeActAttr.array as Float32Array)[i] = acts[i]!;
    }
    nodeActAttr.needsUpdate = true;

    // ── Update edges ──
    const edgePosBuf = edgeGeometry.getAttribute("position")
      .array as Float32Array;
    const edgeActArr = edgeGeometry.getAttribute("aEdgeActivation")
      .array as Float32Array;

    for (let i = 0; i < network.edges.length; i++) {
      const edge = network.edges[i]!;
      const fi = edge.from;
      const ti = edge.to;

      edgePosBuf[i * 6] = curPos[fi * 3]!;
      edgePosBuf[i * 6 + 1] = curPos[fi * 3 + 1]!;
      edgePosBuf[i * 6 + 2] = curPos[fi * 3 + 2]!;
      edgePosBuf[i * 6 + 3] = curPos[ti * 3]!;
      edgePosBuf[i * 6 + 4] = curPos[ti * 3 + 1]!;
      edgePosBuf[i * 6 + 5] = curPos[ti * 3 + 2]!;

      const edgeAct = Math.max(acts[fi]!, acts[ti]!) * 0.9;
      edgeActArr[i * 2] = edgeAct;
      edgeActArr[i * 2 + 1] = edgeAct;
    }

    edgeGeometry.getAttribute("position").needsUpdate = true;
    edgeGeometry.getAttribute("aEdgeActivation").needsUpdate = true;

    // ── Scroll zoom + fade ──
    const diveProgress = Math.min(Math.max(progress / 0.1, 0), 1);
    const easedDive = 1 - Math.pow(1 - diveProgress, 4);
    camera.position.z = 12 - easedDive * 52;

    let targetOpacity = 1.0;
    if (progress > 0.06) {
      targetOpacity = 1.0 - Math.min((progress - 0.06) / 0.04, 1);
    }

    const curOpacity = nodeMat.uniforms.uOpacity!.value as number;
    const newOpacity = curOpacity + (targetOpacity - curOpacity) * 0.25;
    nodeMat.uniforms.uOpacity!.value = newOpacity;
    edgeMat.uniforms.uOpacity!.value = newOpacity;
  });

  return (
    <group>
      <lineSegments geometry={edgeGeometry}>
        <shaderMaterial
          ref={edgeMaterialRef}
          vertexShader={neuralEdgeVertexShader}
          fragmentShader={neuralEdgeFragmentShader}
          uniforms={edgeUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <points geometry={nodeGeometry}>
        <shaderMaterial
          ref={nodeMaterialRef}
          vertexShader={neuralNodeVertexShader}
          fragmentShader={neuralNodeFragmentShader}
          uniforms={nodeUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}
