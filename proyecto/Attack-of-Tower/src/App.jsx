import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- CONFIGURACIÓN TÉCNICA BASE ---
// El Canvas mantendrá su lógica interna de 800x450
const BASE_WIDTH = 800;
const BASE_HEIGHT = 450;
const TOWER_COST = 100;
const PATH_WIDTH = 45;
const PATH = [
  { x: 0, y: 225 }, { x: 200, y: 225 }, { x: 200, y: 100 },
  { x: 500, y: 100 }, { x: 500, y: 350 }, { x: 840, y: 350 },
];

// Lógica de colisión con el camino (mejorada para mayor precisión)
const isPositionOnPath = (x, y) => {
  for (let i = 0; i < PATH.length - 1; i++) {
    const p1 = PATH[i];
    const p2 = PATH[i + 1];
    const l2 = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
    let t = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const dist = Math.hypot(x - (p1.x + t * (p2.x - p1.x)), y - (p1.y + t * (p2.y - p1.y)));
    if (dist < PATH_WIDTH / 1.5) return true; // Ajuste de precisión
  }
  return false;
};

// --- CLASES DE LÓGICA (ACTUALIZADAS CON ESTILO NEÓN) ---
class Enemy {
  constructor(wave) {
    this.x = PATH[0].x;
    this.y = PATH[0].y;
    this.maxHp = 100 * Math.pow(1.3, wave - 1); // Dificultad exponencial
    this.hp = this.maxHp;
    this.speed = 1.6 + (wave * 0.2); 
    this.pathIndex = 0;
    this.dead = false;
    this.reachedEnd = false;
  }

  update() {
    if (this.pathIndex >= PATH.length - 1) { this.reachedEnd = true; return; }
    const target = PATH[this.pathIndex + 1];
    const dx = target.x - this.x; const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.speed) { this.pathIndex++; } 
    else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
  }

  draw(ctx) {
    ctx.save();
    // Brillo exterior (Glow)
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#f43f5e"; // Carmesí brillante

    // Núcleo del enemigo
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Barra de salud estilizada
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.roundRect(this.x - 12, this.y - 18, 24, 4, 2); ctx.fill();
    ctx.fillStyle = "#22c55e";
    ctx.roundRect(this.x - 12, this.y - 18, (this.hp / this.maxHp) * 24, 4, 2); ctx.fill();
    ctx.restore();
  }
}

