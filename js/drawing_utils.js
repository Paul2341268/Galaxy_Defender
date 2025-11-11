// drawing_utils.js: 캔버스에 그려지는 모든 시각적 요소(배경, 오브젝트, UI)를 담당합니다.

// --- [업데이트 로직] ---

// ⭐ [수정] Delta Time 적용
function updateStars(deltaTime) {
  for (let s of stars) {
    s.y += s.speed * deltaTime;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  }
}

// --- [그리기 보조 함수] ---

function drawStarShape(x, y, radius, points, inset) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x, y);
  ctx.moveTo(0, 0 - radius);
  for (let i = 0; i < points; i++) {
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - (radius * inset));
    ctx.rotate(Math.PI / points);
    ctx.lineTo(0, 0 - radius);
  }
  ctx.closePath();
  ctx.fill(); 
  ctx.restore();
}

function drawEnemyHealth(enemy) {
    const barWidth = enemy.width * 0.8;
    const barHeight = 4;
    const barX = enemy.x + (enemy.width - barWidth) / 2;
    const barY = enemy.y - 10;
    
    ctx.fillStyle = "red";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    const currentHealthWidth = barWidth * (enemy.health / enemy.maxHealth);
    ctx.fillStyle = "lime";
    ctx.fillRect(barX, barY, currentHealthWidth, barHeight);
}

// ⭐ [수정] 플레이어 체력/폭탄/AP 텍스트 표시 (Y=55로 내림)
function drawPlayerHealth() {
    const textY = 55; // ⭐ Y=35 -> Y=55로 변경 (두 번째 줄)
    
    // 1. HP 표시 (오른쪽 상단)
    const hpTextX = canvas.width - 70; 
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("HP: " + player.health, hpTextX, textY); 
    
    // 2. AP (Attack Power) 표시 (중앙 상단)
    const apTextX = canvas.width / 2 - 40;
    ctx.fillStyle = currentPowerLevel === MAX_POWER_LEVEL ? "yellow" : "white";
    ctx.fillText(`AP: ${BASE_BULLET_DAMAGE + currentPowerLevel}`, apTextX, textY);
    
    // 3. Bomb Count 표시 (오른쪽 상단, HP 옆)
    const bombTextX = hpTextX - 70;
    ctx.fillStyle = "cyan";
    ctx.font = "16px Arial"; 
    ctx.fillText(`BOMB: ${bombCount}`, bombTextX, textY);
}

// ⭐ [수정] 보스 체력 바 그리기 (Y=5, 최상단 고정)
function drawBossHealth() {
    if (boss === null) return;
    
    const barWidth = canvas.width - 40; 
    const barHeight = 15;
    const barX = 20;
    const barY = 5; // ⭐ Y=5 (최상단 고정)

    ctx.fillStyle = "darkgray";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    const currentHealthWidth = barWidth * (boss.health / boss.maxHealth);
    
    if (boss.phase === 3) { ctx.fillStyle = "red"; } 
    else if (boss.phase === 2) { ctx.fillStyle = "orange"; } 
    else { ctx.fillStyle = "lime"; }
    
    ctx.fillRect(barX, barY, currentHealthWidth, barHeight);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.fillText(`BOSS HP (PHASE ${boss.phase})`, barX + 5, barY + 12);
}

// ⭐ 일시정지 화면 그리기 (카운트다운 제거됨)
function drawPauseScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    
    ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = "16px Arial";
    ctx.fillText("Press P to Resume", canvas.width / 2, canvas.height / 2 + 10); 
    
    ctx.textAlign = "left"; 
}

function drawItems() {
  for (let item of items) {
    if (item.type === ITEM_TYPES.SCORE) {
      ctx.fillStyle = "orange";
      drawStarShape(item.x + item.width / 2, item.y + item.height / 2, 6, 5, 0.5);
    } else if (item.type === ITEM_TYPES.POWER) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === ITEM_TYPES.BOMB) {
      ctx.fillStyle = "blue";
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ▶ 배경 별 그리기 (drawGame 앞에 정의)
function drawStars() {
  ctx.fillStyle = "#6f879eff"; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  for (let s of stars) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ▶ 이펙트 그리기 (drawGame 앞에 정의)
function drawEffects() {
  for (let e of effects) {
    const alpha = e.life / 30;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1; 
}


// ⭐ [수정] 메인 그리기 함수 (UI Y좌표 수정)
function drawGame(gameTime) {
    // 1. 배경 및 비물리적 요소
    drawStars(); 
    drawEffects(); 
    drawItems();       

    // 2. 보스 체력 바 그리기 (Y=5)
    drawBossHealth(); 

    // 3. 적
    enemies.forEach(e => {
        let imageToDraw = e.type === 'Elite' ? alien1Image : alienImage; 
        ctx.drawImage(imageToDraw, e.x, e.y, e.width, e.height);
        
        if (e.health < e.maxHealth) { 
            drawEnemyHealth(e); 
        }
    });

    // 4. 보스 그리기
    if (boss !== null) {
        ctx.drawImage(alienEnemyImage, boss.x, boss.y, boss.width, boss.height); 
    }

    // 5. 총알
    bullets.forEach(b => {
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    enemyBullets.forEach(b => {
        ctx.fillStyle = "black";
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // 6. 플레이어
    // ⭐ [수정] 델타타임 보정 (깜빡임 속도 조절)
    const shouldDraw = !player.isInvulnerable || (player.currentInvulnerability % (TARGET_FPS / 12) < (TARGET_FPS / 24));
    if (shouldDraw) {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    }

    // 7. UI (Y=55)
    drawPlayerHealth(); 

    // ⭐ [수정] 점수/시간/최고 점수 (Y=35, 첫 번째 줄)
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("Score: " + score, 10, 35); // ⭐ Y=15 -> Y=35
    
    const totalSeconds = Math.floor(gameTime / TARGET_FPS); 
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    ctx.fillText(`TIME: ${minutes}m ${seconds}s`, 100, 35); // ⭐ Y=15 -> Y=35
    
    ctx.fillStyle = "yellow";
    ctx.fillText(`HIGH SCORE: ${highScore}`, 260, 35); // ⭐ Y=15 -> Y=35
}