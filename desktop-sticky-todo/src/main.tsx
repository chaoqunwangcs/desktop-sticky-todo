import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { WidgetApp } from "./WidgetApp";
import "./index.css";

async function main() {
  const label = await getCurrentWindow().label;

  // Set data attribute so CSS can style each window differently.
  document.body.setAttribute("data-window", label);

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      {label === "widget" ? <WidgetApp /> : <App />}
    </React.StrictMode>,
  );
}

void main();
