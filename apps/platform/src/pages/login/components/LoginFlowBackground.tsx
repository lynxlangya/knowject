import { FLOW_MASK_IMAGE, FLOW_MESH_CONFIG } from '@pages/login/constants';
import { useFlowMesh } from '@pages/login/useFlowMesh';

export const LoginFlowBackground = () => {
  const { canvasRef } = useFlowMesh(FLOW_MESH_CONFIG);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-90 max-[960px]:opacity-55 max-[560px]:hidden"
      style={{ maskImage: FLOW_MASK_IMAGE }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
};
