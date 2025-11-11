// main.js: 게임의 핵심 흐름과 타이머, 최고 점수를 관리합니다.

// 캔버스 및 Context 설정
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ⭐ 이미지 로드
const playerImage = new Image();
playerImage.src = "images/fighter.png"; 

const alienImage = new Image();
alienImage.src = "images/ufo.png";

const alienEnemyImage = new Image();
alienEnemyImage.src = "images/alien_enemy.png";

const alien1Image = new Image(); 
alien1Image.src = "images/alien_1.png";

// ⭐ [수정] 전역 상태 변수 (var를 사용하여 파일 간 스코프 문제 방지)
var score = 0;
var gameOver = false;
var isGameStarted = false; 
var keys = {};
var boss = null;

var ITEM_TYPES = { SCORE: 'score', POWER: 'power', BOMB: 'bomb' }; 
const MAX_POWER_LEVEL = 5;
var currentPowerLevel = 0; 
var bombCount = 1; 
const MAX_BOMB_COUNT = 3;

const BASE_BULLET_DAMAGE = 1; 
var currentBulletDamage = BASE_BULLET_DAMAGE; 

// ⭐ [추가/수정] 시간 및 보스 타이머 변수
var gameTime = 0; 
var bossSpawnTimer = 0; 
var bossCoolDownTimer = 0; 
var isBossCoolDown = false; 
var currentBossSpawnTime = 8640; // ⭐ [수정] 3600 -> 8640 (1분 * 144fps)
var nextBossCoolDownDuration = 12960; // ⭐ [수정] 1분 30초 (90s * 144fps)
var highScore = 0; 

// ⭐ [추가] 점진적 난이도 변수
var bossesDefeated = 0; // 처치한 보스 수
var healthMultiplier = 1.0; // 체력 배율 (2번 잡을 때마다 증가)
var attackSpeedMultiplier = 1.0; // 공격 속도 배율 (1번 잡을 때마다 증가)
const MAX_ATTACK_SPEED_MULTIPLIER = 2.5; // ⭐ 공격 속도 최대치 (2.5배)

// ⭐ [추가] 델타 타임(Delta Time) 변수
var lastTime = 0;
const TARGET_FPS = 144; // 기준 속도 (144Hz)

// 게임 오브젝트 배열
var bullets = []; var enemies = []; var enemyBullets = []; var items = []; var effects = [];

// 일시정지 및 타이머 관련 변수
var isPaused = false;
var countdown = 0; // (사용되지 않음)
var enemySpawnIntervalId = null; 
var enemyShootIntervalId = null; 

// HTML 요소
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreDisplay = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");
const scoreMessage = document.getElementById("scoreMessage"); 

// ⭐ [추가] 시작 화면 HTML 요소
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const descriptionButton = document.getElementById("descriptionButton");
const descriptionModal = document.getElementById("descriptionModal");
const closeDescriptionButton = document.getElementById("closeDescriptionButton");


// ▶ 플레이어 설정 (const 유지)
const player = {
    x: 180, y: 550, width: 40, height: 40, speed: 3,
    fireRate: 100, lastShotTime: 0, 
    health: 3, maxHealth: 3,
    isInvulnerable: false, invulnerabilityFrames: 90, currentInvulnerability: 0,
    hitboxPadding: 10
};

// ▶ 별 배경 (const 유지)
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 1, speed: Math.random() * 1 + 0.5
}));


// --- [핵심 함수들: 흐름 제어] ---

// ⭐ [수정] 게임 타이머 (공격 속도 배율 적용)
function startTimers() {
    // ⭐ 공격 속도 배율 적용 (타이머 간격을 줄임)
    if (enemySpawnIntervalId === null) {
        enemySpawnIntervalId = setInterval(spawnEnemy, 1000 / attackSpeedMultiplier); 
    }
    if (enemyShootIntervalId === null) {
        enemyShootIntervalId = setInterval(enemyShoot, 1500 / attackSpeedMultiplier); 
    }
}

function stopTimers() {
    clearInterval(enemySpawnIntervalId);
    clearInterval(enemyShootIntervalId);
    enemySpawnIntervalId = null;
    enemyShootIntervalId = null;
}

