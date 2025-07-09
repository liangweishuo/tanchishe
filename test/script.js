// --- DOM元素获取 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const finalHighScoreEl = document.getElementById('finalHighScore');
const gameModeEl = document.getElementById('gameMode');
const activeEffectsEl = document.getElementById('activeEffects');

// 界面元素
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');

// 按钮
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const menuButton = document.getElementById('menuButton');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const quitButton = document.getElementById('quitButton');

// 移动控制按钮
const upBtn = document.getElementById('upBtn');
const downBtn = document.getElementById('downBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

// 设置选择器
const modeSelect = document.getElementById('modeSelect');
const difficultySelect = document.getElementById('difficultySelect');
const mapSizeSelect = document.getElementById('mapSizeSelect');

// --- 游戏参数 ---
let gridSize = 20;
let tileCount = 20;
let canvasSize = 400;

// 默认速度配置
const SPEEDS = {
    easy: 200,
    medium: 150,
    hard: 100
};

// --- 游戏状态变量 ---
let snake, food, obstacles, direction, score, gameOver, changingDirection, isPaused;
let powerUp = null;
let activeEffects = [];
let gameInterval;
let currentSpeed;
let gameMode;
let doubleScoreActive = false;
let ghostModeActive = false;

// --- 初始化/重置游戏 ---
function initGame() {
    // 应用设置
    applySettings();
    
    // 重置状态
    snake = [{ x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) }];
    food = {};
    obstacles = [];
    powerUp = null;
    direction = 'right';
    score = 0;
    gameOver = false;
    isPaused = false;
    changingDirection = false;
    activeEffects = [];
    doubleScoreActive = false;
    ghostModeActive = false;
    
    // 更新UI
    updateUI();
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    
    // 清除旧的循环
    clearInterval(gameInterval);
    
    // 如果是障碍模式，生成障碍物
    if (gameMode === 'obstacle') {
        generateObstacles();
    }
    
    // 开始新游戏
    generateFood();
    
    // 5-15秒后尝试生成第一个道具
    setTimeout(generatePowerUp, Math.random() * 10000 + 5000);
    
    gameInterval = setInterval(main, currentSpeed);
}

// 生成障碍物
function generateObstacles() {
    obstacles = []; // 清空现有障碍物
    
    // 根据地图大小生成适量的障碍物
    const obstacleCount = Math.floor(tileCount * 0.15); // 地图大小的15%
    
    for (let i = 0; i < obstacleCount; i++) {
        const obstacle = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        // 确保障碍物不生成在蛇身上或食物上
        // 同时避免在蛇的起始位置周围生成障碍物
        const snakeStartX = Math.floor(tileCount / 2);
        const snakeStartY = Math.floor(tileCount / 2);
        const safeDistance = 3; // 与蛇起点的安全距离
        
        if (!isPositionOnSnake(obstacle) && 
            (obstacle.x !== food.x || obstacle.y !== food.y) &&
            (Math.abs(obstacle.x - snakeStartX) > safeDistance || 
             Math.abs(obstacle.y - snakeStartY) > safeDistance)) {
            obstacles.push(obstacle);
        } else {
            i--; // 重试
        }
    }
}

// --- 游戏主循环 ---
function main() {
    if (gameOver) {
        showGameOver();
        return;
    }
    
    if (isPaused) {
        return;
    }
    
    changingDirection = false;
    moveSnake();
    checkCollisions();
    draw();
}

// --- 移动、碰撞和绘制 ---
function moveSnake() {
    const head = { x: snake[0].x, y: snake[0].y };
    
    // 根据当前方向移动
    if (direction === 'up') head.y--;
    if (direction === 'down') head.y++;
    if (direction === 'left') head.x--;
    if (direction === 'right') head.x++;
    
    // 无墙模式：穿过边界
    if (gameMode === 'borderless') {
        if (head.x < 0) head.x = tileCount - 1;
        if (head.x >= tileCount) head.x = 0;
        if (head.y < 0) head.y = tileCount - 1;
        if (head.y >= tileCount) head.y = 0;
    }
    
    snake.unshift(head); // 将新头加到最前面
    
    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        // 计算得分
        let points = 1;
        if (doubleScoreActive) {
            points = 2;
        }
        score += points;
        
        updateUI();
        generateFood();
    } else {
        // 没吃到就移除蛇尾
        snake.pop();
    }
    
    // 检查是否吃到道具
    if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        activatePowerUp(powerUp.type);
        powerUp = null;
        
        // 5-15秒后再次尝试生成
        setTimeout(generatePowerUp, Math.random() * 10000 + 5000);
    }
}

