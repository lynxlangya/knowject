import { Fragment } from 'react';
import {
  FLOW_MASK_IMAGE,
  FLOW_SEGMENTS,
  FLOW_SPARK_POINTS,
  FLOW_VIEWBOX_HEIGHT,
  FLOW_VIEWBOX_WIDTH,
  LEFT_HUB,
  RIGHT_HUB,
  toPercent,
} from '@pages/login/constants';

const HUB_POINTS = [LEFT_HUB, RIGHT_HUB] as const;

const basePathClassName =
  'fill-none stroke-[rgba(40,184,160,0.2)] stroke-[1.35] [stroke-linecap:round]';
const chargePathClassName =
  'flow-anim fill-none stroke-[url(#knowject-flow-charge)] stroke-[2.2] [stroke-dasharray:20_180] [stroke-linecap:round] [filter:drop-shadow(0_0_5px_rgba(40,184,160,0.55))] animate-[flowMove_linear_infinite]';
const hubCoreClassName =
  'flow-anim absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#f0fdfb_0%,#86E3D0_70%,rgba(134,227,208,0)_100%)] shadow-[0_0_18px_rgba(40,184,160,0.55),0_0_34px_rgba(40,184,160,0.28)] animate-[hubPulse_2.8s_ease-in-out_infinite]';
const hubRingClassName =
  'flow-anim absolute h-[94px] w-[94px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C2EDE6]/45 animate-[ringPulse_3.2s_ease-out_infinite]';
const sparkClassName =
  'flow-anim absolute h-1.5 w-1.5 rounded-full bg-[#86E3D0] shadow-[0_0_10px_rgba(40,184,160,0.55)]';

export const LoginFlowBackground = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-90 max-[960px]:opacity-55 max-[560px]:hidden"
      style={{ maskImage: FLOW_MASK_IMAGE }}
      aria-hidden="true"
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${FLOW_VIEWBOX_WIDTH} ${FLOW_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="knowject-flow-charge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#28B8A0" stopOpacity="0.04" />
            <stop offset="62%" stopColor="#35C4AC" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#D1F7F2" stopOpacity="1" />
          </linearGradient>
        </defs>

        {FLOW_SEGMENTS.map((segment) => (
          <path key={`base-${segment.d}`} d={segment.d} className={basePathClassName} />
        ))}

        {FLOW_SEGMENTS.map((segment) => (
          <path
            key={`charge-${segment.d}`}
            d={segment.d}
            className={chargePathClassName}
            style={{
              animationDuration: segment.duration,
              animationDelay: segment.delay,
            }}
          />
        ))}
      </svg>

      {HUB_POINTS.map((point, index) => {
        const positionStyle = {
          left: toPercent(point.x, FLOW_VIEWBOX_WIDTH),
          top: toPercent(point.y, FLOW_VIEWBOX_HEIGHT),
        };

        return (
          <Fragment key={`hub-${index}`}>
            <span className={hubCoreClassName} style={positionStyle} />
            <span className={hubRingClassName} style={positionStyle} />
          </Fragment>
        );
      })}

      {FLOW_SPARK_POINTS.map((spark, index) => (
        <span
          key={`spark-${index}`}
          className={sparkClassName}
          style={{ left: spark.left, top: spark.top, animation: `${spark.animation} ${spark.duration} ease-in-out infinite` }}
        />
      ))}
    </div>
  );
};
