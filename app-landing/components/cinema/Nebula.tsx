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
import { nebulaVertexShader, nebulaFragmentShader } from "./shaders";

interface NebulaProps {
  count: number;
  gpuTier: 1 | 2;
}

export function Nebula({ count, gpuTier: _gpuTier }: NebulaProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const mouseRef = useRef(new Vector2(999, 999));
  const { size, camera } = useThree();

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const offsets = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 * Math.cbrt(Math.random());

      offsets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      offsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      offsets[i * 3 + 2] = r * Math.cos(phi);
      scales[i] = 0.5 + Math.random() * 1.5;
    }

    geo.setAttribute("position", new Float32BufferAttribute(offsets, 3));
    geo.setAttribute("aOffset", new Float32BufferAttribute(offsets, 3));
    geo.setAttribute("aScale", new Float32BufferAttribute(scales, 1));

    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new Vector2(999, 999) },
      uMouseWorld: { value: new Vector3(999, 999, 0) },
      uMouseStrength: { value: 0 },
      uChaos: { value: 0 },
      uColorShift: { value: 0 },
      uOpacity: { value: 1.0 },
      uColorBlue: { value: new Vector3(0.45, 0.55, 0.85) },
      uColorRed: { value: new Vector3(0.75, 0.28, 0.22) },
    }),
    [],
  );

  const targetMouseStrength = useRef(0.6);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const newX = (e.clientX / size.width) * 2 - 1;
      const newY = -(e.clientY / size.height) * 2 + 1;

      // Calculate cursor velocity to augment strength organically
      const dx = newX - mouseRef.current.x;
      const dy = newY - mouseRef.current.y;
      const vel = Math.sqrt(dx * dx + dy * dy);

      // Spike strength on mouse move, clamp it to 1.5
      targetMouseStrength.current = Math.min(
        targetMouseStrength.current + vel * 20.0,
        1.5,
      );

      mouseRef.current.set(newX, newY);
    },
    [size],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [handlePointerMove]);

  useFrame((_state, delta) => {
    const store = useScrollStore.getState();
    const progress = store.progress;

    // GPU IDLE MODE: Skip all WebGL computations when the particle scene
    // is completely scrolled out of view. Massive performance saving.
    if (progress > 0.16) return;

    const mat = materialRef.current;
    if (!mat) return;

    const u = mat.uniforms;

    u.uTime!.value += delta;

    // Smoothly damp mouse NDC position
    (u.uMouse!.value as Vector2).lerp(mouseRef.current, 0.1);

    if (!(camera instanceof PerspectiveCamera)) return;

    // Compute proper world-space mouse position from NDC using camera FOV + aspect
    const smoothMouse = u.uMouse!.value as Vector2;
    const fovRad = (camera.fov * Math.PI) / 180;
    const halfHeight = Math.tan(fovRad / 2) * Math.abs(camera.position.z);
    const aspect = size.width / size.height;
    const mouseWorld = u.uMouseWorld!.value as Vector3;
    mouseWorld.set(
      smoothMouse.x * halfHeight * aspect,
      smoothMouse.y * halfHeight,
      0,
    );

    // Decay target mouse strength back to baseline of 0.6 when mouse stops
    targetMouseStrength.current +=
      (0.6 - targetMouseStrength.current) * 2.0 * delta;
    u.uMouseStrength!.value +=
      (targetMouseStrength.current - (u.uMouseStrength!.value as number)) * 0.1;

    // Hero -> Problem Dive Sequence (0 to 0.10)
    // Camera plunges from Z=12 through the particle field to Z=-40
    // Synced with the 100vh GSAP pin
    const diveProgress = Math.min(Math.max(progress / 0.1, 0), 1);
    // easeOutQuart: dramatic initial burst, smooth deceleration
    const easedDive = 1 - Math.pow(1 - diveProgress, 4);

    camera.position.z = 12 - easedDive * 52;

    // Maintain constant colors (blue) and no chaos.
    u.uColorShift!.value = 0;

    // Fade out particles in sync (0.06 → 0.10)
    let targetOpacity = 1.0;
    if (progress > 0.06) {
      targetOpacity = 1.0 - Math.min(Math.max((progress - 0.06) / 0.04, 0), 1);
    }

    // Fast lerp for opacity to keep it snappy
    if (u.uOpacity) {
      u.uOpacity.value += (targetOpacity - (u.uOpacity.value as number)) * 0.25;
    }

    u.uChaos!.value += (0 - (u.uChaos!.value as number)) * 0.05;
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
