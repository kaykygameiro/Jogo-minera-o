import React, { useEffect, useRef, useState } from 'react';
import { Gem, Bomb, Zap, Heart } from 'lucide-react';
import { soundEngine } from './utils/audio';

type CellType = 'EMPTY' | 'DIRT' | 'WALL' | 'ROCK' | 'DIAMOND' | 'PLAYER' | 'ENEMY_BUG' | 'ENEMY_FUZZY' | 'DYNAMITE' | 'BOMB' | 'EXPLOSION';

interface Cell {
  type: CellType;
  falling: boolean;
  timer: number;
  updatedThisTick: boolean;
  dir: number;
}

const TILE_SIZE = 32;
const WIDTH = 30;
const HEIGHT = 20;
const TICK_RATE = 90;

const preRenderedTiles: Record<string, HTMLCanvasElement> = {};

const getTile = (type: string, timer: number = 0) => {
  const key = type === 'EXPLOSION' ? `${type}_${timer % 2}` : type;
  if (preRenderedTiles[key]) return preRenderedTiles[key];

  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d')!;

  if (type === 'EMPTY') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  } else if (type === 'DIRT') {
    ctx.fillStyle = '#cc3300';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(4, 4, 8, 4);
    ctx.fillRect(20, 8, 6, 6);
    ctx.fillRect(8, 20, 10, 4);
    ctx.fillRect(24, 24, 4, 4);
  } else if (type === 'WALL') {
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.fillStyle = '#ccccff';
    ctx.fillRect(6, 6, TILE_SIZE - 12, TILE_SIZE - 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 10, TILE_SIZE - 20, TILE_SIZE - 20);
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 8); ctx.lineTo(14, 14);
    ctx.moveTo(24, 8); ctx.lineTo(18, 14);
    ctx.moveTo(8, 24); ctx.lineTo(14, 18);
    ctx.moveTo(24, 24); ctx.lineTo(18, 18);
    ctx.stroke();
  } else if (type === 'ROCK') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Base shape (irregular octagon)
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(24, 2);
    ctx.lineTo(30, 8);
    ctx.lineTo(30, 24);
    ctx.lineTo(24, 30);
    ctx.lineTo(8, 30);
    ctx.lineTo(2, 24);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();

    // Highlight (top-left edge)
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(24, 2);
    ctx.lineTo(20, 6);
    ctx.lineTo(6, 6);
    ctx.lineTo(6, 20);
    ctx.lineTo(2, 24);
    ctx.lineTo(2, 8);
    ctx.closePath();
    ctx.fill();

    // Shadow (bottom-right edge)
    ctx.fillStyle = '#404040';
    ctx.beginPath();
    ctx.moveTo(30, 8);
    ctx.lineTo(30, 24);
    ctx.lineTo(24, 30);
    ctx.lineTo(8, 30);
    ctx.lineTo(12, 26);
    ctx.lineTo(26, 26);
    ctx.lineTo(26, 12);
    ctx.closePath();
    ctx.fill();

    // Texture/Craters
    ctx.fillStyle = '#505050';
    ctx.fillRect(10, 10, 6, 4);
    ctx.fillRect(20, 14, 4, 6);
    ctx.fillRect(12, 20, 6, 4);
    
    ctx.fillStyle = '#A0A0A0';
    ctx.fillRect(10, 14, 6, 2);
    ctx.fillRect(20, 20, 4, 2);
    ctx.fillRect(12, 24, 6, 2);
    ctx.fillRect(16, 8, 4, 4);
  } else if (type === 'DIAMOND') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#008800';
    ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(30, 16); ctx.lineTo(16, 30); ctx.lineTo(2, 16); ctx.fill();
    ctx.fillStyle = '#00cc00';
    ctx.beginPath(); ctx.moveTo(16, 6); ctx.lineTo(26, 16); ctx.lineTo(16, 26); ctx.lineTo(6, 16); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(16, 10); ctx.lineTo(20, 14); ctx.lineTo(16, 18); ctx.lineTo(12, 14); ctx.fill();
  } else if (type === 'PLAYER') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#ffcc99'; ctx.fillRect(12, 8, 8, 8);
    ctx.fillStyle = '#cc0000'; ctx.fillRect(10, 4, 12, 4); ctx.fillRect(12, 2, 8, 2);
    ctx.fillStyle = '#0000cc'; ctx.fillRect(10, 16, 12, 8);
    ctx.fillStyle = '#00aa00'; ctx.fillRect(10, 24, 12, 6);
    ctx.fillStyle = '#663300'; ctx.fillRect(8, 30, 6, 2); ctx.fillRect(18, 30, 6, 2);
    ctx.fillStyle = '#663300'; ctx.fillRect(22, 12, 2, 12);
    ctx.fillStyle = '#aaaaaa'; ctx.fillRect(20, 10, 6, 2);
  } else if (type === 'ENEMY_BUG') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#0000cc';
    ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 12, 4, 4); ctx.fillRect(18, 12, 4, 4);
    ctx.fillStyle = '#000000'; ctx.fillRect(12, 14, 2, 2); ctx.fillRect(20, 14, 2, 2);
    ctx.fillStyle = '#0000cc'; ctx.fillRect(4, 16, 4, 2); ctx.fillRect(24, 16, 4, 2);
  } else if (type === 'ENEMY_FUZZY') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#cc0000'; ctx.fillRect(6, 6, 20, 20);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 10, 4, 4); ctx.fillRect(18, 10, 4, 4);
  } else if (type === 'DYNAMITE') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#cc0000'; ctx.fillRect(12, 8, 8, 20);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(14, 4, 4, 4);
  } else if (type === 'BOMB') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#444444';
    ctx.beginPath(); ctx.arc(16, 18, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(20, 4); ctx.stroke();
  } else if (type === 'EXPLOSION') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = timer % 2 === 0 ? '#ff4400' : '#ffff00';
    ctx.beginPath(); ctx.arc(16, 16, 16, 0, Math.PI * 2); ctx.fill();
  }

  preRenderedTiles[key] = canvas;
  return canvas;
};

