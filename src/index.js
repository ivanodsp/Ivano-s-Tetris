// Classic Tetris constants
const COLS = 10;
const ROWS = 20;
let BLOCK_SIZE = 30;

const HIGH_SCORE_KEY = "ivanosTetrisHighScore";
const LEGACY_HIGH_SCORE_KEY = "stackOverflownHighScore";
const THEME_KEY = "ivanosTetrisTheme";

const THEMES = {
  neon: {
    ui: {
      grid: "#1f2f47",
      blockStroke: "#060c16",
      boardBackground: "#040b14",
    },
    pieces: {
      0: "#040b14",
      1: "#17f2ff", // I
      2: "#5d7bff", // J
      3: "#ff8b2b", // L
      4: "#f7ff4a", // O
      5: "#b7ff00", // S
      6: "#ff2fd8", // T
      7: "#ff4266", // Z
    },
  },
  pastel: {
    ui: {
      grid: "#b8d4f3",
      blockStroke: "#dfeaf7",
      boardBackground: "#f6fbff",
    },
    pieces: {
      0: "#f6fbff",
      1: "#92ddff", // I
      2: "#a8b6ff", // J
      3: "#ffc59b", // L
      4: "#fff3a6", // O
      5: "#b9eaa8", // S
      6: "#ffb3df", // T
      7: "#ffb1b1", // Z
    },
  },
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
let elapsedTimeMs = 0;
let activeTheme = "neon";
let activeUiColors = THEMES.neon.ui;
let activePieceColors = THEMES.neon.pieces;

const INPUT_REPEAT = {
  horizontalDelay: 130,
  horizontalRate: 55,
  downRate: 45,
};

const heldKeys = {
  left: false,
  right: false,
  down: false,
};

const heldTimers = {
  left: 0,
  right: 0,
  down: 0,
};

const nextRepeat = {
  left: INPUT_REPEAT.horizontalDelay,
  right: INPUT_REPEAT.horizontalDelay,
  down: INPUT_REPEAT.downRate,
};

function init() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  setupThemeSelector();

  resizeBoard();

  board = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));

  highScore =
    parseInt(localStorage.getItem(HIGH_SCORE_KEY)) ||
    parseInt(localStorage.getItem(LEGACY_HIGH_SCORE_KEY)) ||
    0;

  updateHud();
  updateTimerDisplay();
  spawnPiece();

  requestAnimationFrame(gameLoop);
  document.addEventListener("keydown", handleKeyPress);
  document.addEventListener("keyup", handleKeyRelease);
  window.addEventListener("blur", clearHeldKeys);
  window.addEventListener("resize", resizeBoard);
  setupTouchControls();
}

