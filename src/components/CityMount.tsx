"use client";
import { useEffect } from "react";
import { DATA } from "@/content/site";

/* monta la città dopo il primo paint; senza WebGL resta la versione classica */
export function CityMount() {
  useEffect(() => {
    const classic = () => {
      document.body.dataset.mode = "classic";
      document.getElementById("loading")?.remove();
    };
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return classic();
    /* il motore parte quando il browser è libero: prima nome, testi e link */
    const load = () => import("@/city/engine").then(({ mountCity }) => mountCity({ data: DATA })).catch(classic);
    if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout: 1200 });
    else setTimeout(load, 200);
  }, []);
  return null;
}