class Tower {
  constructor(x, y) {
    this.x = x; this.y = y; this.range = 140; this.cooldown = 0;
  }
  draw(ctx, time) {
    const pulse = Math.sin(time / 200) * 2;
    ctx.save();
    // Brillo exterior (Glow)
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#fbbf24"; // Dorado brillante

    // Base de la torre
    ctx.fillStyle = "#475569"; ctx.beginPath(); ctx.roundRect(this.x - 18, this.y - 10, 36, 25, 4); ctx.fill();
    
    // Gema mágica superior
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.arc(this.x, this.y - 20 + pulse, 6, 0, Math.PI * 2); ctx.fill();
    
    // Rango visual sutil
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(251, 191, 36, 0.1)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// --- COMPONENTE PRINCIPAL (RESPONSIVO Y ESTILIZADO) ---
export default function CyberTowerDefense() {
  const canvasRef = useRef(null);
  const [gold, setGold] = useState(250);
  const [health, setHealth] = useState(10);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [error, setError] = useState("");

  const enemiesRef = useRef([]);
  const towersRef = useRef([]);
  const requestRef = useRef();

  // Lógica de Responsividad (getCanvasCoords recalcula el clic según el tamaño visual)
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const spawnWave = useCallback(() => {
    const count = 5 + wave * 2; // Olas progresivamente más grandes
    const newEnemies = Array.from({ length: count }, (_, i) => {
      const e = new Enemy(wave); e.x -= i * 100; return e;
    });
    enemiesRef.current = [...enemiesRef.current, ...newEnemies];
  }, [wave]);

  const update = useCallback((time) => {
    if (health <= 0) { setGameOver(true); return; }
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Renderizado del Campo de Batalla (Textura de esmeralda oscura)
    ctx.fillStyle = "#064e3b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujo del camino (con sombras internas)
    ctx.shadowBlur = 0; ctx.lineWidth = PATH_WIDTH; ctx.strokeStyle = "#1e293b"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(PATH[0].x, PATH[0].y); PATH.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
    
    ctx.lineWidth = PATH_WIDTH - 10; ctx.strokeStyle = "#334155"; ctx.stroke();

    // Torres y Láseres (Añadido efecto neón al disparo)
    towersRef.current.forEach(tower => {
      tower.draw(ctx, time);
      if (tower.cooldown > 0) tower.cooldown--;
      if (tower.cooldown === 0) {
        const target = enemiesRef.current.find(e => Math.hypot(e.x - tower.x, e.y - tower.y) < tower.range && !e.dead);
        if (target) {
          target.hp -= 35; tower.cooldown = 40; // Daño y velocidad de disparo
          // Efecto de Rayo Láser (Cian brillante)
          ctx.save();
          ctx.shadowBlur = 15; ctx.shadowColor = "#fbbf24";
          ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(tower.x, tower.y - 20); ctx.lineTo(target.x, target.y); ctx.stroke();
          ctx.strokeStyle = "white"; ctx.lineWidth = 1; ctx.stroke(); // Núcleo blanco
          ctx.restore();
        }
      }
    });

    // Enemigos
    enemiesRef.current.forEach(enemy => { 
      enemy.update(); enemy.draw(ctx);
      if (enemy.hp <= 0) { enemy.dead = true; setGold(g => g + 25); } // Recompensa reducida
      if (enemy.reachedEnd) { setHealth(h => h - 1); enemy.dead = true; }
    });

    enemiesRef.current = enemiesRef.current.filter(e => !e.dead);
    if (enemiesRef.current.length === 0 && !gameOver) { setWave(w => w + 1); spawnWave(); }
    requestRef.current = requestAnimationFrame(update);
  }, [health, gameOver, spawnWave]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  const handleInteraction = (e) => {
    if (gold < TOWER_COST || gameOver) return;
    const { x, y } = getCanvasCoords(e);

    // Validación de camino (hardcore: no se puede construir en absoluto)
    if (isPositionOnPath(x, y)) {
      setError("ZONA PROHIBIDA");
      setTimeout(() => setError(""), 1500); // Borra el error automáticamente
      return;
    }

    towersRef.current.push(new Tower(x, y));
    setGold(g => g - TOWER_COST);
  };

  return (
    <div className="w-full min-h-screen bg-[#020617] flex flex-col items-center p-3 sm:p-6 font-sans text-slate-200">
      
      {/* PANEL SUPERIOR CLASSY GLASSMORPHISM */}
      <div className="w-full max-w-4xl grid grid-cols-3 gap-2 mb-6 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-4 sm:p-5 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center border-r border-slate-700/50">
          <span className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Oro</span>
          <span className="text-xl sm:text-3xl font-black text-amber-500 tabular-nums shadow-[0_0_20px_rgba(245,158,11,0.3)]">{gold}</span>
        </div>
        <div className="flex flex-col items-center border-r border-slate-700/50">
          <span className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Integridad</span>
          <span className="text-xl sm:text-3xl font-black text-rose-500 tabular-nums shadow-[0_0_20px_rgba(244,63,94,0.3)]">{health}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Sector</span>
          <span className="text-xl sm:text-3xl font-black text-sky-400 tabular-nums shadow-[0_0_20px_rgba(56,189,248,0.3)]">{wave}</span>
        </div>
      </div>

      {/* CAMPO DE BATALLA: ELEVADO Y RESPONSIVO */}
      <div className="relative w-full max-w-4xl aspect-[16/9] bg-slate-800 rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border-2 border-slate-800 ring-4 ring-slate-900 ring-inset">
        <canvas
          ref={canvasRef}
          width={BASE_WIDTH}
          height={BASE_HEIGHT}
          onClick={handleInteraction}
          className="w-full h-full object-contain cursor-crosshair bg-[#064e3b] shadow-inner"
        />

        {/* Notificación de Error */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-600/90 text-white px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest animate-in fade-in zoom-in">
            ¡ZONA PROHIBIDA!
          </div>
        )}

        {/* Pantalla de Derrota */}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 rounded-2xl animate-in fade-in duration-700">
            <h2 className="text-5xl sm:text-7xl font-black text-rose-600 italic tracking-tighter drop-shadow-lg">SISTEMA CAÍDO</h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-10 uppercase tracking-[0.5em] font-medium">Sobreviviste {wave} días</p>
            <button onClick={() => window.location.reload()} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-12 py-4 rounded-full font-black uppercase text-base hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)]">
              Reiniciar Protocolo
            </button>
          </div>
        )}
      </div>

      {/* PANEL INFERIOR: TUTORIAL */}
      <div className="mt-8 px-6 py-3 bg-slate-900/30 backdrop-blur-sm rounded-full border border-slate-800 shadow-xl flex items-center gap-4">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]"></div>
          <p className="text-slate-500 text-[11px] sm:text-xs text-center uppercase tracking-[0.2em] font-bold">
            Toca el terreno para desplegar defensa <span className="text-amber-400 ml-1">[{TOWER_COST} NÚCLEOS]</span>
          </p>
      </div>
    </div>
  );
}