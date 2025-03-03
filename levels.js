// Get DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const objectiveElement = document.getElementById('objective');
const progressElement = document.getElementById('progress');
const debugElement = document.getElementById('debug');

// Game constants
const DEFAULT_GAME_SPEED = 100;
const MIN_GAME_SPEED = 50;
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

// Level configurations
const LEVELS = [
    {
        number: 1,
        objective: "Collect 5 food items to advance",
        requiredFood: 5,
        speed: DEFAULT_GAME_SPEED,
        obstacles: []
    },
    {
        number: 2,
        objective: "Collect 8 food items while avoiding walls",
        requiredFood: 8,
        speed: DEFAULT_GAME_SPEED - 10,
        obstacles: [
            { x: 10, y: 5, width: 2, height: 6 }
        ]
    },
    {
        number: 3,
        objective: "Collect 10 food items in a maze",
        requiredFood: 10,
        speed: DEFAULT_GAME_SPEED - 20,
        obstacles: [
            { x: 5, y: 5, width: 2, height: 10 },
            { x: 15, y: 5, width: 2, height: 10 }
        ]
    },
    // Add more levels here
];

// Game state
let currentLevel = 0;
let foodCollected = 0;
let snake = [{ x: 10, y: 10 }];
let food = { x: 5, y: 5 };
let dx = 0;
let dy = 0;
let score = 0;
let gameSpeed = DEFAULT_GAME_SPEED;
let gameLoop;
let isGameOver = false;

// Audio elements
const backgroundMusic = document.getElementById('backgroundMusic');
const foodSound = document.getElementById('foodSound');
const gameOverSound = document.getElementById('gameOverSound');
const levelUpSound = document.getElementById('levelUpSound');
const soundToggle = document.getElementById('soundToggle');
let isSoundOn = true;

// Update sound toggle initialization
if (soundToggle) {
    soundToggle.textContent = '🔊 Sound: ON';
    soundToggle.classList.remove('muted');
}

// Start background music immediately when game starts
try {
    backgroundMusic.play();
} catch (error) {
    console.log('Error playing background music:', error);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (isGameOver && e.code !== 'Space') {
        return;
    }

    let tempDx = 0;
    let tempDy = 0;

    switch(e.key) {
        case 'ArrowUp':
            if (dy !== 1) { tempDx = 0; tempDy = -1; }
            break;
        case 'ArrowDown':
            if (dy !== -1) { tempDx = 0; tempDy = 1; }
            break;
        case 'ArrowLeft':
            if (dx !== 1) { tempDx = -1; tempDy = 0; }
            break;
        case 'ArrowRight':
            if (dx !== -1) { tempDx = 1; tempDy = 0; }
            break;
    }

    if (tempDx !== 0 || tempDy !== 0) {
        dx = tempDx;
        dy = tempDy;
    }
});

