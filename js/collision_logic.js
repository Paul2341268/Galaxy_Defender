// collision_logic.js: 모든 충돌 감지 및 피해 적용 로직을 담당합니다.

function isColliding(a, b) {
  // 기본 패딩을 이용한 히트박스 조정
  const paddingA = a.hitboxPadding || 0;
  const paddingB = b.hitboxPadding || 0;
  
  return a.x + paddingA < b.x + b.width - paddingB &&
         a.x + a.width - paddingA > b.x + paddingB &&
         a.y + paddingA < b.y + b.height - paddingB &&
         a.y + a.height - paddingA > b.y + paddingB;
}

// ⭐ 플레이어 피해 처리 및 AP 감소
function takeDamage() {
  if (player.isInvulnerable) return;

  player.health--;
  player.isInvulnerable = true;
  player.currentInvulnerability = player.invulnerabilityFrames; 

  if (currentPowerLevel >= 2) {
      currentPowerLevel -= 2; 
  } else if (currentPowerLevel === 1) {
      currentPowerLevel = 0; 
  }
  
  if (player.health <= 0) {
    handleGameOver(); 
  }
}

// ⭐ [수정] 폭탄 사용 (보스 처치 시 쿨타임 시작 및 난이도 증가)
function useBomb() {
    if (bombCount <= 0 || isPaused || gameOver) return;
    
    bombCount--;
    
    // 1. 모든 적 총알 제거
    enemyBullets = [];
    
    // 2. 모든 적/보스에게 피해 적용
    const bombDamage = 50; 
    
    // 잡몹 피해
    let destroyedEnemies = [];
    enemies.forEach(e => {
        e.health -= bombDamage;
        if (e.health <= 0) {
            spawnEffect(e.x + e.width / 2, e.y + e.height / 2);
            score++;
            destroyedEnemies.push(e);
        }
    });
    enemies = enemies.filter(e => !destroyedEnemies.includes(e));

    // 보스 피해
    if (boss !== null) {
        boss.health -= bombDamage;
        if (boss.health <= 0) {
            spawnEffect(boss.x + boss.width / 2, boss.y + boss.height / 2);
            score += 500;
            boss = null;
            bombCount = Math.min(MAX_BOMB_COUNT, bombCount + 1);
            
            // ⭐ [추가] 난이도 증가 로직 호출
            increaseDifficulty();
            
            startBossCoolDown(); // ⭐ 폭탄으로 보스 처치 시 쿨타임 시작
        } else {
            checkBossPhase(); 
        }
    }
}

// ⭐ 보스 페이즈 전환 체크
function checkBossPhase() {
    if (boss === null || boss.isEntering) return;
    
    const hpRatio = boss.health / boss.maxHealth;
    
    if (boss.phase === 1 && hpRatio <= boss.phaseThresholds[0]) {
        boss.phase = 2; 
        boss.patternTimer = 0; 
        console.log("Boss Phase 2 Activated!");
    } else if (boss.phase === 2 && hpRatio <= boss.phaseThresholds[1]) {
        boss.phase = 3; 
        boss.patternTimer = 0; 
        console.log("Boss Phase 3 Activated! BEWARE!");
    }
}

// ⭐ [신규 함수] 난이도 증가 로직
function increaseDifficulty() {
    // 1. 보스 처치 횟수 증가
    bossesDefeated++;
    
    // 2. 공격 빈도 증가 (매 1회 처치 시)
    if (attackSpeedMultiplier < MAX_ATTACK_SPEED_MULTIPLIER) {
        attackSpeedMultiplier += 0.15; // 15%씩 빨라짐
        if (attackSpeedMultiplier > MAX_ATTACK_SPEED_MULTIPLIER) {
            attackSpeedMultiplier = MAX_ATTACK_SPEED_MULTIPLIER; // 최대치 제한
        }
        console.log(`Difficulty Up! Attack Speed Multiplier: ${attackSpeedMultiplier.toFixed(2)}`);
    }

    // 3. 체력 증가 (매 2회 처치 시)
    if (bossesDefeated > 0 && bossesDefeated % 2 === 0) {
        healthMultiplier += 0.25; // 25%씩 증가
        console.log(`Difficulty Up! Health Multiplier: ${healthMultiplier.toFixed(2)}`);
    }
    
    // (타이머는 보스 처치 후 startTimers()가 다시 호출될 때 갱신됨)
}


// ▶ 모든 충돌을 처리하는 메인 함수
function processCollisions() {
    // 1. 플레이어 vs 적 충돌
    enemies.forEach(e => {
        if (!player.isInvulnerable && isColliding(e, player)) {
            takeDamage(); 
        }
    });

    // 2. 적 총알 vs 플레이어 충돌
    enemyBullets.forEach(b => {
        if (!player.isInvulnerable && isColliding(b, player)) {
            takeDamage(); 
            b.collected = true; 
        }
    });
    enemyBullets = enemyBullets.filter(b => !b.collected); 

    // 3. 플레이어 총알 vs 적/보스 충돌
    let activeBullets = []; 
    let destroyedEnemies = []; 

    bullets.forEach(b => {
        let bulletHit = false;
        
        // A. 보스 충돌 체크
        if (boss !== null && !boss.isEntering && isColliding(boss, b)) {
            boss.health -= b.damage;
            bulletHit = true;
            
            if (boss.health <= 0) {
                spawnEffect(boss.x + boss.width / 2, boss.y + boss.height / 2);
                score += 500; 
                boss = null;
                bombCount = Math.min(MAX_BOMB_COUNT, bombCount + 1); 
                
                // ⭐ [추가] 난이도 증가 로직 호출
                increaseDifficulty(); 
                
                startBossCoolDown(); // ⭐ 보스 처치 시 쿨타임 시작
            } else {
                checkBossPhase(); 
            }
        }
        
        // B. 잡몹 충돌 체크
        if (!bulletHit) {
             enemies.forEach(e => {
                if (bulletHit || destroyedEnemies.includes(e)) return; 
                
                if (isColliding(e, b)) { 
                    e.health -= b.damage; 
                    bulletHit = true; 

                    if (e.health <= 0) {
                        spawnEffect(e.x + e.width / 2, e.y + e.height / 2); 
                        spawnItem(e.x + e.width / 2 - 6, e.y); 
                        score++; 
                        destroyedEnemies.push(e);
                    }
                }
            });
        }
        
        if (!bulletHit) { activeBullets.push(b); }
    });
    
    bullets = activeBullets; 
    enemies = enemies.filter(e => { return !destroyedEnemies.includes(e); });

    // 4. 아이템 vs 플레이어 충돌
    items.forEach(item => {
      if (isColliding(item, player)) {
        if (item.type === ITEM_TYPES.SCORE) { score += 10; } 
        else if (item.type === ITEM_TYPES.POWER) { score += 10; currentPowerLevel = Math.min(MAX_POWER_LEVEL, currentPowerLevel + 1); } 
        else if (item.type === ITEM_TYPES.BOMB) { bombCount = Math.min(MAX_BOMB_COUNT, bombCount + 1); }
        item.collected = true; 
      }
    });
}