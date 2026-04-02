import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- CONFIGURACIÓN ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const TOWER_COST = 50;
const PATH = [
  { x: 0, y: 225 }, { x: 200, y: 225 }, { x: 200, y: 100 },
  { x: 500, y: 100 }, { x: 500, y: 350 }, { x: 840, y: 350 },
];

class Enemy {
  constructor(wave) {
    this.x = PATH[0].x;
    this.y = PATH[0].y;
    this.maxHp = 50 + (wave * 20);
    this.hp = this.maxHp;
    this.speed = 1.2 + (wave * 0.1);
    this.pathIndex = 0;
    this.dead = false;
    this.reachedEnd = false;
  }

  update() {
    if (this.pathIndex >= PATH.length - 1) {
      this.reachedEnd = true;
      return;
    }
    const target = PATH[this.pathIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed) {
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  draw(ctx) {
    // Cuerpo
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fill();
    // Barra de vida
    ctx.fillStyle = "#374151";
    ctx.fillRect(this.x - 10, this.y - 15, 20, 3);
    ctx.fillStyle = "#10b981";
    ctx.fillRect(this.x - 10, this.y - 15, (this.hp / this.maxHp) * 20, 3);
  }
}

class Tower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.range = 150;
    this.cooldown = 0;
  }

  draw(ctx) {
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
    // Rango visual (opcional/sutil)
    ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export default function BasicTowerDefense() {
  const canvasRef = useRef(null);
  const [gold, setGold] = useState(200);
  const [health, setHealth] = useState(10);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  
  const enemiesRef = useRef([]);
  const towersRef = useRef([]);
  const requestRef = useRef();

  const spawnWave = useCallback(() => {
    const newEnemies = Array.from({ length: 5 + wave }, (_, i) => {
      const e = new Enemy(wave);
      e.x -= i * 60; // Espaciado entre enemigos
      return e;
    });
    enemiesRef.current = [...enemiesRef.current, ...newEnemies];
  }, [wave]);

  const update = useCallback(() => {
    if (health <= 0) { setGameOver(true); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Limpiar fondo
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar Camino
    ctx.lineWidth = 40;
    ctx.strokeStyle = "#374151";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    PATH.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Torres y Disparos
    towersRef.current.forEach(tower => {
      tower.draw(ctx);
      if (tower.cooldown > 0) tower.cooldown--;
      if (tower.cooldown === 0) {
        const target = enemiesRef.current.find(e => 
          Math.hypot(e.x - tower.x, e.y - tower.y) < tower.range && !e.dead
        );
        if (target) {
          target.hp -= 20;
          tower.cooldown = 30;
          // Efecto visual de disparo
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tower.x, tower.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      }
    });

    // Enemigos
    enemiesRef.current.forEach(enemy => {
      enemy.update();
      enemy.draw(ctx);
      if (enemy.hp <= 0) {
        enemy.dead = true;
        setGold(g => g + 15);
      }
      if (enemy.reachedEnd) {
        setHealth(h => h - 1);
        enemy.dead = true;
      }
    });

    enemiesRef.current = enemiesRef.current.filter(e => !e.dead);

    // Siguiente Ola
    if (enemiesRef.current.length === 0 && !gameOver) {
      setWave(w => w + 1);
      spawnWave();
    }
    
    requestRef.current = requestAnimationFrame(update);
  }, [health, gameOver, spawnWave]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  const placeTower = (e) => {
    if (gold < TOWER_COST || gameOver) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    towersRef.current.push(new Tower(x, y));
    setGold(g => g - TOWER_COST);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-mono">
      <div className="flex gap-8 mb-4 bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-xl">
        <div className="text-center">
          <p className="text-xs text-gray-400">ORO</p>
          <p className="text-2xl font-bold text-yellow-400">{gold}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">VIDAS</p>
          <p className="text-2xl font-bold text-red-500">{health}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">OLA</p>
          <p className="text-2xl font-bold text-blue-400">{wave}</p>
        </div>
      </div>

      <div className="relative border-4 border-gray-700 rounded-lg overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={placeTower}
          className="bg-gray-900 cursor-crosshair"
        />
        
        {gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center">
            <h2 className="text-5xl font-bold text-red-600 mb-4">GAME OVER</h2>
            <button 
              onClick={() => window.location.reload()}
              className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition"
            >
              REINTENTAR
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-4 text-gray-500 text-sm italic">
        Haz clic en el mapa para construir una torre ({TOWER_COST} oro)
      </p>
    </div>
  );
}