function playSound(sound) {
    if (isSoundOn) {
        try {
            sound.currentTime = 0;
            sound.play();
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    }
}

function updateProgress() {
    const level = LEVELS[currentLevel];
    const progress = (foodCollected / level.requiredFood) * 100;
    progressElement.style.width = `${progress}%`;
}

function checkLevelComplete() {
    const level = LEVELS[currentLevel];
    if (foodCollected >= level.requiredFood) {
        playSound(levelUpSound);
        currentLevel++;
        
        if (currentLevel >= LEVELS.length) {
            handleGameWin();
            return;
        }

        foodCollected = 0;
        updateProgress();
        const newLevel = LEVELS[currentLevel];
        levelElement.textContent = newLevel.number;
        objectiveElement.textContent = newLevel.objective;
        gameSpeed = newLevel.speed;
        clearInterval(gameLoop);
        gameLoop = setInterval(drawGame, gameSpeed);
        generateFood();
    }
}

function handleGameWin() {
    isGameOver = true;
    clearInterval(gameLoop);
    backgroundMusic.pause();
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2 - 50);
    ctx.fillText('You Won!', canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ecf0f1';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText('Press Space to Play Again', canvas.width / 2, canvas.height / 2 + 100);
    
    document.addEventListener('keydown', restartGame);
}

function drawObstacles() {
    const level = LEVELS[currentLevel];
    ctx.fillStyle = '#c0392b';
    
    level.obstacles.forEach(obstacle => {
        ctx.fillRect(
            obstacle.x * GRID_SIZE,
            obstacle.y * GRID_SIZE,
            obstacle.width * GRID_SIZE,
            obstacle.height * GRID_SIZE
        );
    });
}

function checkObstacleCollision(x, y) {
    const level = LEVELS[currentLevel];
    return level.obstacles.some(obstacle => {
        return x >= obstacle.x && x < obstacle.x + obstacle.width &&
               y >= obstacle.y && y < obstacle.y + obstacle.height;
    });
}

function drawGame() {
    try {
        if (!isGameOver) {
            // Clear canvas
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw obstacles
            drawObstacles();

            // Move snake
            const head = { x: snake[0].x + dx, y: snake[0].y + dy };
            snake.unshift(head);

            // Check for collisions
            if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT ||
                checkSnakeCollision() || checkObstacleCollision(head.x, head.y)) {
                handleGameOver();
                return;
            }

            // Check for food collision
            if (head.x === food.x && head.y === food.y) {
                playSound(foodSound);
                score += 10;
                foodCollected++;
                scoreElement.textContent = score;
                updateProgress();
                generateFood();
                checkLevelComplete();
            } else {
                snake.pop();
            }

            // Draw snake
            snake.forEach((segment, index) => {
                ctx.fillStyle = index === 0 ? '#27ae60' : '#2ecc71';
                ctx.fillRect(
                    segment.x * GRID_SIZE + 1,
                    segment.y * GRID_SIZE + 1,
                    GRID_SIZE - 2,
                    GRID_SIZE - 2
                );
            });

            // Draw food
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            const centerX = food.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = food.y * GRID_SIZE + GRID_SIZE / 2;
            ctx.arc(centerX, centerY, (GRID_SIZE - 4) / 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    } catch (error) {
        console.error('Error in drawGame:', error);
    }
}

function generateFood() {
    while (true) {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        
        // Check if food spawned on snake or obstacles
        if (!snake.some(segment => segment.x === food.x && segment.y === food.y) &&
            !checkObstacleCollision(food.x, food.y)) {
            break;
        }
    }
}

function checkSnakeCollision() {
    return snake.slice(1).some(segment => segment.x === snake[0].x && segment.y === snake[0].y);
}

function handleGameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    backgroundMusic.pause();
    playSound(gameOverSound);
    
    setTimeout(() => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`Level: ${LEVELS[currentLevel].number}`, canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('Press Space to Try Again', canvas.width / 2, canvas.height / 2 + 80);
        
        document.addEventListener('keydown', restartGame);
    }, 1000);
}

function restartGame(e) {
    if (e.code === 'Space') {
        document.removeEventListener('keydown', restartGame);
        currentLevel = 0;
        foodCollected = 0;
        snake = [{ x: 10, y: 10 }];
        dx = 0;
        dy = 0;
        score = 0;
        isGameOver = false;
        gameSpeed = LEVELS[currentLevel].speed;
        
        scoreElement.textContent = score;
        levelElement.textContent = LEVELS[currentLevel].number;
        objectiveElement.textContent = LEVELS[currentLevel].objective;
        updateProgress();
        
        generateFood();
        
        if (isSoundOn) {
            try {
                backgroundMusic.play();
            } catch (error) {
                console.log('Error playing background music:', error);
            }
        }
        
        if (gameLoop) {
            clearInterval(gameLoop);
        }
        gameLoop = setInterval(drawGame, gameSpeed);
    }
}

// Start game
levelElement.textContent = LEVELS[currentLevel].number;
objectiveElement.textContent = LEVELS[currentLevel].objective;
generateFood();
gameLoop = setInterval(drawGame, gameSpeed); 