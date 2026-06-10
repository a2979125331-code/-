const keys = new Set();

const state = {
  width: 800,
  height: 480,
  score: 0,
  lives: 3,
  gameOver: false,
  player: {
    x: 80,
    y: 220,
    size: 42,
    speed: 260
  },
  gem: {
    x: 520,
    y: 220,
    size: 34
  },
  enemies: [
    { x: 310, y: 90, size: 42, speedX: 130, speedY: 0 },
    { x: 630, y: 340, size: 42, speedX: -115, speedY: 0 }
  ]
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsTouch(a, b) {
  return (
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  );
}

function randomGemPosition() {
  state.gem.x = 80 + Math.random() * (state.width - 160);
  state.gem.y = 80 + Math.random() * (state.height - 160);
}

function resetPlayer() {
  state.player.x = 80;
  state.player.y = state.height / 2 - state.player.size / 2;
}

export function restartGame() {
  state.score = 0;
  state.lives = 3;
  state.gameOver = false;
  resetPlayer();
  randomGemPosition();
  state.enemies[0].x = 310;
  state.enemies[1].x = 630;
}

function updatePlayer(deltaSeconds) {
  let dx = 0;
  let dy = 0;

  if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("s")) dy += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  state.player.x = clamp(state.player.x + dx * state.player.speed * deltaSeconds, 0, state.width - state.player.size);
  state.player.y = clamp(state.player.y + dy * state.player.speed * deltaSeconds, 0, state.height - state.player.size);
}

function updateEnemies(deltaSeconds) {
  for (const enemy of state.enemies) {
    enemy.x += enemy.speedX * deltaSeconds;
    enemy.y += enemy.speedY * deltaSeconds;

    if (enemy.x <= 0 || enemy.x + enemy.size >= state.width) {
      enemy.speedX *= -1;
      enemy.x = clamp(enemy.x, 0, state.width - enemy.size);
    }
  }
}

function updateCollisions() {
  if (rectsTouch(state.player, state.gem)) {
    state.score += 1;
    randomGemPosition();
  }

  for (const enemy of state.enemies) {
    if (rectsTouch(state.player, enemy)) {
      state.lives -= 1;
      resetPlayer();

      if (state.lives <= 0) {
        state.gameOver = true;
      }
      break;
    }
  }
}

function drawBackground(ctx) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= state.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }

  for (let y = 0; y <= state.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
}

function drawUi(ctx) {
  ctx.fillStyle = "#f9fafb";
  ctx.font = "20px Arial";
  ctx.fillText(`分数：${state.score}`, 20, 34);
  ctx.fillText(`生命：${state.lives}`, 140, 34);

  if (state.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "#facc15";
    ctx.font = "42px Arial";
    ctx.textAlign = "center";
    ctx.fillText("游戏结束", state.width / 2, state.height / 2 - 18);

    ctx.fillStyle = "#f9fafb";
    ctx.font = "20px Arial";
    ctx.fillText("按 R 或点击重新开始", state.width / 2, state.height / 2 + 28);
    ctx.textAlign = "left";
  }
}

function drawImageOrFallback(ctx, image, entity, fallbackColor) {
  if (image && image.complete) {
    ctx.drawImage(image, entity.x, entity.y, entity.size, entity.size);
    return;
  }

  ctx.fillStyle = fallbackColor;
  ctx.fillRect(entity.x, entity.y, entity.size, entity.size);
}

export function createGame(canvas, images) {
  const ctx = canvas.getContext("2d");
  let lastTime = performance.now();

  function loop(now) {
    const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (!state.gameOver) {
      updatePlayer(deltaSeconds);
      updateEnemies(deltaSeconds);
      updateCollisions();
    }

    drawBackground(ctx);
    drawImageOrFallback(ctx, images.gem, state.gem, "#facc15");
    for (const enemy of state.enemies) {
      drawImageOrFallback(ctx, images.enemy, enemy, "#ef4444");
    }
    drawImageOrFallback(ctx, images.player, state.player, "#38bdf8");
    drawUi(ctx);

    requestAnimationFrame(loop);
  }

  restartGame();
  requestAnimationFrame(loop);
}

export function registerControls(restartButton) {
  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.add(key);

    if (key === "r" && state.gameOver) {
      restartGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  });

  restartButton.addEventListener("click", restartGame);
}
