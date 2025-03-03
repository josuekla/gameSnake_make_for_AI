const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const debugElement = document.getElementById('debug');
const timerElement = document.getElementById('timer');

// Game constants
const DEFAULT_GAME_SPEED = 100;
const MIN_GAME_SPEED = 50;
const SPEED_BOOST_REDUCTION = 30;

// Timer variables
let startTime = 0;
let timerInterval = null;

// Enable debug mode
const DEBUG = true;
if (DEBUG) {
    debugElement.style.display = 'block';
}

// Special food types and their properties
const SPECIAL_FOOD_TYPES = {
    SPEED_BOOST: {
        color: '#f1c40f',
        duration: 5000,
        probability: 0.2,
        effect: () => {
            const originalSpeed = gameSpeed;
            gameSpeed = Math.max(30, gameSpeed - SPEED_BOOST_REDUCTION);
            clearInterval(gameLoop);
            gameLoop = setInterval(drawGame, gameSpeed);
            
            // Store the timeout to clear it if needed
            currentSpeedBoostTimeout = setTimeout(() => {
                gameSpeed = originalSpeed;
                clearInterval(gameLoop);
                gameLoop = setInterval(drawGame, gameSpeed);
                currentSpeedBoostTimeout = null;
            }, 5000);
        }
    },
    GROWTH_BONUS: {
        color: '#9b59b6',
        duration: 0,
        probability: 0.3,
        effect: () => {
            // Add three extra segments
            for (let i = 0; i < 3; i++) {
                snake.push({ ...snake[snake.length - 1] });
            }
        }
    },
    EXTRA_POINTS: {
        color: '#e67e22',
        duration: 0,
        probability: 0.3,
        effect: () => {
            score += 50;
            scoreElement.textContent = score;
        }
    },
    MEGA_POINTS: {
        color: '#e74c3c',
        duration: 0,
        probability: 0.2,
        effect: () => {
            score += 100;
            scoreElement.textContent = score;
        }
    },
    TAIL_REDUCTION: {
        color: '#3498db',
        duration: 0,
        probability: 0.2,
        effect: () => {
            if (snake.length > 6) { // Only reduce if snake is longer than 6 segments
                snake = snake.slice(0, snake.length - 5); // Remove last 5 segments
            }
        }
    }
};

// Game state variables
let controlsReversed = false;
let specialFood = null;
let specialFoodTimer = null;
let currentSpeedBoostTimeout = null;
let currentControlTimeout = null;
let gameSpeed = DEFAULT_GAME_SPEED;
let gameLoop;

function clearAllEffects() {
    // Clear speed boost timeout
    if (currentSpeedBoostTimeout) {
        clearTimeout(currentSpeedBoostTimeout);
        currentSpeedBoostTimeout = null;
    }
    
    // Clear control reversal timeout
    if (currentControlTimeout) {
        clearTimeout(currentControlTimeout);
        currentControlTimeout = null;
    }
    
    // Reset all effect states
    controlsReversed = false;
    gameSpeed = DEFAULT_GAME_SPEED;
    
    // Clear any existing game loop and restart with default speed
    clearInterval(gameLoop);
    gameLoop = setInterval(drawGame, gameSpeed);
}

function updateDebug(info) {
    if (DEBUG) {
        debugElement.innerHTML = `
            Canvas: ${canvas.width}x${canvas.height}<br>
            Snake Head: (${snake[0].x}, ${snake[0].y})<br>
            Food: (${food.x}, ${food.y})<br>
            Direction: dx=${dx}, dy=${dy}<br>
            Controls Reversed: ${controlsReversed}<br>
            Special Food: ${specialFood ? specialFood.type : 'None'}<br>
            ${info || ''}
        `;
    }
}

// Audio elements with error handling
const backgroundMusic = document.getElementById('backgroundMusic');
const foodSound = document.getElementById('foodSound');
const gameOverSound = document.getElementById('gameOverSound');
const soundToggle = document.getElementById('soundToggle');

let isSoundOn = true; // Start with sound on
let isGameOver = false; // Renamed from gameOver to isGameOver

// Error handling for audio loading
function handleAudioError(audio, name) {
    console.log(`Could not load ${name} audio file. Game will continue without sound.`);
    isSoundOn = false;
    soundToggle.textContent = '🔊 Sound: OFF';
    soundToggle.classList.add('muted');
}

backgroundMusic.onerror = () => handleAudioError(backgroundMusic, 'background');
foodSound.onerror = () => handleAudioError(foodSound, 'food');
gameOverSound.onerror = () => handleAudioError(gameOverSound, 'game over');

// Sound controls
soundToggle.addEventListener('click', () => {
    isSoundOn = !isSoundOn;
    soundToggle.textContent = `🔊 Sound: ${isSoundOn ? 'ON' : 'OFF'}`;
    soundToggle.classList.toggle('muted');
    
    if (isSoundOn) {
        if (!isGameOver) {
            try {
                backgroundMusic.play();
            } catch (error) {
                console.log('Error playing background music:', error);
            }
        }
    } else {
        backgroundMusic.pause();
    }
});

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [
    { x: 10, y: 10 }
];
let food = { x: 5, y: 5 };
let dx = 0;
let dy = 0;
let score = 0;

