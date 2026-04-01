import { FLOW_MASK_IMAGE, PARTICLE_NETWORK_CONFIG } from '@pages/login/constants';
import { useParticleNetwork } from '@pages/login/useParticleNetwork';

export const LoginFlowBackground = () => {
  const { canvasRef } = useParticleNetwork(PARTICLE_NETWORK_CONFIG);

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
