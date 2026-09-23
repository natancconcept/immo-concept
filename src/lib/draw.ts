/* Illustrations avant / après dessinées (provisoires), reprises de la maquette.
   Elles ne servent que lorsqu'aucune photo n'est fournie. */
import type { RoomKind } from "../data/gallery";

function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 } }

export function drawRoom(cv: HTMLCanvasElement, after: boolean, kind: RoomKind, seed: number) {
  const ctx = cv.getContext("2d")!, W = cv.width, H = cv.height, R = rng(seed);
  const floorY = H * 0.7;
  // mur
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  if (after) { wall.addColorStop(0, "#FBFCFE"); wall.addColorStop(1, "#EEF3F9") } else { wall.addColorStop(0, "#B9AE95"); wall.addColorStop(1, "#A39679") }
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, floorY);
  if (!after) { // taches et fissures
    for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(80,62,35,${0.05 + R() * 0.1})`; ctx.beginPath(); ctx.ellipse(R() * W, R() * floorY * 0.9, 30 + R() * 90, 20 + R() * 60, R() * 3, 0, 7); ctx.fill() }
    ctx.strokeStyle = "rgba(60,45,25,.55)"; ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) { let x = R() * W, y = R() * floorY * 0.5; ctx.beginPath(); ctx.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (R() - .4) * 50; y += 20 + R() * 30; ctx.lineTo(x, y) } ctx.stroke() }
  }
  // sol
  if (after) {
    ctx.fillStyle = "#E4D2B0"; ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = "rgba(140,105,60,.22)"; ctx.lineWidth = 2;
    for (let y = floorY; y < H; y += 26) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      for (let x = (y / 26 % 2) * 110; x < W; x += 220) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 26); ctx.stroke() }
    }
  } else {
    for (let y = floorY, r = 0; y < H; y += 40, r++) for (let x = 0, c = 0; x < W; x += 40, c++) {
      ctx.fillStyle = (r + c) % 2 ? "#8A7355" : "#B5A07C"; ctx.fillRect(x, y, 40, 40);
      if (R() < .08) { ctx.fillStyle = "#5E4B33"; ctx.fillRect(x + 4, y + 4, 32, 32) }
    }
  }
  // plinthe
  ctx.fillStyle = after ? "#FFFFFF" : "#6E5B40"; ctx.fillRect(0, floorY - 10, W, 10);
  // fenêtre
  const wx = W * 0.06, wy = H * 0.12, ww = after ? W * 0.3 : W * 0.2, wh = after ? H * 0.46 : H * 0.3;
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  if (after) { sky.addColorStop(0, "#5FA8F5"); sky.addColorStop(1, "#CFE6FD") } else { sky.addColorStop(0, "#8C97A0"); sky.addColorStop(1, "#B3B8B8") }
  ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);
  if (after) { // horizon et mer
    ctx.fillStyle = "#2F7FD8"; ctx.fillRect(wx, wy + wh * 0.72, ww, wh * 0.28);
    ctx.fillStyle = "#F4E7C8"; for (let i = 0; i < 5; i++) { const bx = wx + 10 + i * ww / 5, bh = 30 + ((i * 37) % 50); ctx.fillRect(bx, wy + wh * 0.72 - bh, ww / 6, bh) }
  }
  ctx.strokeStyle = after ? "#FFFFFF" : "#5B4E3C"; ctx.lineWidth = after ? 14 : 10; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = after ? 8 : 6; ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
  if (!after) { ctx.lineWidth = 4; for (let x = wx + 18; x < wx + ww; x += 24) { ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, wy + wh); ctx.stroke() } }
  // meuble principal
  const cx = W * 0.44, cw = W * 0.52;
  if (kind === "kitchen") {
    const top = floorY - H * 0.26;
    ctx.fillStyle = after ? "#6DB4F2" : "#7A5A3A"; ctx.fillRect(cx, top, cw, H * 0.26 - 10);
    ctx.fillStyle = after ? "#FFFFFF" : "#9C8B6E"; ctx.fillRect(cx - 8, top - 16, cw + 16, 18);
    ctx.strokeStyle = after ? "rgba(255,255,255,.25)" : "rgba(40,25,10,.6)"; ctx.lineWidth = 3;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx + cw * i / 4, top + 6); ctx.lineTo(cx + cw * i / 4, floorY - 16); ctx.stroke() }
    ctx.fillStyle = after ? "#DDE8F6" : "#C8B89A"; for (let i = 0; i < 4; i++) ctx.fillRect(cx + cw * i / 4 + cw / 8 - 14, top + 26, 28, 5);
    if (after) {
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cx, top - H * 0.3, cw, 10); ctx.fillRect(cx, top - H * 0.18, cw, 10);
      ctx.fillStyle = "#6DB4F2"; ctx.fillRect(cx + 40, top - H * 0.3 - 46, 40, 46); ctx.fillStyle = "#F2C14E"; ctx.beginPath(); ctx.arc(cx + cw - 80, top - H * 0.18 - 22, 22, 0, 7); ctx.fill();
      ctx.fillStyle = "#2E8B57"; ctx.beginPath(); ctx.ellipse(cx + cw - 170, top - H * 0.3 - 30, 16, 30, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "#6A4E33"; ctx.fillRect(cx + cw * 0.1, top - H * 0.3, cw * 0.55, H * 0.2); ctx.strokeStyle = "rgba(30,20,10,.6)"; ctx.strokeRect(cx + cw * 0.1, top - H * 0.3, cw * 0.275, H * 0.2); ctx.strokeRect(cx + cw * 0.375, top - H * 0.3, cw * 0.275, H * 0.2);
    }
  } else if (kind === "living") {
    const sy = floorY - H * 0.2;
    if (after) {
      ctx.fillStyle = "#DCE7F5"; ctx.fillRect(cx, sy, cw, H * 0.14); ctx.fillRect(cx, sy - H * 0.1, cw, H * 0.12);
      ctx.fillStyle = "#6DB4F2"; ctx.fillRect(cx + 30, sy - 30, 90, 70); ctx.fillRect(cx + cw - 120, sy - 30, 90, 70);
      ctx.fillStyle = "#C9A56A"; ctx.fillRect(cx + 20, floorY - 12, 14, 12); ctx.fillRect(cx + cw - 34, floorY - 12, 14, 12);
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cx + cw * 0.2, H * 0.12, cw * 0.6, H * 0.24); ctx.fillStyle = "#9CC6F6"; ctx.fillRect(cx + cw * 0.2 + 14, H * 0.12 + 14, cw * 0.6 - 28, H * 0.24 - 28);
      ctx.fillStyle = "#2F7FD8"; ctx.beginPath(); ctx.moveTo(cx + cw * 0.2 + 14, H * 0.36 - 14); ctx.lineTo(cx + cw * 0.5, H * 0.2); ctx.lineTo(cx + cw * 0.8 - 14, H * 0.36 - 14); ctx.fill();
    } else {
      ctx.fillStyle = "#7B6A55"; ctx.fillRect(cx + cw * 0.1, floorY - H * 0.12, cw * 0.35, H * 0.12);
      ctx.fillStyle = "#5E4B33"; ctx.fillRect(cx + cw * 0.6, floorY - H * 0.4, cw * 0.3, H * 0.4);
      ctx.strokeStyle = "#2A2118"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + cw * 0.4, 0); ctx.lineTo(cx + cw * 0.42, H * 0.25); ctx.lineTo(cx + cw * 0.3, H * 0.3); ctx.stroke();
    }
  } else { // salle de bain
    const tile = after ? 60 : 30;
    for (let y = H * 0.2; y < floorY - 10; y += tile) for (let x = cx; x < cx + cw; x += tile) {
      ctx.fillStyle = after ? "#F4F8FC" : ((x / tile + y / tile) % 2 < 1 ? "#9FB39A" : "#B7C2A6"); ctx.fillRect(x, y, tile - 2, tile - 2);
      if (!after && R() < .1) { ctx.fillStyle = "#6C7A64"; ctx.fillRect(x, y, tile - 2, tile - 2) }
    }
    if (after) {
      ctx.fillStyle = "#6DB4F2"; ctx.fillRect(cx + cw * 0.08, floorY - H * 0.2, cw * 0.4, H * 0.12); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cx + cw * 0.08, floorY - H * 0.22, cw * 0.4, 16);
      ctx.fillStyle = "#DDE8F6"; ctx.fillRect(cx + cw * 0.14, H * 0.24, cw * 0.28, H * 0.2); ctx.strokeStyle = "#C9A56A"; ctx.lineWidth = 6; ctx.strokeRect(cx + cw * 0.14, H * 0.24, cw * 0.28, H * 0.2);
      ctx.fillStyle = "rgba(180,215,245,.5)"; ctx.fillRect(cx + cw * 0.6, H * 0.2, 6, floorY - H * 0.2 - 10);
    } else {
      ctx.fillStyle = "#E8E3D5"; ctx.beginPath(); ctx.ellipse(cx + cw * 0.3, floorY - H * 0.2, cw * 0.14, H * 0.05, 0, 0, 7); ctx.fill(); ctx.fillRect(cx + cw * 0.28, floorY - H * 0.2, cw * 0.04, H * 0.2 - 10);
      ctx.fillStyle = "rgba(120,95,40,.35)"; ctx.fillRect(cx + cw * 0.55, H * 0.55, cw * 0.3, floorY - H * 0.55 - 10);
    }
  }
  // lampe
  if (after) {
    ctx.strokeStyle = "#1F3A5A"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + cw * 0.5, 0); ctx.lineTo(cx + cw * 0.5, H * 0.08); ctx.stroke(); ctx.fillStyle = "#1F3A5A"; ctx.beginPath(); ctx.moveTo(cx + cw * 0.5 - 40, H * 0.12); ctx.lineTo(cx + cw * 0.5 + 40, H * 0.12); ctx.lineTo(cx + cw * 0.5 + 14, H * 0.08); ctx.lineTo(cx + cw * 0.5 - 14, H * 0.08); ctx.fill();
    ctx.fillStyle = "#2E8B57"; ctx.beginPath(); ctx.ellipse(W * 0.36, floorY - 60, 26, 60, -.2, 0, 7); ctx.fill(); ctx.ellipse(W * 0.38, floorY - 70, 20, 50, .4, 0, 7); ctx.fill(); ctx.fillStyle = "#FFFFFF"; ctx.fillRect(W * 0.34, floorY - 30, 50, 30);
  } else {
    ctx.strokeStyle = "#2A2118"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5, H * 0.14); ctx.stroke(); ctx.fillStyle = "#FFF3C0"; ctx.beginPath(); ctx.arc(W * 0.5, H * 0.15, 12, 0, 7); ctx.fill();
  }
  // éclairage
  const g = ctx.createRadialGradient(W * 0.2, H * 0.3, 20, W * 0.5, H * 0.5, W * 0.8);
  if (after) { g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(1, "rgba(255,255,255,0)") } else { g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(20,12,0,.38)") }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/** Dessine toutes les toiles `canvas[data-room]` de la page (attributs data-kind, data-seed, data-after). */
export function drawAllRooms(root: ParentNode = document) {
  root.querySelectorAll<HTMLCanvasElement>("canvas[data-room]:not([data-drawn])").forEach((cv) => {
    drawRoom(cv, cv.dataset.after === "1", cv.dataset.kind as RoomKind, +cv.dataset.seed!);
    cv.dataset.drawn = "1";
  });
}