// Debug info
console.log('Canvas size:', canvas.width, 'x', canvas.height);
console.log('Grid size:', gridSize);
console.log('Tile count:', tileCount);

function updateTimer() {
    if (!isGameOver) {
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000); // Convert to seconds
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function startTimer() {
    startTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

document.addEventListener('keydown', (e) => {
    if (isGameOver && e.code !== 'Space') {
        return;
    }

    let tempDx = 0;
    let tempDy = 0;

    switch(e.key) {
        case 'ArrowUp':
            // Only allow up if not moving down
            if (dy !== 1) { tempDx = 0; tempDy = -1; }
            break;
        case 'ArrowDown':
            // Only allow down if not moving up
            if (dy !== -1) { tempDx = 0; tempDy = 1; }
            break;
        case 'ArrowLeft':
            // Only allow left if not moving right
            if (dx !== 1) { tempDx = -1; tempDy = 0; }
            break;
        case 'ArrowRight':
            // Only allow right if not moving left
            if (dx !== -1) { tempDx = 1; tempDy = 0; }
            break;
    }

    // Only update direction if a valid move was made
    if (tempDx !== 0 || tempDy !== 0) {
        // Start timer on first movement
        if (dx === 0 && dy === 0) {
            startTimer();
        }
        // Apply control reversal if active
        if (controlsReversed) {
            dx = -tempDx;
            dy = -tempDy;
        } else {
            dx = tempDx;
            dy = tempDy;
        }
    }
    
    updateDebug('Key pressed: ' + e.key);
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

function spawnSpecialFood() {
    // Clear any existing special food
    if (specialFoodTimer) {
        clearTimeout(specialFoodTimer);
    }

    // Randomly decide whether to spawn special food
    if (Math.random() < 0.3) { // 30% chance to spawn special food
        // Choose a random special food type
        const types = Object.keys(SPECIAL_FOOD_TYPES);
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        specialFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
            type: randomType
        };

        // Make special food disappear after 5 seconds
        specialFoodTimer = setTimeout(() => {
            specialFood = null;
        }, 5000);
    } else {
        specialFood = null;
    }
}

function drawGame() {
    try {
        // Only clear and redraw if the game is not over
        if (!isGameOver) {
            // Clear canvas with background color
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw grid lines (for debugging)
            if (DEBUG) {
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 0.5;
                for (let i = 0; i <= tileCount; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * gridSize, 0);
                    ctx.lineTo(i * gridSize, canvas.height);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, i * gridSize);
                    ctx.lineTo(canvas.width, i * gridSize);
                    ctx.stroke();
                }
            }

            // Move snake
            const head = { x: snake[0].x + dx, y: snake[0].y + dy };
            snake.unshift(head);

            // Check for collision with regular food
            if (head.x === food.x && head.y === food.y) {
                playSound(foodSound);
                score += 10;
                scoreElement.textContent = score;
                generateFood();
                spawnSpecialFood(); // Chance to spawn special food
                gameSpeed = Math.max(50, gameSpeed - 2);
                clearInterval(gameLoop);
                gameLoop = setInterval(drawGame, gameSpeed);
            } else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
                // Handle special food collision
                playSound(foodSound);
                SPECIAL_FOOD_TYPES[specialFood.type].effect();
                specialFood = null;
                if (specialFoodTimer) {
                    clearTimeout(specialFoodTimer);
                }
            } else {
                snake.pop();
            }

            // Check for collision with walls or self
            if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || checkSnakeCollision()) {
                handleGameOver();
                return;
            }

            // Draw snake with effects
            snake.forEach((segment, index) => {
                // Draw snake body with special effects
                let bodyColor = index === 0 ? '#27ae60' : '#2ecc71';
                
                // Visual feedback for special effects
                if (controlsReversed) {
                    bodyColor = index === 0 ? '#c0392b' : '#e74c3c';
                }
                
                ctx.fillStyle = bodyColor;
                ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
                
                // Draw eyes for head
                if (index === 0) {
                    ctx.fillStyle = '#000';
                    const eyeSize = 3;
                    ctx.fillRect(segment.x * gridSize + 5, segment.y * gridSize + 5, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * gridSize + gridSize - 8, segment.y * gridSize + 5, eyeSize, eyeSize);
                }
            });

            // Draw regular food
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            const centerX = food.x * gridSize + gridSize / 2;
            const centerY = food.y * gridSize + gridSize / 2;
            ctx.arc(centerX, centerY, (gridSize - 4) / 2, 0, 2 * Math.PI);
            ctx.fill();

            // Draw special food if it exists
            if (specialFood) {
                const type = SPECIAL_FOOD_TYPES[specialFood.type];
                ctx.fillStyle = type.color;
                const specialCenterX = specialFood.x * gridSize + gridSize / 2;
                const specialCenterY = specialFood.y * gridSize + gridSize / 2;
                
                // Draw special food with star shape
                drawStar(specialCenterX, specialCenterY, 5, gridSize / 2, gridSize / 4);
            }
        }

        updateDebug();
    } catch (error) {
        console.error('Error in drawGame:', error);
    }
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    // Check if food spawned on snake
    if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        generateFood();
    }
    updateDebug('Food generated');
}

