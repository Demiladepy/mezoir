import "./polyfills";
import { Buffer } from "buffer";
import process from "process";
import { StrictMode } from "react";

window.Buffer = Buffer;
window.process = process;
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
