import type { PendingCommand, RespValue } from "./types";

export class RespConnection {
  private readonly socket: {
    write: (chunk: Buffer, cb: (error?: Error | null) => void) => void;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
    end: () => void;
    destroy: () => void;
  };

  private buffer = Buffer.alloc(0);
  private pending: PendingCommand[] = [];

  constructor(socket: RespConnection["socket"]) {
    this.socket = socket;

    this.socket.on("data", (chunk: unknown) => {
      if (!Buffer.isBuffer(chunk) || chunk.length === 0) {
        return;
      }
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.flush();
    });

    this.socket.on("error", (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      this.failAll(err);
    });

    this.socket.on("close", () => {
      if (this.pending.length > 0) {
        this.failAll(new Error("Redis connection closed"));
      }
    });
  }

  async command(
    args: Array<string | number>,
    timeoutMs: number,
  ): Promise<RespValue> {
    return new Promise<RespValue>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removePending(resolve, reject);
        reject(new Error("Redis command timeout"));
      }, timeoutMs);

      this.pending.push({ resolve, reject, timeoutId });

      const payload = encodeRespArray(args);
      this.socket.write(payload, (error?: Error | null) => {
        if (!error) return;

        clearTimeout(timeoutId);
        this.removePending(resolve, reject);
        reject(error);
      });
    });
  }

  close(): void {
    try {
      this.socket.end();
    } finally {
      this.socket.destroy();
    }
  }

  private removePending(
    resolve: PendingCommand["resolve"],
    reject: PendingCommand["reject"],
  ): void {
    this.pending = this.pending.filter(
      (item) => item.resolve !== resolve || item.reject !== reject,
    );
  }

  private flush(): void {
    while (this.pending.length > 0) {
      const parsed = parseRespValue(this.buffer, 0);
      if (!parsed) {
        return;
      }

      this.buffer = this.buffer.subarray(parsed.nextOffset);
      const next = this.pending.shift();
      if (!next) {
        return;
      }

      clearTimeout(next.timeoutId);
      if (parsed.value instanceof Error) {
        next.reject(parsed.value);
      } else {
        next.resolve(parsed.value);
      }
    }
  }

  private failAll(error: Error): void {
    while (this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next) continue;
      clearTimeout(next.timeoutId);
      next.reject(error);
    }
  }
}

function parseRespValue(
  buffer: Buffer,
  offset: number,
): { value: RespValue; nextOffset: number } | null {
  if (offset >= buffer.length) {
    return null;
  }

  const prefix = String.fromCharCode(buffer[offset]);
  const lineEnd = findCrlf(buffer, offset + 1);
  if (lineEnd === -1) {
    return null;
  }

  if (prefix === "+") {
    return {
      value: buffer.subarray(offset + 1, lineEnd).toString("utf8"),
      nextOffset: lineEnd + 2,
    };
  }

  if (prefix === "-") {
    return {
      value: new Error(buffer.subarray(offset + 1, lineEnd).toString("utf8")),
      nextOffset: lineEnd + 2,
    };
  }

  if (prefix === ":") {
    const raw = buffer.subarray(offset + 1, lineEnd).toString("utf8");
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      return {
        value: new Error(`Invalid Redis integer response: ${raw}`),
        nextOffset: lineEnd + 2,
      };
    }

    return {
      value: parsed,
      nextOffset: lineEnd + 2,
    };
  }

  if (prefix === "$") {
    const rawLength = buffer.subarray(offset + 1, lineEnd).toString("utf8");
    const byteLength = Number.parseInt(rawLength, 10);
    if (!Number.isFinite(byteLength)) {
      return {
        value: new Error(`Invalid Redis bulk length: ${rawLength}`),
        nextOffset: lineEnd + 2,
      };
    }

    if (byteLength === -1) {
      return {
        value: null,
        nextOffset: lineEnd + 2,
      };
    }

    const valueStart = lineEnd + 2;
    const valueEnd = valueStart + byteLength;
    if (valueEnd + 2 > buffer.length) {
      return null;
    }

    return {
      value: buffer.subarray(valueStart, valueEnd).toString("utf8"),
      nextOffset: valueEnd + 2,
    };
  }

  if (prefix === "*") {
    const rawLength = buffer.subarray(offset + 1, lineEnd).toString("utf8");
    const elementCount = Number.parseInt(rawLength, 10);
    if (!Number.isFinite(elementCount)) {
      return {
        value: new Error(`Invalid Redis array length: ${rawLength}`),
        nextOffset: lineEnd + 2,
      };
    }

    if (elementCount === -1) {
      return {
        value: null,
        nextOffset: lineEnd + 2,
      };
    }

    let cursor = lineEnd + 2;
    const result: RespValue[] = [];
    for (let i = 0; i < elementCount; i += 1) {
      const nested = parseRespValue(buffer, cursor);
      if (!nested) {
        return null;
      }
      result.push(nested.value);
      cursor = nested.nextOffset;
    }

    return {
      value: result,
      nextOffset: cursor,
    };
  }

  return {
    value: new Error(`Unsupported Redis response prefix: ${prefix}`),
    nextOffset: lineEnd + 2,
  };
}

function findCrlf(buffer: Buffer, start: number): number {
  for (let i = start; i < buffer.length - 1; i += 1) {
    if (buffer[i] === 13 && buffer[i + 1] === 10) {
      return i;
    }
  }
  return -1;
}

function encodeRespArray(args: Array<string | number>): Buffer {
  const parts: string[] = [`*${args.length}\r\n`];

  for (const arg of args) {
    const value = String(arg);
    parts.push(`$${Buffer.byteLength(value, "utf8")}\r\n${value}\r\n`);
  }

  return Buffer.from(parts.join(""), "utf8");
}

export function toNumber(value: RespValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toStringValue(value: RespValue): string | null {
  return typeof value === "string" ? value : null;
}
