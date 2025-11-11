// game_objects.js: 게임 내에서 생성되고 이동하는 오브젝트를 정의하고 생성합니다.

// ⭐ 플레이어 총알 발사 (AP 레벨 반영 - 수동 발사이므로 로직 유지)
function shoot() {
  currentBulletDamage = BASE_BULLET_DAMAGE + currentPowerLevel;
  const bulletSpeed = 7;
  
  if (currentPowerLevel === 0) { 
    bullets.push({
      x: player.x + player.width / 2 - 2, y: player.y,
      width: 4, height: 10, speed: bulletSpeed, damage: currentBulletDamage
    });
  } else if (currentPowerLevel === 1) { 
    bullets.push({ x: player.x + player.width / 2 - 10, y: player.y, width: 4, height: 10, speed: bulletSpeed, damage: currentBulletDamage });
    bullets.push({ x: player.x + player.width / 2 + 6, y: player.y, width: 4, height: 10, speed: bulletSpeed, damage: currentBulletDamage });
  } else if (currentPowerLevel >= 2) { 
    bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, width: 4, height: 10, speed: bulletSpeed, damage: currentBulletDamage });
    bullets.push({ x: player.x + player.width / 2 - 12, y: player.y, width: 4, height: 10, speed: bulletSpeed, damage: currentBulletDamage });
    bullets.push({ x: player.x + player.width / 2 + 8, y: player.y, width: 4, height: 10, speed: bulletSpeed, damage: currentBulletDamage });
  }
}

// ⭐ [수정] 적 생성 (체력 배율 적용)
function spawnEnemy() {
  const x = Math.random() * (canvas.width - 40);
  const enemyType = Math.random() < 0.2 ? 'Elite' : 'Regular'; 

  let enemy;
  if (enemyType === 'Elite') {
    enemy = { 
      x: x, y: 0, width: 40, height: 40, 
      speed: 2, 
      health: Math.round(5 * healthMultiplier), // ⭐ 체력 배율
      maxHealth: Math.round(5 * healthMultiplier), 
      type: 'Elite' 
    };
  } else {
    enemy = { 
      x: x, y: 0, width: 40, height: 40, 
      speed: 2, 
      health: Math.round(3 * healthMultiplier), // ⭐ 체력 배율
      maxHealth: Math.round(3 * healthMultiplier), 
      type: 'Regular'
    };
  }
  enemies.push(enemy);
}

// ⭐ [수정] 적 총알 발사 (난이도 고정)
// (적 총알 발사 빈도는 main.js의 startTimers에서 attackSpeedMultiplier로 제어됩니다.)
function enemyShoot() {
  if (enemies.length === 0) return;
  
  enemies.forEach(shooter => {
    // 60% 확률로 발사 시도 (기존 로직 유지)
    if (Math.random() > 0.6) return; 

    if (shooter.type === 'Elite') {
      for (let i = -1; i <= 1; i++) {
        const angle = Math.PI / 2 + (i * 0.4); 
        const speed = 4;
        enemyBullets.push({
          x: shooter.x + shooter.width / 2 - 2, y: shooter.y + shooter.height,
          width: 4, height: 10, speed: speed,
          dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed
        });
      }
    } else {
      enemyBullets.push({
        x: shooter.x + shooter.width / 2 - 2, y: shooter.y + shooter.height,
        width: 4, height: 10, speed: 4
      });
    }
  });
}

// ⭐ 아이템 생성 (확률 유지)
function spawnItem(x, y) {
  const rand = Math.random();
  let type;

  if (rand < 0.3) { type = ITEM_TYPES.SCORE; } 
  else if (rand < 0.6) { type = ITEM_TYPES.POWER; } 
  else if (rand < 0.65) { type = ITEM_TYPES.BOMB; } 
  else { return; }

  items.push({
    x, y, width: 12, height: 12, speed: 2, type: type
  });
}

// ▶ 폭발 이펙트 생성 (충돌 발생 시 호출)
function spawnEffect(x, y) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    effects.push({
      x, y, dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3, life: 30, 
      color: `hsl(${Math.random() * 360}, 100%, 60%)`
    });
  }
}

// --- [객체 업데이트 로직] ---

