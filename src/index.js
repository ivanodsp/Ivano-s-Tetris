// Classic Tetris constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const HIGH_SCORE_KEY = "ivanosTetrisHighScore";
const LEGACY_HIGH_SCORE_KEY = "stackOverflownHighScore";

const UI_COLORS = {
  grid: "#1f2f47",
  blockStroke: "#060c16",
  boardBackground: "#040b14",
};

// Neon color palette for pieces
const COLORS = {
  0: "#040b14",
  1: "#17f2ff", // I
  2: "#5d7bff", // J
  3: "#ff8b2b", // L
  4: "#f7ff4a", // O
  5: "#b7ff00", // S
  6: "#ff2fd8", // T
  7: "#ff4266", // Z
};

// Standard 7 tetrominoes
const TETROMINOES = [
  {
    color: 1,
    shape: [[1, 1, 1, 1]],
  },
  {
    color: 2,
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  {
    color: 3,
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  {
    color: 4,
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  {
    color: 5,
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    color: 6,
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    color: 7,
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
];

let canvas;
let ctx;
let board = [];
let currentPiece = null;
let currentX = 0;
let currentY = 0;
let score = 0;
let highScore = 0;
let level = 1;
let linesCleared = 0;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function init() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  board = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));

  highScore =
    parseInt(localStorage.getItem(HIGH_SCORE_KEY)) ||
    parseInt(localStorage.getItem(LEGACY_HIGH_SCORE_KEY)) ||
    0;

  updateHud();
  spawnPiece();

  requestAnimationFrame(gameLoop);
  document.addEventListener("keydown", handleKeyPress);
}

function gameLoop(time = 0) {
  if (!gameOver && !isPaused) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
      moveDown();
      dropCounter = 0;
    }
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function draw() {
  ctx.fillStyle = UI_COLORS.boardBackground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] !== 0) {
        drawBlock(col, row, board[row][col]);
      }
    }
  }

  if (currentPiece) {
    drawPiece(currentPiece, currentX, currentY);
  }

  ctx.strokeStyle = UI_COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let row = 0; row <= ROWS; row++) {
    ctx.beginPath();
    ctx.moveTo(0, row * BLOCK_SIZE);
    ctx.lineTo(COLS * BLOCK_SIZE, row * BLOCK_SIZE);
    ctx.stroke();
  }
  for (let col = 0; col <= COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(col * BLOCK_SIZE, 0);
    ctx.lineTo(col * BLOCK_SIZE, ROWS * BLOCK_SIZE);
    ctx.stroke();
  }
}

function drawBlock(x, y, colorCode) {
  ctx.fillStyle = COLORS[colorCode];
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = UI_COLORS.blockStroke;
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawPiece(piece, offsetX, offsetY) {
  const { shape, color } = piece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        drawBlock(offsetX + col, offsetY + row, color);
      }
    }
  }
}

function spawnPiece() {
  const pieceTemplate = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  currentPiece = {
    color: pieceTemplate.color,
    shape: pieceTemplate.shape.map((row) => [...row]),
  };
  currentX = Math.floor(COLS / 2) - Math.floor(currentPiece.shape[0].length / 2);
  currentY = 0;

  if (checkCollision(currentPiece, currentX, currentY)) {
    endGame();
  }
}

function checkCollision(piece, x, y) {
  const { shape } = piece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] === 0) continue;

      const newX = x + col;
      const newY = y + row;

      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }

      if (newY >= 0 && board[newY][newX] !== 0) {
        return true;
      }
    }
  }

  return false;
}

function moveDown() {
  if (!checkCollision(currentPiece, currentX, currentY + 1)) {
    currentY++;
    return;
  }

  lockPiece();
  clearCompletedRows();
  spawnPiece();
}

function lockPiece() {
  const { shape, color } = currentPiece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;

      const boardY = currentY + row;
      const boardX = currentX + col;
      if (boardY >= 0) {
        board[boardY][boardX] = color;
      }
    }
  }
}

function rotate() {
  const rotatedShape = currentPiece.shape[0].map((_, i) =>
    currentPiece.shape.map((row) => row[i]).reverse()
  );

  const rotatedPiece = {
    color: currentPiece.color,
    shape: rotatedShape,
  };

  if (!checkCollision(rotatedPiece, currentX, currentY)) {
    currentPiece = rotatedPiece;
  }
}

function moveLeft() {
  if (!checkCollision(currentPiece, currentX - 1, currentY)) {
    currentX--;
  }
}

function moveRight() {
  if (!checkCollision(currentPiece, currentX + 1, currentY)) {
    currentX++;
  }
}

function hardDrop() {
  while (!checkCollision(currentPiece, currentX, currentY + 1)) {
    currentY++;
  }

  lockPiece();
  clearCompletedRows();
  spawnPiece();
}

function clearCompletedRows() {
  let cleared = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    const isFull = board[row].every((cell) => cell !== 0);
    if (!isFull) continue;

    board.splice(row, 1);
    board.unshift(Array(COLS).fill(0));
    cleared++;
    row++;
  }

  if (cleared > 0) {
    linesCleared += cleared;

    // Classic scoring values per drop, scaled by level.
    const linePoints = [0, 40, 100, 300, 1200];
    score += linePoints[cleared] * level;

    level = Math.floor(linesCleared / 10) + 1;
    dropInterval = Math.max(120, 1000 - (level - 1) * 75);

    updateHud();
  }
}

function updateHud() {
  document.getElementById("score").textContent = score;
  document.getElementById("high-score").textContent = highScore;
  document.getElementById("level").textContent = level;
  document.getElementById("lines").textContent = linesCleared;

  if (score > highScore) {
    highScore = score;
    document.getElementById("high-score").textContent = highScore;
    localStorage.setItem(HIGH_SCORE_KEY, highScore);
  }
}

function handleKeyPress(e) {
  if (gameOver) return;

  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      if (!isPaused) moveLeft();
      break;
    case "ArrowRight":
      e.preventDefault();
      if (!isPaused) moveRight();
      break;
    case "ArrowDown":
      e.preventDefault();
      if (!isPaused) moveDown();
      break;
    case "ArrowUp":
      e.preventDefault();
      if (!isPaused) rotate();
      break;
    case " ":
      e.preventDefault();
      if (!isPaused) hardDrop();
      break;
    case "p":
    case "P":
      e.preventDefault();
      togglePause();
      break;
  }
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById("status").textContent = isPaused ? "Paused" : "Playing...";
}

function endGame() {
  gameOver = true;
  document.getElementById("status").textContent = "Game Over";
  document.getElementById("finalScore").textContent = score;
  document.getElementById("gameOver").classList.add("show");
}

window.addEventListener("load", init);