const LEVELS = [
  // Level 1: Introduction
  [
    "##############################",
    "#P.......*...O....#..........#",
    "#..O...#...O......#...*......#",
    "#..*...#...O......#...O......#",
    "#......#...O......#..........#",
    "#......#..........#..........#",
    "#......############..........#",
    "#............................#",
    "#...B........................#",
    "#...................F........#",
    "##############################",
    "#............................#",
    "#..O..O..O..O..O..O..O..O....#",
    "#..*..*..*..*..*..*..*..*....#",
    "#............................#",
    "#...######################...#",
    "#...#....................#...#",
    "#...#..*..*..*..*..*..*..#...#",
    "#...#....................#...#",
    "##############################"
  ],
  // Level 2: The Dig
  [
    "##############################",
    "#P...........................#",
    "#.O.O.O.O.O.O.O.O.O.O.O.O.O..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "#............................#",
    "#######################......#",
    "#.....................#......#",
    "#.B..B..B..B..B..B....#......#",
    "#.....................#......#",
    "#.....................#......#",
    "#......#######################",
    "#......#.....................#",
    "#......#..O..O..O..O..O..O...#",
    "#......#..*..*..*..*..*..*...#",
    "#......#.....................#",
    "#......#..F..F..F..F..F..F...#",
    "#......#.....................#",
    "#......#.....................#",
    "##############################"
  ],
  // Level 3: Corridors
  [
    "##############################",
    "#P.......#..........#........#",
    "#.O.O.O..#..O.O.O...#..O.O.O.#",
    "#.*.*.*..#..*.*.*...#..*.*.*.#",
    "#........#..........#........#",
    "#######..#..######..#..#######",
    "#........#..........#........#",
    "#.B......#..F.......#..B.....#",
    "#........#..........#........#",
    "##############################",
    "#........#..........#........#",
    "#.O.O.O..#..O.O.O...#..O.O.O.#",
    "#.*.*.*..#..*.*.*...#..*.*.*.#",
    "#........#..........#........#",
    "#######..#..######..#..#######",
    "#........#..........#........#",
    "#.F......#..B.......#..F.....#",
    "#........#..........#........#",
    "#........#..........#........#",
    "##############################"
  ],
  // Level 4: Rock Fall
  [
    "##############################",
    "#P...........................#",
    "#.OOOOOOOOOOOOOOOOOOOOOOOOO..#",
    "#............................#",
    "#.*************************..#",
    "#............................#",
    "#.OOOOOOOOOOOOOOOOOOOOOOOOO..#",
    "#............................#",
    "#.*************************..#",
    "#............................#",
    "#.OOOOOOOOOOOOOOOOOOOOOOOOO..#",
    "#............................#",
    "#.*************************..#",
    "#............................#",
    "#.OOOOOOOOOOOOOOOOOOOOOOOOO..#",
    "#............................#",
    "#.*************************..#",
    "#............................#",
    "#............................#",
    "##############################"
  ],
  // Level 5: Bug Infestation
  [
    "##############################",
    "#P...........................#",
    "#.B.B.B.B.B.B.B.B.B.B.B.B.B..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "#............................#",
    "#.B.B.B.B.B.B.B.B.B.B.B.B.B..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "#............................#",
    "#.B.B.B.B.B.B.B.B.B.B.B.B.B..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "#............................#",
    "#.B.B.B.B.B.B.B.B.B.B.B.B.B..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "#............................#",
    "#............................#",
    "##############################"
  ],
  // Level 6: Maze
  [
    "##############################",
    "#P.#.......#.......#.........#",
    "#.O#.*.###.#.O.###.#.*.#####.#",
    "#..#...#...#...#...#...#...#.#",
    "#.######.#######.#######.#.#.#",
    "#......#.#.....#.#.....#.#.#.#",
    "######.#.#.###.#.#.###.#.#.#.#",
    "#*...#.#.#.#*#.#.#.#*#.#.#.#.#",
    "#.##.#.#.#.#.#.#.#.#.#.#.#.#.#",
    "#.#..#...#...#...#...#...#...#",
    "#.##########################.#",
    "#............................#",
    "#.##########################.#",
    "#.#..O...#...O...#...O...#...#",
    "#.##.###.#.#####.#.#####.#.###",
    "#*...#...#.....#.#.....#.#...#",
    "######.#######.#.#######.###.#",
    "#......#.......#.......#.....#",
    "#.*.####.*.#####.*.#####.*.###",
    "##############################"
  ],
  // Level 7: Fuzzy Logic
  [
    "##############################",
    "#P...........................#",
    "#.F.F.F.F.F.F.F.F.F.F.F.F.F..#",
    "#............................#",
    "#.O.O.O.O.O.O.O.O.O.O.O.O.O..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "#............................#",
    "#.F.F.F.F.F.F.F.F.F.F.F.F.F..#",
    "#............................#",
    "#.O.O.O.O.O.O.O.O.O.O.O.O.O..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "#............................#",
    "#.F.F.F.F.F.F.F.F.F.F.F.F.F..#",
    "#............................#",
    "#.O.O.O.O.O.O.O.O.O.O.O.O.O..#",
    "#............................#",
    "#.*.*.*.*.*.*.*.*.*.*.*.*.*..#",
    "##############################"
  ],
  // Level 8: The Vault
  [
    "##############################",
    "#P...........................#",
    "#.##########################.#",
    "#.#************************#.#",
    "#.#*OOOOOOOOOOOOOOOOOOOOOO*#.#",
    "#.#*O....................O*#.#",
    "#.#*O.##################.O*#.#",
    "#.#*O.#****************#.O*#.#",
    "#.#*O.#*OOOOOOOOOOOOOO*#.O*#.#",
    "#.#*O.#*O............O*#.O*#.#",
    "#.#*O.#*O.##########.O*#.O*#.#",
    "#.#*O.#*O.#********#.O*#.O*#.#",
    "#.#*O.#*O.#*OOOOOO*#.O*#.O*#.#",
    "#.#*O.#*O.#*O....O*#.O*#.O*#.#",
    "#.#*O.#*O.#*O.BB.O*#.O*#.O*#.#",
    "#.#*O.#*O.#*O....O*#.O*#.O*#.#",
    "#.#*O.#*O.#*OOOOOO*#.O*#.O*#.#",
    "#.#*O.#*O.#********#.O*#.O*#.#",
    "#.#*O.#*O.##########.O*#.O*#.#",
    "##############################"
  ],
  // Level 9: Chaos
  [
    "##############################",
    "#P..O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "#...O..*..B..O..*..F..O..*...#",
    "#.##########################.#",
    "##############################"
  ],
  // Level 10: The Core
  [
    "##############################",
    "#P...........................#",
    "#.OOOOOOOOOOOOOOOOOOOOOOOOO..#",
    "#.O***********************O..#",
    "#.O*OOOOOOOOOOOOOOOOOOOOO*O..#",
    "#.O*O*******************O*O..#",
    "#.O*O*OOOOOOOOOOOOOOOOO*O*O..#",
    "#.O*O*O***************O*O*O..#",
    "#.O*O*O*OOOOOOOOOOOOO*O*O*O..#",
    "#.O*O*O*O***********O*O*O*O..#",
    "#.O*O*O*O*OOOOOOOOO*O*O*O*O..#",
    "#.O*O*O*O*O*******O*O*O*O*O..#",
    "#.O*O*O*O*O*OOOOO*O*O*O*O*O..#",
    "#.O*O*O*O*O*O***O*O*O*O*O*O..#",
    "#.O*O*O*O*O*O*B*O*O*O*O*O*O..#",
    "#.O*O*O*O*O*O***O*O*O*O*O*O..#",
    "#.O*O*O*O*O*OOOOO*O*O*O*O*O..#",
    "#.O*O*O*O*O*******O*O*O*O*O..#",
    "#.O*O*O*O*OOOOOOOOO*O*O*O*O..#",
    "##############################"
  ]
];