function updateEnemies(deltaTime) { 
    enemies.forEach(e => { e.y += e.speed * deltaTime; }); 
    enemies = enemies.filter(e => e.y < canvas.height); 
}
// ⭐⭐ [버그 수정] 총알 이동 로직 수정 (대각선 총알)
function updateEnemyBullets(deltaTime) { 
    enemyBullets.forEach(b => { 
        if (b.dx !== undefined) {
            b.x += b.dx * deltaTime;
            b.y += b.dy * deltaTime;
        } else {
            b.y += b.speed * deltaTime; 
        }
    }); 
    enemyBullets = enemyBullets.filter(b => b.y < canvas.height && b.y > 0 && b.x > 0 && b.x < canvas.width); 
}
function updateItems(deltaTime) { 
    items.forEach(item => { item.y += item.speed * deltaTime; }); 
    items = items.filter(i => i.y < canvas.height && !i.collected); 
}
function updateEffects(deltaTime) { 
    effects.forEach(e => { 
        e.x += e.dx * deltaTime; 
        e.y += e.dy * deltaTime; 
        e.life -= (1 * deltaTime); 
    }); 
    effects = effects.filter(e => e.life > 0); 
}

// ⭐ 보스 공격 패턴 함수 다양화
function bossPattern1() {
    const numBullets = 8;
    const speed = 3;
    for (let i = 0; i < numBullets; i++) {
        const angle = (i * (Math.PI * 2 / numBullets)) + boss.patternTimer * 0.05;
        enemyBullets.push({
            x: boss.x + boss.width / 2, y: boss.y + boss.height,
            width: 8, height: 8, speed: speed,
            dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed
        });
    }
}

function bossPattern2() {
    const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);
    const speed = 5;
    for (let i = -1; i <= 1; i++) {
        const angle = angleToPlayer + (i * 0.25);
        enemyBullets.push({
            x: boss.x + boss.width / 2, y: boss.y + boss.height,
            width: 6, height: 6, speed: speed,
            dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed
        });
    }
}

function bossPattern3() {
    const speed = 4;
    const numShots = 5;
    
    for(let i = 0; i < numShots; i++) {
        const baseAngle = boss.patternTimer * 0.1 + (i * 0.1); 
        const angle = baseAngle + (Math.PI * 2 / numShots);
        
        enemyBullets.push({
            x: boss.x + boss.width / 2, y: boss.y + boss.height,
            width: 8, height: 8, speed: speed,
            dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed,
        });
    }
}


// ⭐ [신규 함수] 보스 객체 생성 (체력 배율 적용)
function spawnBoss() {
    if (boss !== null) return; 

    // 1. 잡몹 타이머 중지 (main.js에서 호출됨)
    stopTimers(); 

    // ⭐ 2. [추가] 화면의 모든 잡몹과 총알 제거
    enemies = [];
    enemyBullets = [];

    // 3. 보스 객체 생성 (체력 배율 적용)
    const bossHP = Math.round(500 * healthMultiplier); 

    boss = {
        x: canvas.width / 2 - 60, y: -100, width: 120, height: 80, speed: 1,
        health: bossHP, maxHealth: bossHP,
        phase: 1, phaseThresholds: [0.7, 0.3], 
        patternTimer: 0, isEntering: true 
    };
    
    console.log("BOSS SPAWNED! Clearing enemies.");
}

// ⭐ [신규 함수] 보스 업데이트 (공격 속도 배율 적용)
function updateBoss(deltaTime) {
    if (boss === null) return;

    if (boss.isEntering) {
        boss.y += (boss.speed * 0.5) * deltaTime;
        if (boss.y >= 50) { boss.y = 50; boss.isEntering = false; }
    } else {
        boss.patternTimer += (1 * deltaTime);
        
        // 144Hz 기준 60프레임마다 발동
        // ⭐ 공격 속도 배율(attackSpeedMultiplier)을 적용하여 % 연산의 기준값을 줄임
        if (boss.phase === 1) {
            if (boss.patternTimer % (TARGET_FPS * 1.0 / attackSpeedMultiplier) < (1 * deltaTime)) { // 1초
                bossPattern1(); 
            }
        }
        else if (boss.phase === 2) {
            if (boss.patternTimer % (TARGET_FPS * 0.5 / attackSpeedMultiplier) < (1 * deltaTime)) { // 0.5초
                bossPattern2(); 
            }
        }
        else if (boss.phase === 3) {
             if (boss.patternTimer % (TARGET_FPS * 0.25 / attackSpeedMultiplier) < (1 * deltaTime)) { // 0.25초
                bossPattern1();
                bossPattern3(); 
            }
        }
        
        // 보스 이동 (sin 함수는 이미 시간에 따라 작동)
        const movementRange = 100;
        const centerX = canvas.width / 2;
        // 보스 이동 속도는 공격 속도와 별개로 고정 (TARGET_FPS * 0.8)
        boss.x = centerX + Math.sin(boss.patternTimer / (TARGET_FPS * 0.8)) * movementRange - boss.width / 2;
        const minX = 10;
        const maxX = canvas.width - boss.width - 10;
        boss.x = Math.max(minX, Math.min(boss.x, maxX));
    }
}