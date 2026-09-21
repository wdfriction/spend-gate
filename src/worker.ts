import { createApp, type GateBindings } from "./app.js";

export default {
  fetch(request: Request, env: GateBindings, _ctx: ExecutionContext) {
    return createApp(env).fetch(request, env);
  },
};
