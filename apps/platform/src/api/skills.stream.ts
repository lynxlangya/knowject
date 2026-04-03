import {
  ApiError,
  extractApiErrorPayload,
  LOCALE_HEADER,
} from '@knowject/request';
import { getToken } from '@app/auth/token';
import { getClientLocale, handleUnauthorized } from './client';
import type {
  SkillAuthoringTurnRequest,
  SkillAuthoringTurnResponse,
  SkillAuthoringTurnStreamEvent,
  SkillAuthoringTurnStreamEventType,
} from './skills';

const STREAM_RESPONSE_CONTENT_TYPE = 'text/event-stream';

interface StreamSkillAuthoringTurnOptions {
  signal?: AbortSignal;
}

const buildSkillAuthoringTurnStreamPath = (): string => {
  return '/api/skills/authoring/turns/stream';
};

const normalizeSseBuffer = (buffer: string): string => {
  return buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const splitSseFrames = (
  buffer: string,
): {
  frames: string[];
  remainder: string;
} => {
  const frames: string[] = [];
  let normalizedBuffer = buffer;
  let separatorIndex = normalizedBuffer.indexOf('\n\n');

  while (separatorIndex >= 0) {
    frames.push(normalizedBuffer.slice(0, separatorIndex));
    normalizedBuffer = normalizedBuffer.slice(separatorIndex + 2);
    separatorIndex = normalizedBuffer.indexOf('\n\n');
  }

  return {
    frames,
    remainder: normalizedBuffer,
  };
};

const parseSseFrameData = (frame: string): string | null => {
  const dataLines = frame
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line && !line.startsWith(':'))
    .flatMap((line) => {
      if (!line.startsWith('data:')) {
        return [];
      }

      return [line.slice(5).trimStart()];
    });

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join('\n');
};

const parseStreamEvent = (payload: string): SkillAuthoringTurnStreamEvent => {
  let parsedEvent: unknown;

  try {
    parsedEvent = JSON.parse(payload);
  } catch (error) {
    throw new ApiError(
      'Skill authoring 流返回了无法解析的事件数据',
      502,
      'SKILL_AUTHORING_STREAM_INVALID_EVENT',
      error,
    );
  }

  if (
    !parsedEvent ||
    typeof parsedEvent !== 'object' ||
    !('version' in parsedEvent) ||
    !('type' in parsedEvent) ||
    !('sequence' in parsedEvent)
  ) {
    throw new ApiError(
      'Skill authoring 流事件缺少必要字段',
      502,
      'SKILL_AUTHORING_STREAM_INVALID_EVENT',
      parsedEvent,
    );
  }

  const eventType = (parsedEvent as { type?: unknown }).type;
  const supportedEventTypes = new Set<SkillAuthoringTurnStreamEventType>([
    'ack',
    'done',
    'error',
  ]);

  if (
    typeof eventType !== 'string' ||
    !supportedEventTypes.has(eventType as SkillAuthoringTurnStreamEventType)
  ) {
    throw new ApiError(
      'Skill authoring 流返回了未知事件类型',
      502,
      'SKILL_AUTHORING_STREAM_INVALID_EVENT',
      parsedEvent,
    );
  }

  return parsedEvent as SkillAuthoringTurnStreamEvent;
};

export const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

const buildStreamApiError = async (
  response: Response,
  fallbackMessage: string,
): Promise<ApiError> => {
  const requestId = response.headers.get('x-request-id') ?? undefined;
  const contentType = response.headers.get('content-type') ?? '';
  let responseBody: unknown = null;

  try {
    responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  } catch {
    responseBody = null;
  }

  const payload = extractApiErrorPayload(responseBody, {
    message: fallbackMessage,
    requestId,
  });

  return new ApiError(
    payload.message,
    response.status,
    payload.code,
    payload.detail,
    payload.requestId,
  );
};

export const streamSkillAuthoringTurn = async (
  payload: SkillAuthoringTurnRequest,
  options: StreamSkillAuthoringTurnOptions = {},
): Promise<SkillAuthoringTurnResponse> => {
  const token = getToken();
  const locale = getClientLocale();
  const response = await fetch(buildSkillAuthoringTurnStreamPath(), {
    method: 'POST',
    headers: {
      accept: STREAM_RESPONSE_CONTENT_TYPE,
      'content-type': 'application/json',
      ...(locale ? { [LOCALE_HEADER]: locale } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    throw await buildStreamApiError(
      response,
      '发送 Skill authoring 流请求失败，请稍后重试',
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes(STREAM_RESPONSE_CONTENT_TYPE)) {
    throw await buildStreamApiError(
      response,
      'Skill authoring 流返回了非预期响应格式',
    );
  }

  if (!response.body) {
    throw new ApiError(
      'Skill authoring 流未返回可读取的数据流',
      502,
      'SKILL_AUTHORING_STREAM_EMPTY_BODY',
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let doneTurn: SkillAuthoringTurnResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += normalizeSseBuffer(decoder.decode(value, { stream: true }));
      const { frames, remainder } = splitSseFrames(buffer);
      buffer = remainder;

      for (const frame of frames) {
        const payloadText = parseSseFrameData(frame);

        if (!payloadText) {
          continue;
        }

        const event = parseStreamEvent(payloadText);

        if (event.type === 'done') {
          doneTurn = event.turn;
          continue;
        }

        if (event.type === 'error') {
          throw new ApiError(event.message, event.status, event.code, {
            retryable: event.retryable,
          });
        }
      }
    }

    const tailPayload = parseSseFrameData(
      normalizeSseBuffer(buffer + decoder.decode()),
    );

    if (tailPayload) {
      const event = parseStreamEvent(tailPayload);

      if (event.type === 'done') {
        doneTurn = event.turn;
      } else if (event.type === 'error') {
        throw new ApiError(event.message, event.status, event.code, {
          retryable: event.retryable,
        });
      }
    }

    if (!doneTurn) {
      throw new ApiError(
        'Skill authoring 流在返回结果前已结束',
        502,
        'SKILL_AUTHORING_STREAM_INCOMPLETE',
      );
    }

    return doneTurn;
  } finally {
    try {
      await reader.cancel();
      reader.releaseLock();
    } catch {
      // Ignore stream teardown errors during cleanup.
    }
  }
};