// ⭐ [신규 함수] 보스 처치 후 쿨타임 시작 로직
function startBossCoolDown() {
    isBossCoolDown = true;
    bossCoolDownTimer = 0;
    
    // ⭐ [수정] 쿨타임 1.5분 고정 (증가 로직 제거)
    // (nextBossCoolDownDuration는 5400으로 고정됨)

    console.log(`Boss Defeated! Next CD: ${nextBossCoolDownDuration / 60} seconds (Fixed 1.5min)`);
    startTimers(); // 쿨타임 동안 잡몹 타이머 다시 시작
}

// ▶ 일시정지/게임 오버/초기화 함수
function togglePause() {
    if (gameOver || !isGameStarted) return; // 게임 시작 전에는 일시정지 안 됨
    if (isPaused) { 
        isPaused = false; 
        startTimers(); // 즉시 타이머 재시작
    } else { 
        isPaused = true; 
        stopTimers(); 
    }
}

// ⭐ [신규 함수] 게임 시작 (버튼 클릭 시)
function startGame() {
    isGameStarted = true;
    startScreen.classList.add("hidden");
    resetGame(); // 게임 상태 초기화 및 타이머 시작
    
    // ⭐ [수정] 게임 루프를 여기서 시작!
    lastTime = 0; // 델타 타임 초기화
    update(0); 
}

function resetGame() {
    gameOver = false; isGameClear = false; isPaused = false; score = 0;
    
    // 시간 및 타이머 초기화
    gameTime = 0;
    bossSpawnTimer = 0;
    bossCoolDownTimer = 0;
    isBossCoolDown = false;
    currentBossSpawnTime = 8640; // 1분
    nextBossCoolDownDuration = 12960; // ⭐ [수정] 1분 30초

    // ⭐ [추가] 난이도 변수 초기화
    bossesDefeated = 0;
    healthMultiplier = 1.0;
    attackSpeedMultiplier = 1.0;

    // 최고 점수 로드
    const savedScore = localStorage.getItem('highScore');
    highScore = savedScore ? parseInt(savedScore) : 0;

    currentPowerLevel = 0; currentBulletDamage = BASE_BULLET_DAMAGE;
    bombCount = 1;

    player.x = 180; player.y = 550; player.health = player.maxHealth;
    player.isInvulnerable = false; player.currentInvulnerability = 0;
    bullets = []; enemies = []; enemyBullets = []; items = []; effects = []; boss = null; 
    
    gameOverScreen.classList.add("hidden");
    restartButton.textContent = "PLAY AGAIN"; // 버튼 텍스트 원복
    restartButton.onclick = resetGame;
    startTimers();
}

function handleGameOver() {
    gameOver = true; stopTimers();
    
    // 최고 점수 저장 로직
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    
    gameOverScreen.classList.remove("hidden");
    scoreMessage.textContent = `GAME OVER. Final Score: ${score}`;
    finalScoreDisplay.textContent = `High Score: ${highScore}`;
    restartButton.textContent = "PLAY AGAIN";
    restartButton.onclick = resetGame;
}

// --- [이벤트 리스너 및 루프] ---

// ▶ 키 입력 처리 (수동 발사 로직)
document.addEventListener("keydown", e => {
    keys[e.key] = true;
    
    if (e.key === "p" || e.key === "P") { 
        e.preventDefault(); 
        togglePause();
    }
    if (e.key === "z" || e.key === "Z") { useBomb(); }
});

document.addEventListener("keyup", e => {
    if (e.key === " ") {
        if (isGameStarted && !isPaused && !gameOver) { // ⭐ 게임 중에만 발사
            shoot(); 
        }
    }
    keys[e.key] = false;
});

// ⭐ [추가] 시작 화면 버튼 이벤트 리스너
startButton.addEventListener("click", () => {
    startGame();
});

descriptionButton.addEventListener("click", () => {
    descriptionModal.classList.remove("hidden");
});

closeDescriptionButton.addEventListener("click", () => {
    descriptionModal.classList.add("hidden");
});

// ▶ 다시 시작 버튼 클릭 이벤트 연결
restartButton.addEventListener("click", () => { resetGame(); restartButton.blur(); });

