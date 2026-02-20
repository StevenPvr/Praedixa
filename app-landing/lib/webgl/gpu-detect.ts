export type GpuTier = 0 | 1 | 2;

export function detectGpuTier(): GpuTier {
  if (typeof window === "undefined") return 0;

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return 0;

    const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (maxTexture < 4096) return 0;

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
      !/(iPad|Macintosh).*Safari/i.test(navigator.userAgent);

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string)
      : "";

    const isAppleSilicon = /Apple M/i.test(renderer);
    const isDedicated =
      /NVIDIA|AMD|Radeon|GeForce/i.test(renderer) || isAppleSilicon;

    canvas.remove();

    if (isMobile && !isAppleSilicon) return 1;
    if (maxTexture >= 8192 && isDedicated) return 2;
    if (maxTexture >= 4096) return 1;
    return 0;
  } catch {
    return 0;
  }
}