function gameLoop(time = 0) {
  if (lastTime === 0) {
    lastTime = time;
  }

  const deltaTime = time - lastTime;
  lastTime = time;

  if (!gameOver && !isPaused) {
    dropCounter += deltaTime;
    elapsedTimeMs += deltaTime;
    updateTimerDisplay();
    processHeldInput(deltaTime);

    if (dropCounter > dropInterval) {
      moveDown();
      dropCounter = 0;
    }
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function draw() {
  ctx.fillStyle = activeUiColors.boardBackground;
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

  ctx.strokeStyle = activeUiColors.grid;
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

function resizeBoard() {
  const availableWidth = Math.max(220, Math.min(420, window.innerWidth - 40));
  const availableHeight = Math.max(400, window.innerHeight - 160);
  const byWidth = Math.floor(availableWidth / COLS);
  const byHeight = Math.floor(availableHeight / ROWS);

  BLOCK_SIZE = Math.max(16, Math.min(30, byWidth, byHeight));
  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;
}

function updateTimerDisplay() {
  const totalSeconds = Math.floor(elapsedTimeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${minutes}:${seconds}`;
}

function drawBlock(x, y, colorCode) {
  ctx.fillStyle = activePieceColors[colorCode];
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = activeUiColors.blockStroke;
  ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function setupThemeSelector() {
  const themeSelect = document.getElementById("themeSelect");
  const storedTheme = localStorage.getItem(THEME_KEY);
  const initialTheme = THEMES[storedTheme] ? storedTheme : "neon";

  applyTheme(initialTheme);

  if (!themeSelect) return;

  themeSelect.value = initialTheme;
  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });
}

function applyTheme(themeName) {
  const selectedTheme = THEMES[themeName] ? themeName : "neon";
  activeTheme = selectedTheme;
  activeUiColors = THEMES[selectedTheme].ui;
  activePieceColors = THEMES[selectedTheme].pieces;
  document.body.setAttribute("data-theme", activeTheme);
  localStorage.setItem(THEME_KEY, activeTheme);
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

function processHeldInput(deltaTime) {
  if (heldKeys.left && !heldKeys.right) {
    processHorizontalRepeat("left", deltaTime, moveLeft);
  } else {
    resetHeldTimer("left");
  }

  if (heldKeys.right && !heldKeys.left) {
    processHorizontalRepeat("right", deltaTime, moveRight);
  } else {
    resetHeldTimer("right");
  }

  if (heldKeys.down) {
    heldTimers.down += deltaTime;
    while (heldTimers.down >= nextRepeat.down) {
      moveDown();
      heldTimers.down -= nextRepeat.down;
      nextRepeat.down = INPUT_REPEAT.downRate;
    }
  } else {
    resetHeldTimer("down");
  }
}

function processHorizontalRepeat(key, deltaTime, moveFn) {
  heldTimers[key] += deltaTime;

  while (heldTimers[key] >= nextRepeat[key]) {
    moveFn();
    heldTimers[key] -= nextRepeat[key];
    nextRepeat[key] = INPUT_REPEAT.horizontalRate;
  }
}

function resetHeldTimer(key) {
  heldTimers[key] = 0;
  nextRepeat[key] =
    key === "down" ? INPUT_REPEAT.downRate : INPUT_REPEAT.horizontalDelay;
}

function clearHeldKeys() {
  heldKeys.left = false;
  heldKeys.right = false;
  heldKeys.down = false;
  resetHeldTimer("left");
  resetHeldTimer("right");
  resetHeldTimer("down");
}

function setupTouchControls() {
  const controls = document.getElementById("mobileControls");
  if (!controls) return;

  const buttons = controls.querySelectorAll("[data-action]");
  buttons.forEach((button) => {
    const action = button.dataset.action;

    button.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        handleControlStart(action);
      },
      { passive: false }
    );

    button.addEventListener("touchend", () => handleControlEnd(action));
    button.addEventListener("touchcancel", () => handleControlEnd(action));

    // Mouse fallback for simulators and desktop testing.
    button.addEventListener("mousedown", (e) => {
      e.preventDefault();
      handleControlStart(action);
    });
    button.addEventListener("mouseup", () => handleControlEnd(action));
    button.addEventListener("mouseleave", () => handleControlEnd(action));
  });
}

function handleControlStart(action) {
  if (gameOver || isPaused) return;

  switch (action) {
    case "left":
      heldKeys.left = true;
      resetHeldTimer("left");
      moveLeft();
      break;
    case "right":
      heldKeys.right = true;
      resetHeldTimer("right");
      moveRight();
      break;
    case "down":
      heldKeys.down = true;
      resetHeldTimer("down");
      moveDown();
      break;
    case "rotate":
      rotate();
      break;
  }
}

function handleControlEnd(action) {
  switch (action) {
    case "left":
      heldKeys.left = false;
      resetHeldTimer("left");
      break;
    case "right":
      heldKeys.right = false;
      resetHeldTimer("right");
      break;
    case "down":
      heldKeys.down = false;
      resetHeldTimer("down");
      break;
  }
}

function handleKeyPress(e) {
  if (gameOver) return;

  switch (e.key) {
    case "ArrowLeft":
      e.preventDefault();
      heldKeys.left = true;
      if (!e.repeat && !isPaused) {
        resetHeldTimer("left");
        moveLeft();
      }
      break;
    case "ArrowRight":
      e.preventDefault();
      heldKeys.right = true;
      if (!e.repeat && !isPaused) {
        resetHeldTimer("right");
        moveRight();
      }
      break;
    case "ArrowDown":
      e.preventDefault();
      heldKeys.down = true;
      if (!e.repeat && !isPaused) {
        resetHeldTimer("down");
        moveDown();
      }
      break;
    case "ArrowUp":
      e.preventDefault();
      if (!e.repeat && !isPaused) rotate();
      break;
    case " ":
      e.preventDefault();
      if (!e.repeat && !isPaused) hardDrop();
      break;
    case "p":
    case "P":
      e.preventDefault();
      if (!e.repeat) togglePause();
      break;
  }
}

function handleKeyRelease(e) {
  switch (e.key) {
    case "ArrowLeft":
      heldKeys.left = false;
      resetHeldTimer("left");
      break;
    case "ArrowRight":
      heldKeys.right = false;
      resetHeldTimer("right");
      break;
    case "ArrowDown":
      heldKeys.down = false;
      resetHeldTimer("down");
      break;
  }
}

function togglePause() {
  isPaused = !isPaused;
  clearHeldKeys();
  document.getElementById("status").textContent = isPaused ? "Paused" : "Playing...";
}

function endGame() {
  gameOver = true;
  clearHeldKeys();
  document.getElementById("status").textContent = "Game Over";
  document.getElementById("finalScore").textContent = score;
  document.getElementById("gameOver").classList.add("show");
}

window.addEventListener("load", init);