const generateLevel = (levelIndex: number) => {
  const grid: Cell[][] = [];
  let startX = 1;
  let startY = 1;
  const levelData = LEVELS[levelIndex % LEVELS.length];
  for (let y = 0; y < HEIGHT; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < WIDTH; x++) {
      let type: CellType = 'DIRT';
      const char = levelData[y] ? levelData[y][x] : '.';
      
      if (char === '#') type = 'WALL';
      else if (char === 'O') type = 'ROCK';
      else if (char === '*') type = 'DIAMOND';
      else if (char === 'P') {
        type = 'PLAYER';
        startX = x;
        startY = y;
      }
      else if (char === 'B') type = 'ENEMY_BUG';
      else if (char === 'F') type = 'ENEMY_FUZZY';
      else if (char === ' ') type = 'EMPTY';
      else if (char === '.') type = 'DIRT';
      
      row.push({ type, falling: false, timer: 0, updatedThisTick: false, dir: Math.floor(Math.random() * 4) });
    }
    grid.push(row);
  }
  return { grid, startX, startY };
};

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hudState, setHudState] = useState({
    score: 0,
    diamonds: 0,
    lives: 3,
    dynamite: 5,
    bombs: 3,
    level: 0,
    gameOver: false
  });

  const initialLevel = generateLevel(0);
  const gameState = useRef({
    
    grid: initialLevel.grid,
    playerX: initialLevel.startX,
    playerY: initialLevel.startY,
    inputQueue: [] as string[],
    lastTick: 0,
    isDead: false,
    score: 0,
    diamonds: 0,
    lives: 3,
    dynamite: 5,
    bombs: 3,
    level: 0,
    explosiveUnderPlayer: null as { type: 'DYNAMITE' | 'BOMB', timer: number } | null,
    gameOver: false
  });
  const keysPressed = useRef<Set<string>>(new Set());


  // Sync ref to state for HUD updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHudState({
        score: gameState.current.score,
        diamonds: gameState.current.diamonds,
        lives: gameState.current.lives,
        dynamite: gameState.current.dynamite,
        bombs: gameState.current.bombs,
        level: gameState.current.level,
        gameOver: gameState.current.gameOver
      });
    }, 100);
    return () => clearInterval(interval);
    const keysPressed = useRef<Set<string>>(new Set());

  }, []);




useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    soundEngine.init();
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'b'].includes(k)) {
      e.preventDefault();
      keysPressed.current.add(k);
    }
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    keysPressed.current.delete(e.key.toLowerCase());
  };
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const draw = () => {
      const grid = gameState.current.grid;
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          const cell = grid[y][x];
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;
          if (cell.type === 'PLAYER' && gameState.current.explosiveUnderPlayer) {
            const expTile = getTile(gameState.current.explosiveUnderPlayer.type, gameState.current.explosiveUnderPlayer.timer);
            ctx.drawImage(expTile, px, py);
          }
          const tile = getTile(cell.type, cell.timer);
          ctx.drawImage(tile, px, py);
        }
      }
    };

const processInput = () => {
  const state = gameState.current;
  const grid = state.grid;
  const keys = keysPressed.current;
  
  if (state.isDead) return;

  let dx = 0;
  let dy = 0;

  // Movimento contínuo baseado nas teclas seguradas
  if (keys.has('arrowup') || keys.has('w')) dy = -1;
  else if (keys.has('arrowdown') || keys.has('s')) dy = 1;
  else if (keys.has('arrowleft') || keys.has('a')) dx = -1;
  else if (keys.has('arrowright') || keys.has('d')) dx = 1;

  // Lógica de Dinamite e Bomba
  if (keys.has(' ') && state.dynamite > 0 && !state.explosiveUnderPlayer) {
    if (grid[state.playerY][state.playerX].type === 'PLAYER') {
       state.explosiveUnderPlayer = { type: 'DYNAMITE', timer: 20 };
       state.dynamite--;
    }
  }

  if (keys.has('b') && state.bombs > 0 && !state.explosiveUnderPlayer) {
     state.explosiveUnderPlayer = { type: 'BOMB', timer: 30 };
     state.bombs--;
  }

  if (dx !== 0 || dy !== 0) {
    const nx = state.playerX + dx;
    const ny = state.playerY + dy;

    if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT) {
      const target = grid[ny][nx];
      
      // Move player
      if (target.type === 'EMPTY' || target.type === 'DIRT' || target.type === 'DIAMOND') {
        if (target.type === 'DIAMOND') {
          soundEngine.diamond();
          state.diamonds++;
          state.score += 100;
        } else if (target.type === 'DIRT') {
          soundEngine.dig();
        } else {
          soundEngine.move();
        }
        
        grid[ny][nx] = { type: 'PLAYER', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
        
        if (grid[state.playerY][state.playerX].type === 'PLAYER') {
           if (state.explosiveUnderPlayer) {
             grid[state.playerY][state.playerX] = { type: state.explosiveUnderPlayer.type, falling: false, timer: state.explosiveUnderPlayer.timer, updatedThisTick: true, dir: 0 };
             state.explosiveUnderPlayer = null;
           } else {
             grid[state.playerY][state.playerX] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
           }
        }
        state.playerX = nx;
        state.playerY = ny;
      } 
      // Push rock
      else if (target.type === 'ROCK' && dy === 0) {
        const nnx = nx + dx;
        if (nnx >= 0 && nnx < WIDTH && grid[ny][nnx].type === 'EMPTY') {
          grid[ny][nnx] = { type: 'ROCK', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
          grid[ny][nx] = { type: 'PLAYER', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
          
          if (grid[state.playerY][state.playerX].type === 'PLAYER') {
             if (state.explosiveUnderPlayer) {
               grid[state.playerY][state.playerX] = { type: state.explosiveUnderPlayer.type, falling: false, timer: state.explosiveUnderPlayer.timer, updatedThisTick: true, dir: 0 };
               state.explosiveUnderPlayer = null;
             } else {
               grid[state.playerY][state.playerX] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
             }
          }
          state.playerX = nx;
          state.playerY = ny;
        }
      }
    }
  }
};

    const tick = () => {
      const state = gameState.current;
      const grid = state.grid;

      // Reset updated flag
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          grid[y][x].updatedThisTick = false;
        }
      }

      processInput();

      let playerAlive = false;
      let diamondsLeft = 0;

      // Process explosive under player
      if (state.explosiveUnderPlayer) {
        state.explosiveUnderPlayer.timer--;
        if (state.explosiveUnderPlayer.timer <= 0) {
          soundEngine.explosion();
          grid[state.playerY][state.playerX] = { type: 'EXPLOSION', falling: false, timer: 5, updatedThisTick: true, dir: 0 };
          const radius = state.explosiveUnderPlayer.type === 'DYNAMITE' ? 1 : 2;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = state.playerY + dy;
              const nx = state.playerX + dx;
              if (ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH) {
                if (grid[ny][nx].type !== 'WALL') {
                  grid[ny][nx] = { type: 'EXPLOSION', falling: false, timer: 5, updatedThisTick: true, dir: 0 };
                }
              }
            }
          }
          state.explosiveUnderPlayer = null;
        }
      }

     // Process physics bottom to top
      for (let y = HEIGHT - 1; y >= 0; y--) {
        for (let x = 0; x < WIDTH; x++) {
          const cell = grid[y][x];

          // 1. DETECTAR O PLAYER PRIMEIRO (Para evitar Game Over injusto)
          if (cell.type === 'PLAYER') {
            playerAlive = true;
            state.playerX = x;
            state.playerY = y;
          }

          // 2. CONTAR DIAMANTES
          if (cell.type === 'DIAMOND') diamondsLeft++;

          // 3. PULAR SE JÁ FOI ATUALIZADO (Aqui é onde o loop parava antes)
          if (cell.updatedThisTick) continue;

          // 4. LÓGICA DE QUEDA (PEDRAS E DIAMANTES)
          if (cell.type === 'ROCK' || cell.type === 'DIAMOND') {
            if (y < HEIGHT - 1) {
              const below = grid[y + 1][x];
              if (below.type === 'EMPTY') {
                grid[y + 1][x] = { ...cell, falling: true, updatedThisTick: true };
                grid[y][x] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
              } else if (cell.falling && (below.type === 'PLAYER' || below.type === 'ENEMY_BUG' || below.type === 'ENEMY_FUZZY')) {
                // Crush
                soundEngine.explosion();
                grid[y + 1][x] = { type: 'EXPLOSION', falling: false, timer: 5, updatedThisTick: true, dir: 0 };
                grid[y][x] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
              } else if (below.type === 'ROCK' || below.type === 'DIAMOND' || below.type === 'WALL') {
                if (cell.falling && cell.type === 'ROCK') soundEngine.rockFall();
                cell.falling = false;
                // Roll left
                if (x > 0 && grid[y][x - 1].type === 'EMPTY' && grid[y + 1][x - 1].type === 'EMPTY') {
                  grid[y][x - 1] = { ...cell, falling: true, updatedThisTick: true };
                  grid[y][x] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
                }
                // Roll right
                else if (x < WIDTH - 1 && grid[y][x + 1].type === 'EMPTY' && grid[y + 1][x + 1].type === 'EMPTY') {
                  grid[y][x + 1] = { ...cell, falling: true, updatedThisTick: true };
                  grid[y][x] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
                }
              } else {
                cell.falling = false;
              }
            } else {
              cell.falling = false;
            }
          } else if (cell.type === 'EXPLOSION') {
            cell.timer--;
            if (cell.timer <= 0) {
              grid[y][x] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
            }
            cell.updatedThisTick = true;
          } else if (cell.type === 'DYNAMITE' || cell.type === 'BOMB') {
            cell.timer--;
            if (cell.timer <= 0) {
              soundEngine.explosion();
              const radius = cell.type === 'DYNAMITE' ? 1 : 2;
              for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                  const ny = y + dy;
                  const nx = x + dx;
                  if (ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH) {
                    if (grid[ny][nx].type !== 'WALL') {
                      grid[ny][nx] = { type: 'EXPLOSION', falling: false, timer: 5, updatedThisTick: true, dir: 0 };
                    }
                  }
                }
              }
            }
            cell.updatedThisTick = true;
          } else if (cell.type === 'ENEMY_BUG' || cell.type === 'ENEMY_FUZZY') {
            const dirs = [
              { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
            ];
            let nx = x + dirs[cell.dir].dx;
            let ny = y + dirs[cell.dir].dy;

            if (ny >= 0 && ny < HEIGHT && nx >= 0 && nx < WIDTH && (grid[ny][nx].type === 'EMPTY' || grid[ny][nx].type === 'PLAYER')) {
              if (grid[ny][nx].type === 'PLAYER') {
                soundEngine.playerDeath();
              }
              grid[ny][nx] = { ...cell, updatedThisTick: true };
              grid[y][x] = { type: 'EMPTY', falling: false, timer: 0, updatedThisTick: true, dir: 0 };
            } else {
              cell.dir = (cell.dir + 1) % 4;
              cell.updatedThisTick = true;
            }
          }
        }
      }

      if (diamondsLeft === 0 && !state.isDead && !state.gameOver) {
        state.level++;
        const newLevel = generateLevel(state.level);
        state.grid = newLevel.grid;
        state.playerX = newLevel.startX;
        state.playerY = newLevel.startY;
        state.explosiveUnderPlayer = null;
        state.dynamite += 3;
        state.bombs += 1;
      }

      if (!playerAlive && !state.isDead) {
        soundEngine.playerDeath();
        state.isDead = true;
        state.lives--;
        if (state.lives <= 0) {
          state.gameOver = true;
        } else {
          setTimeout(() => {
            const newLevel = generateLevel(state.level);
            gameState.current.grid = newLevel.grid;
            gameState.current.playerX = newLevel.startX;
            gameState.current.playerY = newLevel.startY;
            gameState.current.explosiveUnderPlayer = null;
            gameState.current.isDead = false;
          }, 2000);
        }
      }
    };

    const gameLoop = (timestamp: number) => {
      if (timestamp - gameState.current.lastTick > TICK_RATE) {
        if (!gameState.current.gameOver) {
          tick();
        }
        gameState.current.lastTick = timestamp;
      }
      draw();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center w-full max-w-[960px]">
        {/* Game Canvas */}
        <div className="relative border-[12px] border-[#6666ff] rounded-lg shadow-2xl bg-black">
          <canvas
            ref={canvasRef}
            width={WIDTH * TILE_SIZE}
            height={HEIGHT * TILE_SIZE}
            className="block"
          />
          {hudState.gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg">
              <h2 className="text-6xl font-bold text-red-500 mb-4 tracking-widest">GAME OVER</h2>
              <button 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xl transition-colors"
                onClick={() => {
                  const newLevel = generateLevel(0);
                  gameState.current.gameOver = false;
                  gameState.current.lives = 3;
                  gameState.current.score = 0;
                  gameState.current.diamonds = 0;
                  gameState.current.dynamite = 5;
                  gameState.current.bombs = 3;
                  gameState.current.level = 0;
                  gameState.current.grid = newLevel.grid;
                  gameState.current.playerX = newLevel.startX;
                  gameState.current.playerY = newLevel.startY;
                  gameState.current.explosiveUnderPlayer = null;
                  gameState.current.isDead = false;
                }}
              >
                RESTART
              </button>
            </div>
          )}
        </div>

        {/* HUD */}
        <div className="flex justify-between items-center bg-white text-blue-600 p-3 mt-4 rounded-lg font-bold text-3xl border-[8px] border-[#ccccff] shadow-inner w-full" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          <div className="flex items-center gap-3">
            <div className="text-sm bg-blue-600 text-white px-2 py-1 rounded">LVL</div>
            <span className="tracking-widest">{String(hudState.level + 1).padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 border-4 border-green-800 flex items-center justify-center transform rotate-45">
               <div className="w-4 h-4 bg-green-300"></div>
            </div>
            <span className="tracking-widest">{String(hudState.score).padStart(5, '0')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-blue-800 flex items-center justify-center text-white text-sm">P</div>
            <span className="tracking-widest">{String(hudState.lives).padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-10 bg-red-600 border-2 border-red-800 relative">
               <div className="absolute -top-2 left-1 w-1 h-2 bg-white"></div>
            </div>
            <span className="tracking-widest">{String(hudState.dynamite).padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-full border-4 border-gray-900 relative">
               <div className="absolute -top-2 right-0 w-2 h-2 bg-white"></div>
            </div>
            <span className="tracking-widest">{String(hudState.bombs).padStart(2, '0')}</span>
          </div>
        </div>
        
        <div className="mt-4 text-neutral-400 text-sm flex justify-between w-full font-mono">
          <span>WASD/Arrows: Move/Push</span>
          <span>Space: Dynamite</span>
          <span>B: Bomb</span>
        </div>
      </div>
    </div>
  );
}