// ⭐ [수정] update 함수: 델타 타임(Delta Time) 적용
function update(currentTime) {
  // --- 1. Delta Time 계산 ---
  if (lastTime === 0) { // 첫 프레임 초기화
      lastTime = currentTime;
      requestAnimationFrame(update);
      return;
  }
  // 144Hz 기준의 델타타임 비율 계산
  const deltaTimeFactor = (currentTime - lastTime) / (1000 / TARGET_FPS);
  lastTime = currentTime; 

  // --- 2. 게임 상태 확인 ---
  if (!isGameStarted || gameOver || isGameClear) { 
      requestAnimationFrame(update); 
      return; 
  }
    
  if (isPaused) {
      // (그리기 로직 유지)
      drawStars(1); // 멈춰있을 땐 델타타임 1
      drawEffects(1);
      drawGame(gameTime);
      drawPauseScreen();
      requestAnimationFrame(update); return; 
  }

  // --- 3. 타이머 및 로직 업데이트 (deltaTimeFactor 곱하기) ---

  // ⭐ [타이머 및 보스 스폰 관리]
  gameTime += (1 * deltaTimeFactor); // 총 시간 증가
  
  if (boss === null) {
      if (isBossCoolDown) {
          // 쿨타임 중
          bossCoolDownTimer += (1 * deltaTimeFactor);
          if (bossCoolDownTimer > nextBossCoolDownDuration) {
              isBossCoolDown = false;
              bossSpawnTimer = 0; 
              console.log("Boss CD END. Spawn Timer started.");
          }
      } else {
          // 보스 스폰 타이머 중
          bossSpawnTimer += (1 * deltaTimeFactor);
          if (bossSpawnTimer > currentBossSpawnTime) {
              spawnBoss();
              bossSpawnTimer = 0;
          }
      }
  }

  // 타이머 재개 확인 (보스가 없을 때만 잡몹 타이머 시작)
  if (enemySpawnIntervalId === null && boss === null) { startTimers(); }

  // 무적 프레임
  if (player.currentInvulnerability > 0) { 
      player.currentInvulnerability -= (1 * deltaTimeFactor); 
      if (player.currentInvulnerability <= 0) { 
          player.isInvulnerable = false; 
      } 
  }
  
  // ⭐ [수정] 델타타임 인자(Argument) 전달
  updateStars(deltaTimeFactor); 
  updateEffects(deltaTimeFactor); 
  updateBoss(deltaTimeFactor); 
  updateEnemies(deltaTimeFactor); 
  updateEnemyBullets(deltaTimeFactor); 
  updateItems(deltaTimeFactor); 

  // (수동 발사로 변경했으므로 자동 발사 로직 제거됨)

  // ⭐ 플레이어 이동
  if ((keys["ArrowLeft"] || keys["a"]) && player.x > 0) {
      player.x -= player.speed * deltaTimeFactor;
  }
  if ((keys["ArrowRight"] || keys["d"]) && player.x + player.width < canvas.width) {
      player.x += player.speed * deltaTimeFactor;
  }

  // ⭐ 총알 이동
  bullets.forEach(b => b.y -= b.speed * deltaTimeFactor);
  bullets = bullets.filter(b => b.y > 0);

  // --- 4. 충돌 및 그리기 ---
  processCollisions(); 
  
  // ⭐ [수정] gameTime을 인자로 전달
  drawGame(gameTime);

  requestAnimationFrame(update);
}


// --- [게임 초기 시작] ---
var imagesLoaded = 0; 
const totalImages = 4;
// var lastTime = 0; // (파일 상단으로 이동)

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        startScreen.classList.remove("hidden");
        // ⭐ [수정] update()를 즉시 호출하지 않음 (startGame에서 호출)
        // update(0); 
    }
}
playerImage.onload = imageLoaded; alienImage.onload = imageLoaded; alienEnemyImage.onload = imageLoaded; alien1Image.onload = imageLoaded;
if (playerImage.complete && imagesLoaded < totalImages) imageLoaded(); 
if (alienImage.complete && imagesLoaded < totalImages) imageLoaded(); 
if (alienEnemyImage.complete && imagesLoaded < totalImages) imageLoaded(); 
if (alien1Image.complete && imagesLoaded < totalImages) imageLoaded();