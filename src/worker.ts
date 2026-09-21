import { createApp, type GateBindings } from "./app.js";

const app = createApp();

export default {
  fetch(request: Request, env: GateBindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
