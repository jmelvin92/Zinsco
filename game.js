// SIMPLE FULLSCREEN GAME
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// FORCE FULLSCREEN - USE SCREEN DIMENSIONS DIRECTLY
function makeFullscreen() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log(`FULLSCREEN: ${canvas.width}x${canvas.height}`);
}
makeFullscreen();
window.onresize = makeFullscreen;

// Game constants
const GRAVITY = 0.4;
const JETPACK_POWER = -1.0;
const MAX_VELOCITY = 8;
const MOON_DISTANCE = 10000;
const FUEL_CONSUMPTION = 0.2;
const FUEL_REFILL = 25;

class Game {
    constructor() {
        this.state = 'menu';
        this.score = 0;
        this.distance = 0;
        this.maxDistance = 0;
        this.cameraY = 0;
        this.stars = [];
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.frameCount = 0;
        this.mouseX = canvas.width / 2; // Track mouse position
        this.mouseY = canvas.height / 2;
        this.belowBorderTime = 0; // Time spent below border
        this.isBelowBorder = false; // Flag for below border state
        this.borderWarningTime = 180; // 3 seconds at 60fps
        this.lastFuelDrop = 0; // Timer for fuel drops
        this.fuelDropInterval = 180; // Drop fuel every 3 seconds
        
        this.initStars();
        this.bindEvents();
    }
    
