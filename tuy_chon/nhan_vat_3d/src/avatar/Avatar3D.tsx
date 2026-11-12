import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRM, VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm';
import {QDON} from './quat';
import {tinhTuThe} from './poses';
import {XUONG} from './skeleton';
import {CanhNhe, tinhMay, tinhTrangThai} from './thoiGian';

export const RONG_NV = 640;
export const CAO_NV = 760;

// Phóng to đầu nhân vật (1 = nguyên bản). 1.2-1.3 giúp khuôn mặt dễ thương và biểu cảm rõ hơn trên màn hình điện thoại.
const TI_LE_DAU = 1.25;

const BIEU_CAM = ['happy', 'sad', 'relaxed', 'surprised', 'angry', 'blink', 'aa', 'ih', 'ou', 'ee', 'oh'];

type Chung = {url: string; canh: CanhNhe[]; tongFrame: number; onLoi: () => void};

// Nhân vật VRM bên trong khung 3D. Mọi chuyển động là hàm của số khung hình (tinhTuThe/tinhTrangThai),
// không dùng mô phỏng vật lý (tóc, vải đứng yên) để các khung hình dựng song song vẫn khớp nhau tuyệt đối.
const VrmNhanVat: React.FC<Chung> = ({url, canh, tongFrame, onLoi}) => {
  const frame = useCurrentFrame();
  const {gl, scene, camera} = useThree();
  const nhom = useRef<any>(null);
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [handle] = useState(() => delayRender('Đang tải nhân vật VRM'));
  const hipsY = useRef(0.95);

  useEffect(() => {
    let huy = false;
    const loader = new GLTFLoader();
    loader.register((p: any) => new VRMLoaderPlugin(p));
    loader.load(
      staticFile(url),
      (gltf: any) => {
        if (huy) return;
        const v: VRM | undefined = gltf.userData && gltf.userData.vrm;
        if (!v) {
          onLoi();
          continueRender(handle);
          return;
        }
        VRMUtils.rotateVRM0(v); // mô hình VRM 0.x quay mặt về +Z như VRM 1.0
        v.scene.traverse((o: any) => {
          o.frustumCulled = false;
        });
        const hips = v.humanoid.getNormalizedBoneNode('hips');
        if (hips) hipsY.current = hips.position.y;
        const dauTho = v.humanoid.getRawBoneNode('head');
        if (dauTho) dauTho.scale.setScalar(TI_LE_DAU); // xương thô: xương chuẩn hóa không truyền tỉ lệ
        setVrm(v);
        continueRender(handle);
      },
      undefined,
      (e: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Không tải được VRM', e);
        onLoi();
        continueRender(handle);
      }
    );
    return () => {
      huy = true;
    };
  }, [url]);

  useLayoutEffect(() => {
    if (!vrm) return;
    const tt = tinhTrangThai(canh, frame, tongFrame);
    const kq = tinhTuThe(tt.dauVao);
    const h = vrm.humanoid;
    for (const x of XUONG) {
      const n = h.getNormalizedBoneNode(x as any);
      if (!n) continue;
      const q = kq.goc[x] || QDON;
      n.quaternion.set(q[0], q[1], q[2], q[3]);
    }
    const hips = h.getNormalizedBoneNode('hips');
    if (hips) hips.position.y = hipsY.current + kq.hipsLech[1];
    for (const k of Object.keys(kq.ngon)) {
      const n = h.getNormalizedBoneNode(k as any);
      const q = kq.ngon[k];
      if (n && q) n.quaternion.set(q[0], q[1], q[2], q[3]);
    }
    const may = tinhMay(canh, frame, tongFrame);
    camera.position.set(may.cx, may.ty, may.dist);
    camera.lookAt(may.cx, may.ty, 0);
    (camera as any).updateProjectionMatrix();
    if (nhom.current) {
      nhom.current.position.set(tt.x, 0, 0);
      nhom.current.rotation.set(0, tt.yaw, 0);
    }
    const em = vrm.expressionManager;
    if (em) for (const k of BIEU_CAM) em.setValue(k, kq.bieuCam[k] || 0);
    h.update();
    if (em) em.update();
    gl.render(scene, camera); // vẽ ngay để chắc chắn khung hình có hình mới trước khi Remotion chụp
  }, [vrm, frame, canh, tongFrame]);

  if (!vrm) return null;
  return (
    <group ref={nhom}>
      <primitive object={vrm.scene} />
    </group>
  );
};

class BocLoi extends React.Component<{onLoi: () => void; children?: React.ReactNode}, {loi: boolean}> {
  state = {loi: false};
  static getDerivedStateFromError() {
    return {loi: true};
  }
  componentDidCatch() {
    this.props.onLoi();
  }
  render() {
    return this.state.loi ? null : this.props.children;
  }
}

// Khung 3D trong suốt đặt ở góc dưới bên phải màn hình, nhân vật đi vào, đứng nói, chỉ tay, rồi đi ra.
export const Avatar3D: React.FC<{url: string; canh: CanhNhe[]; tongFrame: number; onLoi: () => void; hienBongDen?: boolean}> = ({
  url, canh, tongFrame, onLoi, hienBongDen,
}) => {
  const frame = useCurrentFrame();
  const tt = tinhTrangThai(canh, frame, tongFrame);
  const sang = 0.28 + 0.16 * tt.dauVao.bienDo;
  return (
    <div style={{position: 'absolute', right: 0, bottom: 380, width: RONG_NV, height: CAO_NV, pointerEvents: 'none'}}>
      {/* hào quang sau lưng nhân vật: tách nhân vật khỏi nền, sáng lên theo giọng nói */}
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 48% at 50% 46%, rgba(77,208,225,${sang}) 0%, rgba(255,126,182,${sang * 0.45}) 45%, rgba(0,0,0,0) 72%)`}} />
      <BocLoi onLoi={onLoi}>
        <ThreeCanvas
          width={RONG_NV}
          height={CAO_NV}
          style={{backgroundColor: 'transparent'}}
          camera={{fov: 28, near: 0.1, far: 30, position: [0, 1.13, 2.85]}}
          gl={{alpha: true, antialias: true}}
        >
          {/* Ánh sáng kiểu hoạt hình: một đèn chính ấm từ phía trước-trên-trái, một đèn viền lạnh phía sau, ánh sáng nền nhẹ để còn thấy mảng đổ bóng */}
          <ambientLight intensity={0.55} color="#dfe8ff" />
          <directionalLight position={[0.8, 1.6, 2.2]} intensity={Math.PI * 0.85} color="#fff1e0" />
          <directionalLight position={[-2.2, 1.2, -1.8]} intensity={1.4} color="#8fb8ff" />
          <VrmNhanVat url={url} canh={canh} tongFrame={tongFrame} onLoi={onLoi} />
        </ThreeCanvas>
      </BocLoi>
      {hienBongDen ? (
        <div style={{position: 'absolute', left: RONG_NV * 0.52, top: 10, fontSize: 96, filter: 'drop-shadow(0 8px 20px rgba(255,213,74,0.7))'}}>💡</div>
      ) : null}
    </div>
  );
};
