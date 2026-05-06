/** Base URL for the FastAPI agent (must match uvicorn, e.g. port 8001). */
export const AGENT_URL =
  process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8001";