function checkCollisions() {
    const head = snake[0];
    
    // 1. 撞墙 (仅在经典模式和障碍模式)
    if (gameMode !== 'borderless') {
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            gameOver = true;
            return;
        }
    }
    
    // 2. 撞自己 (除非幽灵模式激活)
    if (!ghostModeActive) {
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                gameOver = true;
                return;
            }
        }
    }
    
    // 3. 撞障碍物 (仅在障碍模式)
    if (gameMode === 'obstacle') {
        for (let obstacle of obstacles) {
            if (head.x === obstacle.x && head.y === obstacle.y) {
                gameOver = true;
                return;
            }
        }
    }
}

function draw() {
    // 清空画布
    ctx.fillStyle = '#34495e'; // 背景
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    // 绘制障碍物 (仅在障碍模式)
    if (gameMode === 'obstacle') {
        ctx.fillStyle = '#7f8c8d'; // 灰色
        for (let obstacle of obstacles) {
            ctx.fillRect(obstacle.x * gridSize, obstacle.y * gridSize, gridSize - 1, gridSize - 1);
        }
    }
    
    // 绘制蛇
    snake.forEach((part, index) => {
        // 如果幽灵模式激活，蛇身半透明
        if (ghostModeActive) {
            ctx.globalAlpha = 0.6;
        }
        
        // 蛇头用亮绿色，蛇身用深绿色
        ctx.fillStyle = index === 0 ? '#2ecc71' : '#27ae60';
        ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 1, gridSize - 1);
        
        // 重置透明度
        ctx.globalAlpha = 1.0;
    });
    
    // 绘制食物
    ctx.fillStyle = '#e74c3c'; // 红色
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 1, gridSize - 1);
    
    // 绘制道具
    if (powerUp) {
        switch(powerUp.type) {
            case 'speed_up':
                ctx.fillStyle = '#3498db'; // 蓝色
                break;
            case 'slow_down':
                ctx.fillStyle = '#f1c40f'; // 黄色
                break;
            case 'double_score':
                ctx.fillStyle = '#f39c12'; // 金色
                break;
            case 'ghost_mode':
                ctx.fillStyle = '#9b59b6'; // 紫色
                break;
            case 'shorten':
                ctx.fillStyle = '#2ecc71'; // 绿色
                break;
        }
        ctx.fillRect(powerUp.x * gridSize, powerUp.y * gridSize, gridSize - 1, gridSize - 1);
    }
    
    // 如果是无墙模式，绘制边界提示
    if (gameMode === 'borderless') {
        ctx.strokeStyle = '#3498db'; // 蓝色边框
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvasSize, canvasSize);
    }
}

// --- 食物和道具生成 ---
function generateFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    
    // 确保食物不生成在蛇身上或障碍物上
    if (isPositionOnSnake(food) || isPositionOnObstacle(food)) {
        generateFood();
    }
}

function generatePowerUp() {
    if (gameOver || isPaused || powerUp) return; // 如果游戏结束、暂停或已有道具，则不生成
    
    // 随机选择道具类型
    const types = ['speed_up', 'slow_down', 'double_score', 'ghost_mode', 'shorten'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const newPowerUp = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
        type: type
    };
    
    // 确保道具不生成在蛇身上、食物上或障碍物上
    if (!isPositionOnSnake(newPowerUp) && 
        (newPowerUp.x !== food.x || newPowerUp.y !== food.y) &&
        !isPositionOnObstacle(newPowerUp)) {
        powerUp = newPowerUp;
        
        // 道具出现8秒后消失
        setTimeout(() => {
            if (powerUp === newPowerUp) {
                powerUp = null;
                // 5-15秒后再次尝试生成
                setTimeout(generatePowerUp, Math.random() * 10000 + 5000);
            }
        }, 8000);
    } else {
        // 如果生成失败，1秒后重试
        setTimeout(generatePowerUp, 1000);
    }
}

// --- 辅助函数 ---
function isPositionOnSnake({x, y}) {
    return snake.some(part => part.x === x && part.y === y);
}

function isPositionOnObstacle({x, y}) {
    if (gameMode !== 'obstacle') return false;
    return obstacles.some(obstacle => obstacle.x === x && obstacle.y === y);
}

// --- 道具效果 ---
function activatePowerUp(type) {
    let effectName = '';
    let duration = 5000; // 默认5秒
    
    switch(type) {
        case 'speed_up':
            effectName = '加速';
            changeSpeed(currentSpeed / 2); // 速度减半 = 更快
            break;
            
        case 'slow_down':
            effectName = '减速';
            changeSpeed(currentSpeed * 2); // 速度翻倍 = 更慢
            break;
            
        case 'double_score':
            effectName = '双倍得分';
            doubleScoreActive = true;
            duration = 10000; // 10秒
            break;
            
        case 'ghost_mode':
            effectName = '穿墙';
            ghostModeActive = true;
            break;
            
        case 'shorten':
            effectName = '缩短';
            // 立即缩短蛇的长度，但保持最小长度为2
            const shortenAmount = Math.min(3, snake.length - 2);
            for (let i = 0; i < shortenAmount; i++) {
                snake.pop();
            }
            // 这个效果是即时的，不需要计时
            updateActiveEffects();
            return;
    }
    
    // 添加到活动效果列表
    const effect = { type, name: effectName, endTime: Date.now() + duration };
    activeEffects.push(effect);
    updateActiveEffects();
    
    // 设置定时器来结束效果
    setTimeout(() => {
        switch(type) {
            case 'speed_up':
            case 'slow_down':
                changeSpeed(SPEEDS[difficultySelect.value]); // 恢复默认速度
                break;
                
            case 'double_score':
                doubleScoreActive = false;
                break;
                
            case 'ghost_mode':
                ghostModeActive = false;
                break;
        }
        
        // 从活动效果列表中移除
        activeEffects = activeEffects.filter(e => e !== effect);
        updateActiveEffects();
    }, duration);
}

