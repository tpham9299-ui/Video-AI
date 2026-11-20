import React, {createContext, useLayoutEffect, useRef} from 'react';
import {AbsoluteFill} from 'remotion';
import * as T from 'three';
import {PhongCanh} from './types';

export const BoiCanh = createContext<PhongCanh | undefined>(undefined);

export function datPhongCanh(scene: T.Scene, set: PhongCanh) {
  scene.background = new T.Color(set.troi);
  scene.fog = new T.FogExp2(set.troi, 0.027);
  const ground = new T.Mesh(
    new T.BoxGeometry(160, 0.16, 100),
    new T.MeshStandardMaterial({color: set.dat}),
  );
  ground.position.y = -0.16;
  scene.add(ground);
  for (const part of set.vat) {
    let shape: T.BufferGeometry;
    switch (part.hinh) {
      case 'hop': shape = new T.BoxGeometry(1, 1, 1); break;
      case 'tru': shape = new T.CylinderGeometry(0.5, 0.5, 1, 28); break;
      case 'non': shape = new T.ConeGeometry(0.5, 1, 28); break;
      case 'cau': shape = new T.SphereGeometry(0.5, 24, 16); break;
    }
    const obj = new T.Mesh(shape, new T.MeshStandardMaterial({color: part.mau, roughness: 0.78}));
    obj.position.set(...part.tam);
    obj.scale.set(...part.co);
    scene.add(obj);
  }
}

// Giữ ảnh phối cảnh xuyên các cảnh toán; trả lại WebGL cho cảnh có vật chuyển động.
export const NenCauChuyen: React.FC<{set: PhongCanh}> = ({set}) => {
  const host = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const renderer = new T.WebGLRenderer({antialias: true});
    renderer.setSize(720, 1280, false);
    const scene = new T.Scene();
    datPhongCanh(scene, set);
    const camera = new T.PerspectiveCamera(48, 9 / 16, 0.1, 160);
    camera.position.set(1, 3, 7);
    camera.lookAt(0, 2, -4);
    scene.add(new T.HemisphereLight('#fff5df', '#76777e', 1.65));
    const light = new T.DirectionalLight('#fff0cd', 2.2);
    light.position.set(-5, 9, 6);
    scene.add(light);
    renderer.render(scene, camera);
    host.current!.getContext('2d')!.drawImage(renderer.domElement, 0, 0);
    scene.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
  }, [set]);
  return <AbsoluteFill>
    <canvas ref={host} width={720} height={1280} style={{width: '100%', height: '100%'}} />
    <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(10,19,27,.76),rgba(12,20,27,.48) 38%,rgba(12,21,29,.52) 68%,rgba(8,15,22,.78))'}} />
  </AbsoluteFill>;
};