    initStars() {
        for (let i = 0; i < 200; i++) {  // More stars for bigger world
            this.stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 20 - canvas.height * 10,
                size: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.1
            });
        }
    }
    
    bindEvents() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('retryBtn').addEventListener('click', () => this.start());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.start());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareScore());
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            if (this.state !== 'playing') return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                zinsco.jetpackOn = true;
            }
            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                zinsco.movingLeft = true;
            }
            if (e.code === 'ArrowRight') {
                e.preventDefault();
                zinsco.movingRight = true;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                zinsco.jetpackOn = false;
            }
            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                zinsco.movingLeft = false;
            }
            if (e.code === 'ArrowRight') {
                e.preventDefault();
                zinsco.movingRight = false;
            }
        });
        
        // Mouse/touch controls with directional movement
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', () => {
            if (this.state === 'playing') {
                zinsco.jetpackOn = true;
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            zinsco.jetpackOn = false;
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.touches[0].clientX - rect.left;
            this.mouseY = e.touches[0].clientY - rect.top;
        });
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.state === 'playing') {
                zinsco.jetpackOn = true;
            }
            const rect = canvas.getBoundingClientRect();
            this.mouseX = e.touches[0].clientX - rect.left;
            this.mouseY = e.touches[0].clientY - rect.top;
        });
        
        canvas.addEventListener('touchend', () => {
            zinsco.jetpackOn = false;
        });
    }
    
    start() {
        console.log('GAME START');
        this.state = 'playing';
        this.score = 0;
        this.distance = 0;
        this.maxDistance = 0;
        this.frameCount = 0;
        this.cameraY = canvas.height * 0.2 - canvas.height * 0.7;
        this.obstacles = [];
        this.collectibles = [];
        this.particles = [];
        this.belowBorderTime = 0; // Reset border timer
        this.isBelowBorder = false;
        this.lastFuelDrop = 0; // Reset fuel drop timer
        
        // Reset player
        zinsco.reset();
        moon.reset();
        
        // Generate level
        this.generateLevel();
        
        // Show game
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('victoryScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'flex';
    }
    
    generateLevel() {
        for (let i = 2; i < 80; i++) {  // More levels for bigger world
            const yPos = -i * 300; // Spread out more
            
            if (Math.random() < 0.2) { // Fewer obstacles so world feels bigger
                this.obstacles.push(new Asteroid(
                    Math.random() * (canvas.width - 80) + 40,
                    yPos
                ));
            }
            
            if (Math.random() < 0.25) { // Only coins in static level now
                this.collectibles.push(new Collectible(
                    Math.random() * (canvas.width - 40) + 20,
                    yPos - 50,
                    'coin' // Only coins - fuel will fall from sky
                ));
            }
        }
    }
    
    dropFuelCanister() {
        // Drop fuel canister from top of visible screen
        const dropX = Math.random() * (canvas.width - 60) + 30; // Random X position
        const dropY = this.cameraY - 50; // Just above visible screen
        
        // Create falling fuel canister
        const fuelCanister = new FallingFuel(dropX, dropY);
        this.collectibles.push(fuelCanister);
        
        console.log(`Fuel canister dropped at x:${dropX.toFixed(0)}, y:${dropY.toFixed(0)}`);
    }
    
    update() {
        if (this.state !== 'playing') return;
        
        this.frameCount++;
        
        // Update player
        zinsco.update();
        
        // Update camera
        const targetCameraY = zinsco.y - canvas.height * 0.7;
        if (targetCameraY < this.cameraY) {
            this.cameraY = targetCameraY;
        }
        
        // Drop fuel canisters from sky consistently
        if (this.frameCount - this.lastFuelDrop > this.fuelDropInterval) {
            this.dropFuelCanister();
            this.lastFuelDrop = this.frameCount;
        }
        
        // Calculate distance
        const startingY = canvas.height * 0.2;
        this.distance = Math.max(0, Math.floor((startingY - zinsco.y) / 10));
        this.maxDistance = Math.max(this.maxDistance, this.distance);
        
        // Update stars
        this.stars.forEach(star => {
            if (star.y - this.cameraY > canvas.height) {
                star.y = this.cameraY - 20;
                star.x = Math.random() * canvas.width;
            }
        });
        
        // Update obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            obstacle.update();
            
            if (obstacle.y - this.cameraY > canvas.height + 100) {
                return false;
            }
            
            if (this.frameCount > 120 && this.checkCollision(zinsco, obstacle)) {
                this.gameOver('Hit an asteroid!');
            }
            
            return true;
        });
        
        // Update collectibles
        this.collectibles = this.collectibles.filter(collectible => {
            collectible.update();
            
            if (collectible.y - this.cameraY > canvas.height + 50) {
                return false;
            }
            
            if (!collectible.collected && this.checkCollision(zinsco, collectible)) {
                collectible.collect();
                if (collectible.type === 'fuel') {
                    const oldFuel = zinsco.fuel;
                    zinsco.fuel = Math.min(100, zinsco.fuel + FUEL_REFILL);
                    this.score += 50;
                    
                    // Add fuel pickup particles
                    for (let i = 0; i < 8; i++) {
                        this.particles.push(new FuelParticle(
                            collectible.x + collectible.width/2,
                            collectible.y + collectible.height/2,
                            (Math.random() - 0.5) * 4,
                            (Math.random() - 0.5) * 4
                        ));
                    }
                    
                    console.log(`Fuel collected! ${oldFuel.toFixed(1)} -> ${zinsco.fuel.toFixed(1)}`);
                } else {
                    this.score += 100;
                }
                return false;
            }
            
            return !collectible.collected;
        });
        
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
        
        // Create jetpack particles
        if (zinsco.jetpackOn && zinsco.fuel > 0 && Math.random() < 0.8) {
            this.particles.push(new Particle(
                zinsco.x + zinsco.width/2,
                zinsco.y + zinsco.height,
                (Math.random() - 0.5) * 2,
                Math.random() * 2 + 1
            ));
        }
        
        // Generate more level
        if (this.obstacles.length < 20) {
            this.generateLevel();
        }
        
        // Update moon
        moon.update(this.distance);
        
        // Check victory
        if (this.distance >= MOON_DISTANCE) {
            this.victory();
            return;
        }
        
        // Check if player is below visible border
        const screenBottom = this.cameraY + canvas.height;
        const playerBelow = zinsco.y > screenBottom;
        
        if (playerBelow) {
            if (!this.isBelowBorder) {
                // Just went below border - start timer
                this.isBelowBorder = true;
                this.belowBorderTime = 0;
            }
            this.belowBorderTime++;
            
            // Check if 3 seconds have passed
            if (this.belowBorderTime >= this.borderWarningTime) {
                this.gameOver('Fell out of bounds!');
                return;
            }
        } else {
            // Player is back in bounds - reset timer
            if (this.isBelowBorder) {
                this.isBelowBorder = false;
                this.belowBorderTime = 0;
            }
        }
        
        // Check other game over conditions (after 3 seconds)
        if (this.frameCount > 180) {
            if (zinsco.fuel <= 0 && zinsco.velocityY > 5) {
                this.gameOver('Ran out of fuel!');
                return;
            }
        }
        
        this.updateHUD();
    }
    
    checkCollision(obj1, obj2) {
        const margin = 5;
        return obj1.x + margin < obj2.x + obj2.width &&
               obj1.x + obj1.width - margin > obj2.x &&
               obj1.y + margin < obj2.y + obj2.height &&
               obj1.y + obj1.height - margin > obj2.y;
    }
    
    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('distance').textContent = this.distance + 'm';
        document.getElementById('moonDistance').textContent = Math.max(0, MOON_DISTANCE - this.distance) + 'm';
        
        const fuelPercent = Math.max(0, Math.min(100, zinsco.fuel));
        document.getElementById('fuelLevel').style.width = fuelPercent + '%';
        
        if (zinsco.fuel < 20) {
            document.getElementById('fuelLevel').style.background = '#ff4444';
        } else if (zinsco.fuel < 50) {
            document.getElementById('fuelLevel').style.background = '#ffaa00';
        } else {
            document.getElementById('fuelLevel').style.background = '#00ff88';
        }
    }
    
    render() {
        // Clear canvas
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(10, 10, 20, 0.8)');
        gradient.addColorStop(1, 'rgba(40, 20, 60, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply camera transform
        ctx.save();
        ctx.translate(0, -this.cameraY);
        
        // Draw stars
        ctx.fillStyle = 'white';
        this.stars.forEach(star => {
            ctx.globalAlpha = star.size / 2;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        ctx.globalAlpha = 1;
        
        // Draw moon
        moon.render(ctx);
        
        // Draw collectibles
        this.collectibles.forEach(collectible => collectible.render(ctx));
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => obstacle.render(ctx));
        
        // Draw particles
        this.particles.forEach(particle => particle.render(ctx));
        
        // Draw player
        zinsco.render(ctx);
        
        ctx.restore();
        
        // Draw below-border warning (after camera transform is restored)
        if (this.isBelowBorder) {
            const timeLeft = this.borderWarningTime - this.belowBorderTime;
            const secondsLeft = Math.ceil(timeLeft / 60);
            
            // Flashing red overlay
            ctx.save();
            ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.belowBorderTime * 0.3);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Warning text
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 48px Orbitron, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('OUT OF BOUNDS!', canvas.width / 2, canvas.height / 2 - 40);
            
            ctx.font = 'bold 32px Orbitron, monospace';
            ctx.fillText(`Return in ${secondsLeft} seconds!`, canvas.width / 2, canvas.height / 2 + 20);
            
            ctx.restore();
        }
    }
    
    gameOver(reason) {
        this.state = 'gameover';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('failReason').textContent = reason;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalDistance').textContent = this.maxDistance + 'm';
    }
    
    victory() {
        this.state = 'victory';
        this.score += Math.floor(zinsco.fuel * 10);
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('victoryScreen').style.display = 'flex';
        document.getElementById('victoryScore').textContent = this.score;
        document.getElementById('victoryFuel').textContent = Math.floor(zinsco.fuel) + '%';
    }
    
    shareScore() {
        const text = `🚀 I helped Zinsco reach the moon! Score: ${this.score} points! Can you beat it?`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=Zinsco,ToTheMoon,GameScore`;
        window.open(url, '_blank');
    }
}

class Zinsco {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = canvas.width / 2 - 20;
        this.y = canvas.height * 0.2; // Start at 20% down from top
        this.width = 40; // Back to original size
        this.height = 50; // Back to original size
        this.velocityX = 0;
        this.velocityY = 0;
        this.fuel = 100;
        this.jetpackOn = false;
        this.movingLeft = false;
        this.movingRight = false;
    }
    
    update() {
        // Apply jetpack
        if (this.jetpackOn && this.fuel > 0) {
            this.velocityY += JETPACK_POWER;
            this.fuel -= FUEL_CONSUMPTION;
            this.fuel = Math.max(0, this.fuel);
        }
        
        // Apply gravity
        this.velocityY += GRAVITY;
        
        // Mouse-based horizontal movement
        const playerCenterX = this.x + this.width / 2;
        const mouseDirection = game.mouseX - playerCenterX;
        const deadZone = 30; // Dead zone around player to prevent jittering
        
        if (Math.abs(mouseDirection) > deadZone) {
            if (mouseDirection < -deadZone) {
                this.velocityX -= 0.6; // Move left toward mouse
            } else if (mouseDirection > deadZone) {
                this.velocityX += 0.6; // Move right toward mouse
            }
        }
        
        // Keyboard movement (still works as backup)
        if (this.movingLeft) {
            this.velocityX -= 0.6;
        }
        if (this.movingRight) {
            this.velocityX += 0.6;
        }
        
        // Apply friction
        this.velocityX *= 0.9;
        
        // Limit velocities (faster horizontal speed)
        this.velocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.velocityY));
        this.velocityX = Math.max(-6, Math.min(6, this.velocityX)); // Increased for challenge
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Keep within bounds
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw Zinsco body
        ctx.fillStyle = '#00ddaa';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw eyes (original size)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 15, 6, 0, Math.PI * 2);
        ctx.arc(this.x + 28, this.y + 15, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x + 13, this.y + 15, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 27, this.y + 15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw jetpack (original size)
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(this.x + 5, this.y + 35, 10, 12);
        ctx.fillRect(this.x + 25, this.y + 35, 10, 12);
        
        // Draw flames if jetpack active (original size)
        if (this.jetpackOn && this.fuel > 0) {
            ctx.fillStyle = '#ffaa00';
            const flameHeight = 10 + Math.random() * 10;
            ctx.fillRect(this.x + 7, this.y + 47, 6, flameHeight);
            ctx.fillRect(this.x + 27, this.y + 47, 6, flameHeight);
            
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x + 9, this.y + 47, 2, flameHeight * 0.7);
            ctx.fillRect(this.x + 29, this.y + 47, 2, flameHeight * 0.7);
        }
        
        // Draw antennas (original size)
        ctx.strokeStyle = '#00ddaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y);
        ctx.lineTo(this.x + 15, this.y - 8);
        ctx.moveTo(this.x + 25, this.y);
        ctx.lineTo(this.x + 25, this.y - 8);
        ctx.stroke();
        
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y - 10, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 25, this.y - 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class Asteroid {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40 + Math.random() * 30;
        this.height = 40 + Math.random() * 30;
        this.speed = (Math.random() - 0.5) * 2;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
    }
    
    update() {
        this.x += this.speed;
        this.rotation += this.rotationSpeed;
        
        if (this.x < -this.width) {
            this.x = canvas.width;
        } else if (this.x > canvas.width) {
            this.x = -this.width;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = '#666';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.fillStyle = '#444';
        ctx.fillRect(-this.width/2 + 5, -this.height/2 + 5, this.width - 10, this.height - 10);
        
        ctx.restore();
    }
}

class Collectible {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
    }
    
    update() {
        this.bobOffset += 0.1;
        this.y += Math.sin(this.bobOffset) * 0.5;
    }
    
    collect() {
        this.collected = true;
    }
    
    render(ctx) {
        if (this.collected) return;
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        if (this.type === 'fuel') {
            // Enhanced fuel canister design
            const pulse = 0.8 + 0.2 * Math.sin(this.bobOffset * 2); // Pulsing effect
            
            // Outer glow
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 15;
            
            // Main fuel tank body
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(-14 * pulse, -18, 28 * pulse, 36);
            
            // Fuel tank highlight
            ctx.fillStyle = '#66ffaa';
            ctx.fillRect(-10 * pulse, -15, 20 * pulse, 30);
            
            // Fuel tank core
            ctx.fillStyle = '#00cc66';
            ctx.fillRect(-8 * pulse, -12, 16 * pulse, 24);
            
            // Fuel indicator stripes
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(-6 * pulse, -8 + i * 6, 12 * pulse, 2);
            }
            
            // Reset shadow
            ctx.shadowBlur = 0;
            
            // Fuel symbol "F"
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⛽', 0, 4);
            
        } else {
            // Enhanced coin design
            ctx.fillStyle = '#ffdd00';
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Coin symbol
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('$', 0, 4);
        }
        
        ctx.restore();
    }
}

class Moon {
    constructor() {
        this.y = -MOON_DISTANCE * 10;
        this.size = 200;
    }
    
    reset() {
        this.y = -MOON_DISTANCE * 10;
    }
    
    update(distance) {
        // Moon stays at fixed position
    }
    
    render(ctx) {
        const x = canvas.width / 2;
        
        ctx.save();
        ctx.fillStyle = '#dddddd';
        ctx.beginPath();
        ctx.arc(x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw craters
        ctx.fillStyle = '#aaaaaa';
        ctx.beginPath();
        ctx.arc(x - 50, this.y - 30, 25, 0, Math.PI * 2);
        ctx.arc(x + 60, this.y + 20, 20, 0, Math.PI * 2);
        ctx.arc(x - 20, this.y + 50, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 20;
        this.maxLife = 20;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.vy += 0.1;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        const size = (this.life / this.maxLife) * 6;
        ctx.fillStyle = this.life > 10 ? '#ffaa00' : '#ff6600';
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
        ctx.restore();
    }
}

class FuelParticle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 30;
        this.maxLife = 30;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.vx *= 0.95; // Slow down
        this.vy *= 0.95;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        const size = (this.life / this.maxLife) * 8;
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 5;
        ctx.fillRect(this.x - size/2, this.y - size/2, size, size);
        ctx.restore();
    }
}

class FallingFuel extends Collectible {
    constructor(x, y) {
        super(x, y, 'fuel');
        this.fallSpeed = 2; // Falls at constant speed
        this.wobble = 0;
        this.wobbleSpeed = 0.1;
    }
    
    update() {
        // Fall downward at consistent speed
        this.y += this.fallSpeed;
        
        // Add slight horizontal wobble for visual interest
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 0.5;
        
        // Keep within screen bounds horizontally
        this.x = Math.max(15, Math.min(canvas.width - 15, this.x));
    }
}

// Create game objects
const game = new Game();
const zinsco = new Zinsco();
const moon = new Moon();

// Game loop
function gameLoop() {
    game.update();
    game.render();
    requestAnimationFrame(gameLoop);
}

gameLoop();