function changeSpeed(speed) {
    currentSpeed = speed;
    clearInterval(gameInterval);
    gameInterval = setInterval(main, currentSpeed);
}

// --- UI更新 ---
function updateUI() {
    scoreEl.textContent = score;
    const highScore = localStorage.getItem('snakeHighScore') || 0;
    highScoreEl.textContent = highScore;
}

function updateActiveEffects() {
    if (activeEffects.length === 0) {
        activeEffectsEl.textContent = '效果: 无';
    } else {
        activeEffectsEl.textContent = '效果: ' + activeEffects.map(e => e.name).join(', ');
    }
}

// --- 游戏流程控制 ---
function showGameOver() {
    clearInterval(gameInterval);
    
    const currentHighScore = localStorage.getItem('snakeHighScore') || 0;
    if (score > currentHighScore) {
        localStorage.setItem('snakeHighScore', score);
        highScoreEl.textContent = score;
    }
    
    finalScoreEl.textContent = score;
    finalHighScoreEl.textContent = localStorage.getItem('snakeHighScore') || 0;
    gameOverScreen.style.display = 'flex';
}

function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseScreen.style.display = 'flex';
    } else {
        pauseScreen.style.display = 'none';
    }
}

function changeDirection(newDirection) {
    if (changingDirection) return;
    changingDirection = true;
    
    const goingUp = direction === 'up';
    const goingDown = direction === 'down';
    const goingLeft = direction === 'left';
    const goingRight = direction === 'right';
    
    if (newDirection === 'up' && !goingDown) direction = 'up';
    if (newDirection === 'down' && !goingUp) direction = 'down';
    if (newDirection === 'left' && !goingRight) direction = 'left';
    if (newDirection === 'right' && !goingLeft) direction = 'right';
}

// --- 事件监听 ---
function handleKeydown(event) {
    if (gameOver) return;
    
    // 暂停控制
    if (event.key === 'p' || event.key === 'P') {
        togglePause();
        return;
    }
    
    if (isPaused) return;
    
    // 方向控制
    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        changeDirection('up');
    } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        changeDirection('down');
    } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        changeDirection('left');
    } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        changeDirection('right');
    }
}

// 键盘控制
document.addEventListener('keydown', handleKeydown);

// 按钮控制
startButton.addEventListener('click', initGame);
restartButton.addEventListener('click', initGame);
menuButton.addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'flex';
});

pauseButton.addEventListener('click', togglePause);
resumeButton.addEventListener('click', togglePause);
quitButton.addEventListener('click', () => {
    isPaused = false;
    pauseScreen.style.display = 'none';
    startScreen.style.display = 'flex';
});

// 移动控制按钮
upBtn.addEventListener('click', () => changeDirection('up'));
downBtn.addEventListener('click', () => changeDirection('down'));
leftBtn.addEventListener('click', () => changeDirection('left'));
rightBtn.addEventListener('click', () => changeDirection('right'));

// --- 初始加载 ---
highScoreEl.textContent = localStorage.getItem('snakeHighScore') || 0; 

// 应用游戏设置
function applySettings() {
    // 设置游戏模式
    gameMode = modeSelect.value;
    gameModeEl.textContent = `模式: ${getModeName(gameMode)}`;
    
    // 更新画布边框以反映当前模式
    canvas.parentElement.classList.remove('mode-classic', 'mode-borderless', 'mode-obstacle');
    canvas.parentElement.classList.add(`mode-${gameMode}`);
    
    // 设置难度/速度
    const difficulty = difficultySelect.value;
    currentSpeed = SPEEDS[difficulty];
    
    // 设置地图大小
    const mapSize = mapSizeSelect.value;
    if (mapSize === 'small') {
        tileCount = 15;
    } else if (mapSize === 'medium') {
        tileCount = 20;
    } else if (mapSize === 'large') {
        tileCount = 25;
    }
    
    // 调整网格大小以适应画布
    gridSize = canvasSize / tileCount;
}

function getModeName(mode) {
    switch(mode) {
        case 'classic': return '经典';
        case 'borderless': return '无墙';
        case 'obstacle': return '障碍';
        default: return '经典';
    }
} 