import { EventEmitter } from "node:events";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type { Response } from "express";
import { writeSseChunk } from "./projects.router.js";

class MockStreamResponse extends EventEmitter {
  writableEnded = false;
  destroyed = false;

  constructor(private readonly writeResult: boolean) {
    super();
  }

  write(_chunk: string): boolean {
    return this.writeResult;
  }
}

test("writeSseChunk resolves after drain when a buffered write succeeds", async () => {
  const response = new MockStreamResponse(false);
  const writePromise = writeSseChunk(
    response as unknown as Response,
    "data: hello\n\n",
  );

  queueMicrotask(() => {
    response.emit("drain");
  });

  await writePromise;
});

test("writeSseChunk resolves when the client disconnects before drain", async () => {
  const response = new MockStreamResponse(false);
  const writePromise = writeSseChunk(
    response as unknown as Response,
    "data: hello\n\n",
  );

  queueMicrotask(() => {
    response.destroyed = true;
    response.emit("close");
  });

  await Promise.race([
    writePromise,
    delay(50).then(() => {
      throw new Error("writeSseChunk should not hang after close");
    }),
  ]);
});