function checkSnakeCollision() {
    return snake.slice(1).some(segment => segment.x === snake[0].x && segment.y === snake[0].y);
}

function handleGameOver() {
    isGameOver = true;
    clearInterval(gameLoop); // Stop the game loop
    stopTimer(); // Stop the timer
    clearAllEffects(); // Clear all active effects
    backgroundMusic.pause();
    playSound(gameOverSound);
    
    // Clear the canvas once before showing game over screen
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Increase initial delay before showing game over screen
    setTimeout(() => {
        // Fade in the background more slowly
        let bgAlpha = 0;
        const fadeInBg = () => {
            bgAlpha = Math.min(bgAlpha + 0.02, 0.75); // Slower fade
            ctx.fillStyle = `rgba(0, 0, 0, ${bgAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (bgAlpha < 0.75) {
                requestAnimationFrame(fadeInBg);
            } else {
                // After background fade completes, wait a bit before showing text
                setTimeout(() => {
                    showGameOverText();
                }, 300);
            }
        };
        
        const showGameOverText = () => {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ecf0f1';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Slower text animation
            let textScale = 0;
            const animateText = () => {
                textScale = Math.min(textScale + 0.03, 1); // Slower scale
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2 - 40);
                ctx.scale(textScale, textScale);
                ctx.fillText('Game Over!', 0, 0);
                ctx.restore();
                
                if (textScale < 1) {
                    requestAnimationFrame(animateText);
                } else {
                    // Add delay before showing score
                    setTimeout(() => {
                        showScoreAndRestart();
                    }, 400);
                }
            };
            
            const showScoreAndRestart = () => {
                let alpha = 0;
                const fadeInInfo = () => {
                    alpha = Math.min(alpha + 0.02, 1); // Slower fade
                    ctx.fillStyle = `rgba(236, 240, 241, ${alpha})`;
                    ctx.font = 'bold 24px Arial';
                    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
                    
                    // Slower pulse effect for restart text
                    const pulse = Math.sin(Date.now() / 800) * 0.1 + 0.9;
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2 + 60);
                    ctx.scale(pulse, pulse);
                    ctx.fillText('Press Space to Restart', 0, 0);
                    ctx.restore();
                    
                    if (alpha < 1) {
                        requestAnimationFrame(fadeInInfo);
                    } else {
                        // Continue pulsing the restart text
                        requestAnimationFrame(function pulseText() {
                            if (isGameOver) {  // Only continue if still game over
                                ctx.fillStyle = '#1a1a1a';
                                ctx.fillRect(0, canvas.height / 2 + 40, canvas.width, 40);
                                
                                const pulse = Math.sin(Date.now() / 800) * 0.1 + 0.9;
                                ctx.fillStyle = '#ecf0f1';
                                ctx.save();
                                ctx.translate(canvas.width / 2, canvas.height / 2 + 60);
                                ctx.scale(pulse, pulse);
                                ctx.fillText('Press Space to Restart', 0, 0);
                                ctx.restore();
                                
                                requestAnimationFrame(pulseText);
                            }
                        });
                    }
                };
                fadeInInfo();
            };
            
            animateText();
            ctx.restore();
        };
        
        fadeInBg();
        
        // Add more delay before enabling restart
        setTimeout(() => {
            document.removeEventListener('keydown', restartGame);
            document.addEventListener('keydown', restartGame);
            updateDebug('Ready for restart');
        }, 2000); // Increased to 2 seconds
    }, 1000); // Initial delay of 1 second

    updateDebug('Game Over!');
}

function restartGame(e) {
    if (e.code === 'Space') {
        // Add a fade out effect before restarting
        let alpha = 1;
        const fadeOut = () => {
            alpha = Math.max(alpha - 0.05, 0);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (alpha > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                actuallyRestartGame();
            }
        };
        fadeOut();
    }
}

function actuallyRestartGame() {
    console.log('Restarting game...');
    isGameOver = false;
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    score = 0;
    gameSpeed = DEFAULT_GAME_SPEED; // Reset to default speed
    controlsReversed = false;
    specialFood = null;
    timerElement.textContent = '0:00'; // Reset timer display
    
    // Clear all timeouts and effects
    clearAllEffects();
    if (specialFoodTimer) {
        clearTimeout(specialFoodTimer);
    }
    
    scoreElement.textContent = score;
    generateFood();
    
    // Remove the restart listener
    document.removeEventListener('keydown', restartGame);
    
    if (isSoundOn) {
        try {
            backgroundMusic.play();
        } catch (error) {
            console.log('Error playing background music:', error);
        }
    }
    
    // Ensure the game loop is properly restarted
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    gameLoop = setInterval(drawGame, gameSpeed);
    
    // Clear the canvas and draw initial state
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGame();
    
    updateDebug('Game Restarted');
}

// Start game
console.log('Starting game...');
generateFood();
gameLoop = setInterval(drawGame, gameSpeed);

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