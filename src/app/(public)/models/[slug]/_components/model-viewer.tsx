"use client";

import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/**
 * Renders the parsed STL geometry and fits the camera to it. Auto-fit runs
 * BEFORE `OrbitControls` captures its own reset baseline (this component is
 * a sibling declared before `<OrbitControls>` under the same `<Canvas>`, so
 * its mount effect runs first) — see `onFit` below for the case where
 * `OrbitControls` already mounted first because of Suspense.
 */
function StlMesh({ url, onFit }: { url: string; onFit: () => void }) {
  const geometry = useLoader(STLLoader, url);
  const { camera } = useThree();

  useEffect(() => {
    geometry.center();
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const radius = geometry.boundingSphere?.radius || 1;
    const distance = Math.max(radius * 2.8, 2);

    camera.position.set(distance, distance * 0.6, distance);
    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 20;
    camera.lookAt(0, 0, 0);
    if ("updateProjectionMatrix" in camera) {
      camera.updateProjectionMatrix();
    }

    // `<StlMesh>` is inside a `<Suspense>` boundary and only mounts once the
    // STL has actually loaded — `<OrbitControls>` (outside Suspense) mounts
    // immediately and saves ITS OWN reset baseline before this runs. Re-save
    // now so "reset view" restores the fitted camera, not the pre-fit one.
    onFit();
  }, [geometry, camera, onFit]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#DF5936" roughness={0.45} metalness={0.05} />
    </mesh>
  );
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function ErrorMessage({ text }: { text: string }) {
  return <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-danger">{text}</div>;
}

/**
 * Lazy-loaded 3D preview (ТЗ §18) — only ever imported via `next/dynamic`
 * with `ssr: false` from `Gallery`, and only mounted once the visitor picks
 * the "3D" thumbnail, so the WebGL/three.js bundle never ships to a page
 * load that doesn't need it.
 *
 * Loads the STL through a short-lived signed URL fetched from
 * `/api/models/[slug]/viewer-url` (private `models/` storage prefix — see
 * `@modules/models`'s `getModelViewerSource`), never the raw storage key.
 */
export function ModelViewer({ slug }: { slug: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/models/${encodeURIComponent(slug)}/viewer-url`)
      .then((response) => {
        if (!response.ok) throw new Error("viewer url request failed");
        return response.json() as Promise<{ url: string }>;
      })
      .then((data) => {
        if (!cancelled) setUrl(data.url);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить 3D-модель");
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleFit = useCallback(() => {
    controlsRef.current?.saveState();
  }, []);

  const handleReset = useCallback(() => {
    controlsRef.current?.reset();
  }, []);

  if (error) {
    return <ErrorMessage text={error} />;
  }

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-ink-muted">
        Загрузка 3D-просмотра…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ViewerErrorBoundary fallback={<ErrorMessage text="Не удалось отобразить 3D-модель" />}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} shadows dpr={[1, 2]}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 8, 5]} intensity={0.9} castShadow />
          <directionalLight position={[-5, -3, -5]} intensity={0.25} />
          <Suspense fallback={null}>
            <StlMesh url={url} onFit={handleFit} />
          </Suspense>
          <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate makeDefault />
        </Canvas>
      </ViewerErrorBoundary>

      <button
        type="button"
        onClick={handleReset}
        className="absolute bottom-3 right-3 rounded-control bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-card transition-colors hover:bg-white"
      >
        Сбросить вид
      </button>
    </div>
  );
}
