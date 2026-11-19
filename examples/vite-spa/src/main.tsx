import { render } from "solid-js/web";
import { App } from "./app.tsx";
import "./app.css";

const root = document.getElementById("app");
if (!root) throw new Error("Missing application root");
render(() => <App />, root);
