import { EventEmitter } from 'node:events';

declare global {
  var __auditLogEmitter: EventEmitter | undefined;
}

const emitter = globalThis.__auditLogEmitter ?? new EventEmitter();
emitter.setMaxListeners(0); // one listener per connected SSE client
globalThis.__auditLogEmitter = emitter;

export { emitter as auditLogEmitter };
