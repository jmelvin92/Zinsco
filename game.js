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
// Mobile detection for speed adjustments
const IS_MOBILE = window.innerWidth <= 767 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const GRAVITY = 0.4;
const JETPACK_POWER = -1.0;
const MAX_VELOCITY = 8;
const MOON_DISTANCE = 100000; // 100,000 meters - epic journey to the moon!
const FUEL_CONSUMPTION = 0.08; // Much lower consumption - skill over luck
const FUEL_REFILL = 40; // Increased refill amount

// Mobile-specific speed adjustments
const MOBILE_SPEED_MODIFIER = IS_MOBILE ? 0.7 : 1.0; // 30% slower on mobile
const HORIZONTAL_ACCELERATION = (IS_MOBILE ? 0.42 : 0.6) * MOBILE_SPEED_MODIFIER; // Reduced acceleration on mobile
const MAX_HORIZONTAL_VELOCITY = (IS_MOBILE ? 4 : 6) * MOBILE_SPEED_MODIFIER; // Reduced max speed on mobile

class Game {
    constructor() {
        this.state = 'menu';
        console.log('Game constructor called');
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
        
        // Music system
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.musicVolume = 0.5; // Default 50% volume
        this.musicPlaying = false;
        
        // Sound effects system
        this.soundEffectsVolume = 0.7; // Default 70% volume for SFX
        this.soundEffects = {};
        
        // Load space backdrop
        this.backdropImage = new Image();
        this.backdropImage.src = 'space_backdrop.svg';
        this.backdropLoaded = false;
        this.backdropImage.onload = () => {
            this.backdropLoaded = true;
            console.log('Space backdrop loaded successfully');
        };
        
        // Shooting stars system (rare, dopamine-inducing background effect)
        this.shootingStars = [];
        this.shootingStarTimer = 0;
        this.shootingStarInterval = 600 + Math.random() * 1200; // 10-30 seconds at 60fps
        
        // Viewport-based spawning system
        this.lastSpawnY = 0; // Track where we last spawned objects
        this.spawnBuffer = 400; // Distance ahead to spawn objects
        this.despawnBuffer = 200; // Distance behind to despawn objects
        
        // Game state
        this.isPaused = false;
        
        this.initStars();
        this.bindEvents();
        this.initMusic();
        this.initSoundEffects();
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
        console.log('bindEvents called');
        document.getElementById('startBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.start(); });
        document.getElementById('retryBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.start(); });
        document.getElementById('playAgainBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.start(); });
        document.getElementById('shareBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.shareScore(); });
        
        // Options menu events
        document.getElementById('optionsBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.showOptions(); });
        document.getElementById('backBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.hideOptions(); });
        
        // Music controls
        document.getElementById('volumeSlider').addEventListener('input', (e) => this.setVolume(e.target.value));
        document.getElementById('toggleMusicBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.toggleMusic(); });
        
        // Sound effects controls
        document.getElementById('sfxVolumeSlider').addEventListener('input', (e) => this.setSoundEffectsVolume(e.target.value));
        
        // Pause screen controls
        document.getElementById('resumeBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.resumeGame(); });
        document.getElementById('mainMenuBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.returnToMainMenu(); });
        
        // Mobile pause button
        document.getElementById('mobilePauseBtn').addEventListener('click', () => {
            this.playSoundEffect('menuClick');
            this.handleEscapeKey(); // Use the same logic as ESC key
        });
        document.getElementById('pauseVolumeSlider').addEventListener('input', (e) => this.setVolume(e.target.value));
        document.getElementById('pauseToggleMusicBtn').addEventListener('click', () => { this.playSoundEffect('menuClick'); this.toggleMusic(); });
        document.getElementById('pauseSfxVolumeSlider').addEventListener('input', (e) => this.setSoundEffectsVolume(e.target.value));
        
        // Keyboard controls with proper scope binding
        const self = this;
        window.addEventListener('keydown', function(e) {
            // Don't handle ESC here - it's handled by global listener
            // console.log('Key pressed:', e.code, e.key);
            
            if (self.state !== 'playing' || self.isPaused) return;
            
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
        
        window.addEventListener('keyup', function(e) {
            if (self.state !== 'playing' && !self.isPaused) return;
            
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
            if (this.state === 'playing' && !this.isPaused) {
                zinsco.jetpackOn = true;
                this.hideTutorial(); // Hide tutorial on first interaction
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
            if (this.state === 'playing' && !this.isPaused) {
                zinsco.jetpackOn = true;
                this.hideTutorial(); // Hide tutorial on first interaction
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
        this.lastSpawnY = 0; // Reset spawn tracking
        
        // Reset player
        zinsco.reset();
        moon.reset();
        
        // Generate level
        // Level generation now handled by viewport spawning system
        
        // Start music if not already playing
        this.startMusic();
        
        // Show game
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('victoryScreen').style.display = 'none';
        document.getElementById('optionsScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'flex';
        document.getElementById('mobilePauseBtn').style.display = 'flex'; // Show mobile pause button during gameplay
        
        // Show tutorial indicator
        this.showTutorial();
    }
    
    showTutorial() {
        const tutorialIndicator = document.getElementById('tutorialIndicator');
        const tutorialText = document.getElementById('tutorialText');
        
        // Set appropriate text for mobile/desktop
        if (IS_MOBILE) {
            tutorialText.textContent = 'TAP TO BOOST';
        } else {
            tutorialText.textContent = 'CLICK OR TAP TO BOOST';
        }
        
        // Show tutorial
        tutorialIndicator.style.display = 'block';
        tutorialIndicator.classList.remove('fade-out');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            tutorialIndicator.classList.add('fade-out');
            
            // Remove from DOM after fade animation completes
            setTimeout(() => {
                tutorialIndicator.style.display = 'none';
            }, 1000);
        }, 5000);
    }
    
    hideTutorial() {
        const tutorialIndicator = document.getElementById('tutorialIndicator');
        if (tutorialIndicator && tutorialIndicator.style.display !== 'none') {
            tutorialIndicator.classList.add('fade-out');
            
            // Remove from DOM after fade animation completes
            setTimeout(() => {
                tutorialIndicator.style.display = 'none';
            }, 1000);
        }
    }
    
    
    
    updateShootingStars() {
        // Increment shooting star timer
        this.shootingStarTimer++;
        
        // Rarely spawn a shooting star for dopamine effect
        if (this.shootingStarTimer >= this.shootingStarInterval) {
            this.createShootingStar();
            this.shootingStarTimer = 0;
            // Randomize next interval (10-30 seconds)
            this.shootingStarInterval = 600 + Math.random() * 1200;
        }
        
        // Update existing shooting stars
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const star = this.shootingStars[i];
            
            // Update position
            star.x += star.velocityX;
            star.y += star.velocityY;
            
            // Update trail points
            star.trail.unshift({x: star.x, y: star.y});
            if (star.trail.length > star.trailLength) {
                star.trail.pop();
            }
            
            // Decrease life
            star.life--;
            
            // Remove if dead or off screen
            if (star.life <= 0 || star.y > this.cameraY + canvas.height + 200) {
                this.shootingStars.splice(i, 1);
            }
        }
    }
    
    createShootingStar() {
        const shootingStar = {
            x: -50 + Math.random() * (canvas.width * 0.3), // Start from upper left area
            y: this.cameraY - 100 + Math.random() * 200, // Start above visible area
            velocityX: 3 + Math.random() * 4, // Fast horizontal movement
            velocityY: 2 + Math.random() * 3, // Downward movement
            life: 180 + Math.random() * 120, // 3-5 seconds at 60fps
            trail: [],
            trailLength: 15 + Math.random() * 10,
            brightness: 0.8 + Math.random() * 0.2,
            color: {
                h: 0, // Pure white/neutral
                s: 0, // No saturation - pure white
                l: 90 + Math.random() * 10 // Very bright white
            },
            size: 2 + Math.random() * 2
        };
        
        this.shootingStars.push(shootingStar);
        console.log('✨ Shooting star created! Dopamine incoming...');
    }
    
    renderShootingStars() {
        ctx.save();
        
        for (const star of this.shootingStars) {
            if (star.trail.length < 2) continue;
            
            // Calculate fade based on remaining life - make more subtle
            const lifeFactor = star.life / (180 + 120); // Max possible life
            const alpha = lifeFactor * star.brightness * 0.4; // Reduced opacity for background effect
            
            // Draw white trail
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.lineWidth = star.size * 0.8; // Slightly thinner
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(star.trail[0].x, star.trail[0].y);
            
            // Create smooth white trail with decreasing opacity
            for (let i = 1; i < star.trail.length; i++) {
                const trailAlpha = alpha * (1 - i / star.trail.length) * 0.6;
                ctx.strokeStyle = `rgba(255, 255, 255, ${trailAlpha})`;
                ctx.lineTo(star.trail[i].x, star.trail[i].y);
            }
            ctx.stroke();
            
            // Draw the bright white star head
            const headGradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, star.size * 2.5
            );
            headGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
            headGradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.4})`);
            headGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add subtle white core
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    manageViewportSpawning() {
        // EMERGENCY: Track function calls to detect loops
        if (!this.viewportCalls) this.viewportCalls = 0;
        this.viewportCalls++;
        
        if (this.viewportCalls > 200) {
            console.error(`EMERGENCY: manageViewportSpawning called ${this.viewportCalls} times! Game freeze likely. Stopping.`);
            this.state = 'gameOver'; // Force stop game to prevent freeze
            return;
        }
        
        // Reset counter every second
        if (this.frameCount % 60 === 0) {
            this.viewportCalls = 0;
        }
        
        const spawnY = this.cameraY - this.spawnBuffer;
        
        // SAFETY CHECK: Validate all values before proceeding
        if (!isFinite(spawnY) || !isFinite(this.lastSpawnY) || !isFinite(this.cameraY)) {
            console.error(`Invalid viewport values: spawnY=${spawnY}, lastSpawnY=${this.lastSpawnY}, cameraY=${this.cameraY}`);
            return;
        }
        
        // Spawn objects in chunks as player moves up
        if (spawnY < this.lastSpawnY) {
            const chunkSize = 800; // Spawn objects in 800px chunks (much less frequent)
            const chunksToSpawn = Math.ceil((this.lastSpawnY - spawnY) / chunkSize);
            
            // ENHANCED SAFETY CHECK: More aggressive limits
            if (chunksToSpawn > 20) {
                console.error(`CRITICAL: chunksToSpawn=${chunksToSpawn} is way too high! Preventing freeze.`);
                console.log(`Distance: ${this.distance}m, spawnY=${spawnY}, lastSpawnY=${this.lastSpawnY}, cameraY=${this.cameraY}, diff=${this.lastSpawnY - spawnY}`);
                this.lastSpawnY = spawnY; // Force reset to prevent accumulation
                return;
            }
            
            const safeChunksToSpawn = Math.min(chunksToSpawn, 5); // Even more conservative - max 5 chunks per frame
            
            console.log(`Spawning ${safeChunksToSpawn} chunks at distance ${this.distance}m`);
            
            for (let i = 0; i < safeChunksToSpawn; i++) {
                const chunkY = this.lastSpawnY - (i + 1) * chunkSize;
                this.spawnChunk(chunkY, chunkSize);
            }
            
            this.lastSpawnY = spawnY;
        }
        
        // Despawn objects that are too far behind
        this.despawnOutOfBounds();
    }
    
    spawnChunk(chunkY, chunkSize) {
        // ULTRA-SIMPLE spawning system - no complex calculations
        
        // Hard limits to prevent explosion
        if (this.obstacles.length > 15) return;
        if (this.collectibles.length > 20) return;
        
        // Simple distance-based difficulty (no complex math)
        const progressPercent = Math.min(100, (this.distance / MOON_DISTANCE) * 100);
        const difficultyLevel = Math.floor(progressPercent / 20); // 0-5 levels
        
        // Ultra-simple spawn chances based on difficulty level
        const asteroidChances = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]; // 0.5% to 3%
        const fuelChances = [0.02, 0.025, 0.03, 0.035, 0.04, 0.045]; // 2% to 4.5%
        
        const asteroidChance = asteroidChances[difficultyLevel] || 0.03;
        const fuelChance = fuelChances[difficultyLevel] || 0.045;
        
        // Spawn 1 asteroid max per chunk
        if (Math.random() < asteroidChance) {
            const x = Math.random() * (canvas.width - 100) + 50;
            const y = chunkY + Math.random() * chunkSize;
            this.obstacles.push(new Asteroid(x, y));
        }
        
        // Spawn 1 fuel max per chunk  
        if (Math.random() < fuelChance) {
            const x = Math.random() * (canvas.width - 40) + 20;
            const y = chunkY + Math.random() * chunkSize;
            this.collectibles.push(new Collectible(x, y, 'fuel'));
        }
        
        // Spawn 1 coin max per chunk (rare)
        if (Math.random() < 0.008) {
            const x = Math.random() * (canvas.width - 40) + 20;
            const y = chunkY + Math.random() * chunkSize;
            this.collectibles.push(new Collectible(x, y, 'coin'));
        }
        
        console.log(`Simple spawn: Level ${difficultyLevel}, Objects: ${this.obstacles.length}/${this.collectibles.length}`);
    }
    
    despawnOutOfBounds() {
        const despawnY = this.cameraY + canvas.height + this.despawnBuffer;
        
        // Count objects before cleanup
        const obstaclesBefore = this.obstacles.length;
        const collectiblesBefore = this.collectibles.length;
        const particlesBefore = this.particles.length;
        
        // Remove obstacles that are too far behind
        this.obstacles = this.obstacles.filter(obstacle => {
            return obstacle.y < despawnY;
        });
        
        // Remove collectibles that are too far behind
        this.collectibles = this.collectibles.filter(collectible => {
            return collectible.y < despawnY;
        });
        
        // Remove particles that are too far behind
        this.particles = this.particles.filter(particle => {
            return particle.y < despawnY;
        });
        
        // Log cleanup if significant
        const obstaclesRemoved = obstaclesBefore - this.obstacles.length;
        const collectiblesRemoved = collectiblesBefore - this.collectibles.length;
        const particlesRemoved = particlesBefore - this.particles.length;
        
        if (obstaclesRemoved > 0 || collectiblesRemoved > 0 || particlesRemoved > 0) {
            console.log(`Cleanup: Removed ${obstaclesRemoved} obstacles, ${collectiblesRemoved} collectibles, ${particlesRemoved} particles`);
        }
    }
    
    update() {
        if (this.state !== 'playing' || this.isPaused) return;
        
        this.frameCount++;
        
        // EMERGENCY Performance monitoring - more frequent near crash zone
        const isNearCrashZone = this.distance >= 400 && this.distance <= 600;
        const debugInterval = isNearCrashZone ? 60 : 600; // Every second in crash zone, every 10s otherwise
        
        if (this.frameCount % debugInterval === 0) {
            const ricochetCount = this.obstacles.filter(obs => obs.isRicochet).length;
            const regularCount = this.obstacles.length - ricochetCount;
            const performanceStatus = isNearCrashZone ? "🚨 CRASH ZONE" : "✅ Normal";
            console.log(`${performanceStatus} | Distance: ${this.distance.toFixed(0)}m | Objects: ${this.obstacles.length} obstacles, ${this.particles.length} particles, ${this.collectibles.length} collectibles | Camera: ${this.cameraY.toFixed(0)} | SpawnCalls: ${this.spawnChunkCalls || 0} | ViewportCalls: ${this.viewportCalls || 0}`);
        }
        
        // Update shooting stars (rare background effect)
        this.updateShootingStars();
        
        // Update player
        zinsco.update();
        
        // Update camera
        const targetCameraY = zinsco.y - canvas.height * 0.7;
        if (targetCameraY < this.cameraY) {
            this.cameraY = targetCameraY;
        }
        
        // Viewport-based spawning system - spawn objects just above visible area
        this.manageViewportSpawning();
        
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
        
        // Update obstacles (viewport system handles spawning/despawning)
        this.obstacles = this.obstacles.filter(obstacle => {
            // Handle ricochet asteroids differently
            if (obstacle.isRicochet) {
                const shouldContinue = obstacle.update();
                if (!shouldContinue) {
                    return false; // Remove ricochet asteroid if it's done bouncing
                }
            } else {
                obstacle.update();
            }
            
            // Check collisions for all asteroids
            if (this.frameCount > 120 && this.checkCollision(zinsco, obstacle)) {
                // Play collision sound
                this.playSoundEffect('collision');
                
                if (obstacle.isRicochet) {
                    this.gameOver('Hit a ricochet asteroid!');
                } else {
                    this.gameOver('Hit an asteroid!');
                }
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
                const centerX = collectible.x + collectible.width/2;
                const centerY = collectible.y + collectible.height/2;
                
                if (collectible.type === 'fuel') {
                    const oldFuel = zinsco.fuel;
                    zinsco.fuel = Math.min(100, zinsco.fuel + FUEL_REFILL);
                    this.score += 50;
                    
                    // Play fuel collection sound
                    this.playSoundEffect('fuelCollect');
                    
                    // Add fuel pickup particles
                    for (let i = 0; i < 8; i++) {
                        this.particles.push(new FuelParticle(
                            centerX, centerY,
                            (Math.random() - 0.5) * 4,
                            (Math.random() - 0.5) * 4
                        ));
                    }
                    
                    // Create hyper dopamine collection burst - green/yellow tracers
                    for (let i = 0; i < 15; i++) {
                        const angle = (i / 15) * Math.PI * 2;
                        const speed = 3 + Math.random() * 4;
                        zinsco.tracers.push({
                            x: centerX,
                            y: centerY,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: 40 + Math.random() * 20,
                            maxLife: 40 + Math.random() * 20,
                            size: 3 + Math.random() * 4,
                            hue: 80 + Math.random() * 40, // Green to yellow-green
                            speed: speed
                        });
                    }
                    
                    console.log(`Fuel collected! ${oldFuel.toFixed(1)} -> ${zinsco.fuel.toFixed(1)}`);
                } else {
                    this.score += 100;
                    
                    // Play coin collection sound
                    this.playSoundEffect('coinCollect');
                    
                    // Create hyper dopamine collection burst - gold/orange tracers for coins
                    for (let i = 0; i < 12; i++) {
                        const angle = (i / 12) * Math.PI * 2;
                        const speed = 2.5 + Math.random() * 3.5;
                        zinsco.tracers.push({
                            x: centerX,
                            y: centerY,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: 35 + Math.random() * 15,
                            maxLife: 35 + Math.random() * 15,
                            size: 2.5 + Math.random() * 3,
                            hue: 35 + Math.random() * 25, // Gold to orange
                            speed: speed
                        });
                    }
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
        
        // Level generation now handled by viewport spawning system
        
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
                if (zinsco.fuel <= 0) {
                    this.gameOver('Ran out of fuel and fell out of bounds!');
                } else {
                    this.gameOver('Fell out of bounds!');
                }
                return;
            }
        } else {
            // Player is back in bounds - reset timer
            if (this.isBelowBorder) {
                this.isBelowBorder = false;
                this.belowBorderTime = 0;
            }
        }
        
        // No separate fuel check needed - fuel game over now handled in border check above
        
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
        // Clear canvas with space color
        ctx.fillStyle = '#0a0520';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw space backdrop if loaded
        if (this.backdropLoaded) {
            // Draw the backdrop with proper aspect ratio (cover behavior)
            const imgAspectRatio = this.backdropImage.width / this.backdropImage.height;
            const canvasAspectRatio = canvas.width / canvas.height;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgAspectRatio > canvasAspectRatio) {
                // Image is wider than canvas - fit by height
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspectRatio;
                offsetX = -(drawWidth - canvas.width) / 2;
                offsetY = 0;
            } else {
                // Image is taller than canvas - fit by width
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspectRatio;
                offsetX = 0;
                offsetY = -(drawHeight - canvas.height) / 2;
            }
            
            ctx.drawImage(this.backdropImage, offsetX, offsetY, drawWidth, drawHeight);
            // Draw shooting stars immediately after backdrop (deepest background layer)
            this.renderShootingStars();
        } else {
            // Fallback gradient while backdrop loads
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(10, 10, 20, 0.8)');
            gradient.addColorStop(1, 'rgba(40, 20, 60, 0.8)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Draw shooting stars after fallback gradient too
            this.renderShootingStars();
        }
        
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
            
            // Warning text - mobile responsive font sizes
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            
            // Responsive font sizes based on screen width
            const mainFontSize = IS_MOBILE ? (canvas.width < 400 ? '28px' : '36px') : '48px';
            const subFontSize = IS_MOBILE ? (canvas.width < 400 ? '18px' : '24px') : '32px';
            const smallFontSize = IS_MOBILE ? (canvas.width < 400 ? '16px' : '20px') : '28px';
            
            ctx.font = `bold ${mainFontSize} Orbitron, monospace`;
            ctx.textAlign = 'center';
            
            if (zinsco.fuel <= 0) {
                ctx.fillText('NO FUEL - FIND FUEL!', canvas.width / 2, canvas.height / 2 - 40);
                ctx.font = `bold ${smallFontSize} Orbitron, monospace`;
                ctx.fillText(`Freefall to collect fuel! ${secondsLeft}s left!`, canvas.width / 2, canvas.height / 2 + 20);
            } else {
                ctx.fillText('OUT OF BOUNDS!', canvas.width / 2, canvas.height / 2 - 40);
                ctx.font = `bold ${subFontSize} Orbitron, monospace`;
                ctx.fillText(`Return in ${secondsLeft} seconds!`, canvas.width / 2, canvas.height / 2 + 20);
            }
            
            ctx.restore();
        }
    }
    
    gameOver(reason) {
        this.state = 'gameover';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('mobilePauseBtn').style.display = 'none'; // Hide mobile pause button
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('failReason').textContent = reason;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalDistance').textContent = this.maxDistance + 'm';
    }
    
    victory() {
        this.state = 'victory';
        this.score += Math.floor(zinsco.fuel * 10);
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('mobilePauseBtn').style.display = 'none'; // Hide mobile pause button
        document.getElementById('victoryScreen').style.display = 'flex';
        document.getElementById('victoryScore').textContent = this.score;
        document.getElementById('victoryFuel').textContent = Math.floor(zinsco.fuel) + '%';
    }
    
    shareScore() {
        const text = `🚀 I helped Zinsco reach the moon! Score: ${this.score} points! Can you beat it?`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=Zinsco,ToTheMoon,GameScore`;
        window.open(url, '_blank');
    }
    
    // Music System Methods
    initMusic() {
        this.backgroundMusic.volume = this.musicVolume;
        // Try to start music automatically (may be blocked by browser policies)
        this.startMusic();
    }
    
    // Sound Effects System Methods
    initSoundEffects() {
        // Load saved SFX volume
        const savedSfxVolume = localStorage.getItem('zinscoSfxVolume');
        if (savedSfxVolume) {
            this.soundEffectsVolume = savedSfxVolume / 100;
        }
        
        // Load fuel collection sound
        this.soundEffects.fuelCollect = new Audio('fuel_collect.wav');
        this.soundEffects.fuelCollect.volume = this.soundEffectsVolume;
        
        // Load coin collection sound
        this.soundEffects.coinCollect = new Audio('coin_collect.wav');
        this.soundEffects.coinCollect.volume = this.soundEffectsVolume;
        
        // Load collision sound
        this.soundEffects.collision = new Audio('collision.wav');
        this.soundEffects.collision.volume = this.soundEffectsVolume;
        
        // Load menu click sound
        this.soundEffects.menuClick = new Audio('menu_click.wav');
        this.soundEffects.menuClick.volume = this.soundEffectsVolume;
        
        console.log('Sound effects initialized with volume:', this.soundEffectsVolume);
    }
    
    playSoundEffect(soundName) {
        if (this.soundEffects[soundName] && this.soundEffectsVolume > 0) {
            // Reset to beginning in case it's already playing
            this.soundEffects[soundName].currentTime = 0;
            this.soundEffects[soundName].volume = this.soundEffectsVolume;
            this.soundEffects[soundName].play().catch(error => {
                console.log('Sound effect play failed:', error);
            });
        }
    }
    
    setSoundEffectsVolume(value) {
        this.soundEffectsVolume = value / 100;
        
        // Update all loaded sound effects volumes
        Object.values(this.soundEffects).forEach(audio => {
            audio.volume = this.soundEffectsVolume;
        });
        
        // Update display
        document.getElementById('sfxVolumeDisplay').textContent = value;
        document.getElementById('pauseSfxVolumeDisplay').textContent = value;
        
        // Sync both sliders
        document.getElementById('sfxVolumeSlider').value = value;
        document.getElementById('pauseSfxVolumeSlider').value = value;
        
        // Save to localStorage
        localStorage.setItem('zinscoSfxVolume', value);
    }
    
    startMusic() {
        if (!this.musicPlaying) {
            this.backgroundMusic.play().then(() => {
                this.musicPlaying = true;
                this.updateMusicButton();
            }).catch((error) => {
                console.log('Music autoplay blocked by browser:', error);
                // Music will start when user interacts with the page
            });
        }
    }
    
    stopMusic() {
        if (this.musicPlaying) {
            this.backgroundMusic.pause();
            this.musicPlaying = false;
            this.updateMusicButton();
        }
    }
    
    toggleMusic() {
        if (this.musicPlaying) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
    }
    
    setVolume(value) {
        this.musicVolume = value / 100;
        this.backgroundMusic.volume = this.musicVolume;
        document.getElementById('volumeDisplay').textContent = value;
        document.getElementById('pauseVolumeDisplay').textContent = value;
        
        // Sync both volume sliders
        document.getElementById('volumeSlider').value = value;
        document.getElementById('pauseVolumeSlider').value = value;
        
        // Save volume to localStorage
        localStorage.setItem('zinscoMusicVolume', value);
    }
    
    updateMusicButton() {
        const button = document.getElementById('toggleMusicBtn');
        const pauseButton = document.getElementById('pauseToggleMusicBtn');
        
        const text = this.musicPlaying ? '🎵 PAUSE MUSIC' : '🎵 PLAY MUSIC';
        const background = this.musicPlaying 
            ? 'linear-gradient(45deg, #ff6600, #ff8800)' 
            : 'linear-gradient(45deg, #00ffcc, #00ff88)';
        
        button.textContent = text;
        button.style.background = background;
        pauseButton.textContent = text;
        pauseButton.style.background = background;
    }
    
    showOptions() {
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('optionsScreen').style.display = 'flex';
        
        // Load saved volume from localStorage
        const savedMusicVolume = localStorage.getItem('zinscoMusicVolume');
        if (savedMusicVolume) {
            document.getElementById('volumeSlider').value = savedMusicVolume;
            this.setVolume(savedMusicVolume);
        }
        
        // Load saved SFX volume from localStorage
        const savedSfxVolume = localStorage.getItem('zinscoSfxVolume');
        if (savedSfxVolume) {
            document.getElementById('sfxVolumeSlider').value = savedSfxVolume;
            this.setSoundEffectsVolume(savedSfxVolume);
        }
    }
    
    hideOptions() {
        document.getElementById('optionsScreen').style.display = 'none';
        document.getElementById('startScreen').style.display = 'flex';
    }
    
    // Pause System Methods
    handleEscapeKey() {
        console.log('handleEscapeKey called, state:', this.state, 'isPaused:', this.isPaused);
        
        if (this.state === 'playing') {
            if (this.isPaused) {
                console.log('Resuming game...');
                this.resumeGame();
            } else {
                console.log('Pausing game...');
                this.pauseGame();
            }
        } else if (document.getElementById('optionsScreen').style.display === 'flex') {
            // Close options screen
            console.log('Closing options screen...');
            this.hideOptions();
        } else if (document.getElementById('pauseOverlay').style.display === 'flex') {
            // Resume from pause screen
            console.log('Resuming from pause overlay...');
            this.resumeGame();
        } else if (this.state === 'gameover') {
            // Return to main menu from game over screen
            console.log('Returning to main menu from game over...');
            this.returnToMainMenuFromGameOver();
        } else if (this.state === 'victory') {
            // Return to main menu from victory screen
            console.log('Returning to main menu from victory...');
            this.returnToMainMenuFromVictory();
        } else if (this.state === 'menu') {
            // Open options from main menu
            console.log('Opening options from main menu...');
            this.showOptions();
        } else {
            console.log('ESC pressed but no action taken. Current screens visible:');
            console.log('startScreen:', document.getElementById('startScreen').style.display);
            console.log('optionsScreen:', document.getElementById('optionsScreen').style.display);
            console.log('pauseOverlay:', document.getElementById('pauseOverlay').style.display);
            console.log('gameOverScreen:', document.getElementById('gameOverScreen').style.display);
            console.log('victoryScreen:', document.getElementById('victoryScreen').style.display);
        }
    }
    
    pauseGame() {
        if (this.state !== 'playing' || this.isPaused) return;
        
        this.isPaused = true;
        document.getElementById('pauseOverlay').style.display = 'flex';
        document.getElementById('mobilePauseBtn').style.display = 'none'; // Hide mobile pause button when pause menu is open
        
        // Sync music volume controls
        const savedMusicVolume = localStorage.getItem('zinscoMusicVolume') || '50';
        document.getElementById('pauseVolumeSlider').value = savedMusicVolume;
        document.getElementById('pauseVolumeDisplay').textContent = savedMusicVolume;
        
        // Sync SFX volume controls
        const savedSfxVolume = localStorage.getItem('zinscoSfxVolume') || '70';
        document.getElementById('pauseSfxVolumeSlider').value = savedSfxVolume;
        document.getElementById('pauseSfxVolumeDisplay').textContent = savedSfxVolume;
        
        // Stop jetpack when pausing
        zinsco.jetpackOn = false;
        
        console.log('Game paused');
    }
    
    resumeGame() {
        if (!this.isPaused) return;
        
        this.isPaused = false;
        document.getElementById('pauseOverlay').style.display = 'none';
        document.getElementById('mobilePauseBtn').style.display = 'flex'; // Show mobile pause button when returning to gameplay
        
        console.log('Game resumed');
    }
    
    returnToMainMenu() {
        this.isPaused = false;
        this.state = 'menu';
        
        // Hide all screens
        document.getElementById('pauseOverlay').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('mobilePauseBtn').style.display = 'none'; // Hide mobile pause button
        document.getElementById('startScreen').style.display = 'flex';
        
        // Stop jetpack
        zinsco.jetpackOn = false;
        
        console.log('Returned to main menu');
    }
    
    returnToMainMenuFromGameOver() {
        this.state = 'menu';
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('mobilePauseBtn').style.display = 'none'; // Hide mobile pause button
        document.getElementById('startScreen').style.display = 'flex';
        console.log('Returned to main menu from game over');
    }
    
    returnToMainMenuFromVictory() {
        this.state = 'menu';
        document.getElementById('victoryScreen').style.display = 'none';
        document.getElementById('mobilePauseBtn').style.display = 'none'; // Hide mobile pause button
        document.getElementById('startScreen').style.display = 'flex';
        console.log('Returned to main menu from victory');
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
        this.fuel = 100; // Full tank - should last much longer now with reduced consumption
        this.jetpackOn = false;
        this.movingLeft = false;
        this.movingRight = false;
        
        // Movement tracers
        this.tracers = [];
        this.tracerTimer = 0;
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
                this.velocityX -= HORIZONTAL_ACCELERATION; // Move left toward mouse (mobile-adjusted)
            } else if (mouseDirection > deadZone) {
                this.velocityX += HORIZONTAL_ACCELERATION; // Move right toward mouse (mobile-adjusted)
            }
        }
        
        // Keyboard movement (still works as backup)
        if (this.movingLeft) {
            this.velocityX -= HORIZONTAL_ACCELERATION;
        }
        if (this.movingRight) {
            this.velocityX += HORIZONTAL_ACCELERATION;
        }
        
        // Apply friction
        this.velocityX *= 0.9;
        
        // Limit velocities (mobile-adjusted)
        this.velocityY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.velocityY));
        this.velocityX = Math.max(-MAX_HORIZONTAL_VELOCITY, Math.min(MAX_HORIZONTAL_VELOCITY, this.velocityX)); // Mobile-adjusted speed
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Keep within bounds
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        
        // Create movement tracers for dopamine effect
        this.tracerTimer++;
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        
        if (this.tracerTimer % 2 === 0 && speed > 1) { // Create tracers when moving
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            
            // Create multiple tracers for hyper effect
            for (let i = 0; i < 3; i++) {
                this.tracers.push({
                    x: centerX + (Math.random() - 0.5) * this.width,
                    y: centerY + (Math.random() - 0.5) * this.height,
                    vx: -this.velocityX * 0.3 + (Math.random() - 0.5) * 2,
                    vy: -this.velocityY * 0.3 + (Math.random() - 0.5) * 2,
                    life: 30 + Math.random() * 20,
                    maxLife: 30 + Math.random() * 20,
                    size: 2 + Math.random() * 3,
                    hue: Math.random() * 360, // Random color
                    speed: speed
                });
            }
        }
        
        // Update existing tracers
        this.tracers = this.tracers.filter(tracer => {
            tracer.x += tracer.vx;
            tracer.y += tracer.vy;
            tracer.life--;
            tracer.vx *= 0.98; // Slight deceleration
            tracer.vy *= 0.98;
            return tracer.life > 0;
        });
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
        
        // Draw hyper dopamine tracers
        this.tracers.forEach(tracer => {
            const alpha = tracer.life / tracer.maxLife;
            const intensity = Math.min(tracer.speed / 5, 1); // Brighter for faster movement
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.8;
            
            // Create gradient for extra glow effect
            const gradient = ctx.createRadialGradient(tracer.x, tracer.y, 0, tracer.x, tracer.y, tracer.size * 2);
            gradient.addColorStop(0, `hsla(${tracer.hue}, 100%, ${50 + intensity * 30}%, ${alpha})`);
            gradient.addColorStop(0.5, `hsla(${tracer.hue}, 100%, ${30 + intensity * 20}%, ${alpha * 0.6})`);
            gradient.addColorStop(1, `hsla(${tracer.hue}, 100%, 20%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(tracer.x, tracer.y, tracer.size * (1 + intensity), 0, Math.PI * 2);
            ctx.fill();
            
            // Add extra bright core for hyper effect
            ctx.globalAlpha = alpha * intensity;
            ctx.fillStyle = `hsla(${tracer.hue}, 100%, 90%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(tracer.x, tracer.y, tracer.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
        
        ctx.restore();
    }
}

class Asteroid {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        
        // More varied size ranges - small, medium, large asteroids with more extreme differences
        const sizeType = Math.random();
        if (sizeType < 0.3) {
            // Small asteroids (30% chance) - much smaller
            this.width = 20 + Math.random() * 20;  // 20-40px
            this.height = 20 + Math.random() * 20;
            this.sizeCategory = 'small';
        } else if (sizeType < 0.7) {
            // Medium asteroids (40% chance)
            this.width = 45 + Math.random() * 30;  // 45-75px
            this.height = 45 + Math.random() * 30;
            this.sizeCategory = 'medium';
        } else {
            // Large asteroids (30% chance) - much larger
            this.width = 80 + Math.random() * 40;  // 80-120px
            this.height = 80 + Math.random() * 40;
            this.sizeCategory = 'large';
        }
        
        // Shape variation parameters
        this.shapePoints = 8 + Math.floor(Math.random() * 8); // 8-15 points for shape variety
        this.shapeVariation = 0.3 + Math.random() * 0.4; // How irregular the shape is
        this.shapeOffset = Math.random() * Math.PI * 2; // Random rotation offset for shape
        this.aspectRatio = 0.7 + Math.random() * 0.6; // Oval vs round asteroids
        
        // Crater pattern variation
        this.craterSeed = Math.random() * 1000; // Unique seed for crater placement
        this.craterDensity = 0.5 + Math.random() * 1.0; // How many craters
        
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
        
        const radiusX = this.width / 2;
        const radiusY = this.height / 2 * this.aspectRatio;
        
        // Different colors based on size for more visual variety
        let asteroidColor;
        if (this.sizeCategory === 'small') {
            asteroidColor = '#A0522D'; // Saddle brown (smaller, lighter)
        } else if (this.sizeCategory === 'medium') {
            asteroidColor = '#B8860B'; // Dark golden rod (medium)
        } else {
            asteroidColor = '#8B4513'; // Darker brown (large, imposing)
        }
        ctx.fillStyle = asteroidColor;
        ctx.beginPath();
        
        // Create irregular asteroid shape with variable points and variation
        const points = this.shapePoints;
        let firstPoint = true;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 + this.shapeOffset;
            // Use seeded variation for consistent shape per asteroid
            const variation = 0.7 + Math.sin(i * 2.3 + this.craterSeed) * this.shapeVariation;
            const x = Math.cos(angle) * radiusX * variation;
            const y = Math.sin(angle) * radiusY * variation;
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Add darker brown shading
        ctx.fillStyle = '#8B4513'; // Saddle brown
        ctx.beginPath();
        let firstShadingPoint = true;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 + this.shapeOffset;
            const variation = 0.6 + Math.sin(i * 2.3 + this.craterSeed) * (this.shapeVariation * 0.7);
            const x = Math.cos(angle) * radiusX * variation * 0.8;
            const y = Math.sin(angle) * radiusY * variation * 0.8;
            
            if (firstShadingPoint) {
                ctx.moveTo(x, y);
                firstShadingPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Add multiple craters of different sizes based on asteroid properties
        ctx.fillStyle = '#2F1B14'; // Very dark brown for craters
        
        const avgRadius = (radiusX + radiusY) / 2;
        
        // Generate craters based on density and seed for consistency
        const numLargeCraters = Math.floor(this.craterDensity * 2) + 1;
        const numMediumCraters = Math.floor(this.craterDensity * 3) + 1;
        const numSmallCraters = Math.floor(this.craterDensity * 5) + 2;
        
        // Large craters with seeded positions
        for (let i = 0; i < numLargeCraters; i++) {
            const angle = (this.craterSeed + i * 50) % (Math.PI * 2);
            const distance = (0.2 + (this.craterSeed + i * 30) % 0.3) * avgRadius;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = avgRadius * (0.15 + ((this.craterSeed + i * 20) % 0.15));
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add crater highlight for large craters only
            if (i === 0) { // Only highlight the first large crater
                ctx.fillStyle = '#CD853F'; // Peru color for highlights
                ctx.beginPath();
                ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#2F1B14'; // Reset to dark brown
            }
        }
        
        // Medium craters
        for (let i = 0; i < numMediumCraters; i++) {
            const angle = (this.craterSeed + i * 80 + 100) % (Math.PI * 2);
            const distance = (0.3 + (this.craterSeed + i * 40) % 0.25) * avgRadius;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = avgRadius * (0.06 + ((this.craterSeed + i * 15) % 0.06));
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Small craters/spots
        for (let i = 0; i < numSmallCraters; i++) {
            const angle = (this.craterSeed + i * 60 + 200) % (Math.PI * 2);
            const distance = (0.1 + (this.craterSeed + i * 25) % 0.4) * avgRadius;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = avgRadius * (0.02 + ((this.craterSeed + i * 10) % 0.03));
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add black outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let firstOutlinePoint = true;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 + this.shapeOffset;
            const variation = 0.7 + Math.sin(i * 2.3 + this.craterSeed) * this.shapeVariation;
            const x = Math.cos(angle) * radiusX * variation;
            const y = Math.sin(angle) * radiusY * variation;
            
            if (firstOutlinePoint) {
                ctx.moveTo(x, y);
                firstOutlinePoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
}

class RicochetAsteroid extends Asteroid {
    constructor(x, y) {
        super(x, y);
        
        // Ricochet asteroids are typically larger and more distinctive
        this.width = 50 + Math.random() * 30;
        this.height = 50 + Math.random() * 30;
        
        // Much faster speed with both X and Y components
        const speed = 4 + Math.random() * 6; // 4-10 speed
        const angle = Math.random() * Math.PI * 2;
        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;
        
        // More aggressive rotation
        this.rotationSpeed = (Math.random() - 0.5) * 0.15;
        
        // Visual distinctions
        this.glowIntensity = 0;
        this.glowDirection = 1;
        this.isRicochet = true;
        
        // Trail system for visual effect
        this.trail = [];
        this.trailTimer = 0;
        
        // Ricochet properties
        this.bounceCount = 0;
        this.maxBounces = 8 + Math.floor(Math.random() * 12); // 8-20 bounces before fading
        this.bounceDamping = 0.85; // Slight speed loss per bounce
    }
    
    update() {
        // Move with velocity
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.rotation += this.rotationSpeed;
        
        // Check border collisions and ricochet with fixed boundaries to prevent accumulation
        let bounced = false;
        const visibleTop = game.cameraY - 200; // Allow some bouncing above visible area
        const visibleBottom = game.cameraY + canvas.height + 200; // Allow some bouncing below visible area
        
        // Left border
        if (this.x < 0) {
            this.x = 0;
            this.velocityX = Math.abs(this.velocityX);
            bounced = true;
        }
        
        // Right border
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
            this.velocityX = -Math.abs(this.velocityX);
            bounced = true;
        }
        
        // Top border with buffer zone
        if (this.y < visibleTop) {
            this.y = visibleTop;
            this.velocityY = Math.abs(this.velocityY);
            bounced = true;
        }
        
        // Bottom border with buffer zone
        if (this.y + this.height > visibleBottom) {
            this.y = visibleBottom - this.height;
            this.velocityY = -Math.abs(this.velocityY);
            bounced = true;
        }
        
        // Add despawn condition if asteroid gets too far from player
        const playerY = zinsco.y;
        const distanceFromPlayer = Math.abs(this.y - playerY);
        if (distanceFromPlayer > canvas.height * 2) {
            return false; // Remove if too far from player
        }
        
        // Check collisions with other asteroids for ricocheting
        game.obstacles.forEach(otherAsteroid => {
            if (otherAsteroid !== this && !otherAsteroid.isRicochet) {
                if (this.checkCollision(otherAsteroid)) {
                    // Calculate bounce direction based on collision
                    const centerX1 = this.x + this.width/2;
                    const centerY1 = this.y + this.height/2;
                    const centerX2 = otherAsteroid.x + otherAsteroid.width/2;
                    const centerY2 = otherAsteroid.y + otherAsteroid.height/2;
                    
                    const dx = centerX1 - centerX2;
                    const dy = centerY1 - centerY2;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        // Normalize collision vector
                        const normalX = dx / distance;
                        const normalY = dy / distance;
                        
                        // Reflect velocity off the collision normal
                        const dotProduct = this.velocityX * normalX + this.velocityY * normalY;
                        this.velocityX = this.velocityX - 2 * dotProduct * normalX;
                        this.velocityY = this.velocityY - 2 * dotProduct * normalY;
                        
                        // Add some randomness to prevent stuck loops
                        this.velocityX += (Math.random() - 0.5) * 1;
                        this.velocityY += (Math.random() - 0.5) * 1;
                        
                        // Move apart to prevent overlap
                        const overlap = (this.width + otherAsteroid.width) / 2 - distance;
                        if (overlap > 0) {
                            this.x += normalX * overlap;
                            this.y += normalY * overlap;
                        }
                        
                        bounced = true;
                    }
                }
            }
        });
        
        // Handle bounce effects
        if (bounced) {
            this.bounceCount++;
            // Apply damping
            this.velocityX *= this.bounceDamping;
            this.velocityY *= this.bounceDamping;
            
            // Create bounce particles
            game.particles.push(new Particle(
                this.x + this.width/2,
                this.y + this.height/2,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                '#ff6600',
                30
            ));
        }
        
        // Update glow effect
        this.glowIntensity += this.glowDirection * 0.05;
        if (this.glowIntensity > 1) {
            this.glowIntensity = 1;
            this.glowDirection = -1;
        } else if (this.glowIntensity < 0.3) {
            this.glowIntensity = 0.3;
            this.glowDirection = 1;
        }
        
        // Create trail effect
        this.trailTimer++;
        if (this.trailTimer % 2 === 0) {
            const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            this.trail.push({
                x: this.x + this.width/2,
                y: this.y + this.height/2,
                life: 20 + speed * 2,
                maxLife: 20 + speed * 2,
                size: (this.width + this.height) / 4,
                alpha: 1
            });
        }
        
        // Update trail
        this.trail = this.trail.filter(point => {
            point.life--;
            point.alpha = point.life / point.maxLife;
            return point.life > 0;
        });
        
        // Remove asteroid if it's bounced too many times and is slow
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (this.bounceCount >= this.maxBounces || currentSpeed < 0.5) {
            console.log(`Ricochet asteroid removed: bounces=${this.bounceCount}/${this.maxBounces}, speed=${currentSpeed.toFixed(2)}`);
            return false; // Signal for removal
        }
        
        return true; // Continue existing
    }
    
    checkCollision(other) {
        const margin = 5;
        return this.x + margin < other.x + other.width &&
               this.x + this.width - margin > other.x &&
               this.y + margin < other.y + other.height &&
               this.y + this.height - margin > other.y;
    }
    
    render(ctx) {
        // Draw trail first
        this.trail.forEach(point => {
            ctx.save();
            ctx.globalAlpha = point.alpha * 0.3;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size * point.alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Add distinctive glow effect
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 15 + this.glowIntensity * 10;
        
        const radiusX = this.width / 2;
        const radiusY = this.height / 2 * this.aspectRatio;
        
        // Ricochet asteroid has distinctive orange/red coloring
        ctx.fillStyle = '#CC4400'; // Dark red-orange
        ctx.beginPath();
        
        const points = this.shapePoints;
        let firstPoint = true;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 + this.shapeOffset;
            const variation = 0.7 + Math.sin(i * 2.3 + this.craterSeed) * this.shapeVariation;
            const x = Math.cos(angle) * radiusX * variation;
            const y = Math.sin(angle) * radiusY * variation;
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Orange shading
        ctx.fillStyle = '#FF6600';
        ctx.beginPath();
        let firstShadingPoint = true;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 + this.shapeOffset;
            const variation = 0.6 + Math.sin(i * 2.3 + this.craterSeed) * (this.shapeVariation * 0.7);
            const x = Math.cos(angle) * radiusX * variation * 0.8;
            const y = Math.sin(angle) * radiusY * variation * 0.8;
            
            if (firstShadingPoint) {
                ctx.moveTo(x, y);
                firstShadingPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Simplified crater system for ricochet asteroids
        ctx.fillStyle = '#AA2200';
        const avgRadius = (radiusX + radiusY) / 2;
        const numCraters = Math.floor(this.craterDensity * 3) + 2;
        
        for (let i = 0; i < numCraters; i++) {
            const angle = (this.craterSeed + i * 70) % (Math.PI * 2);
            const distance = (0.2 + (this.craterSeed + i * 35) % 0.4) * avgRadius;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            const size = avgRadius * (0.08 + ((this.craterSeed + i * 15) % 0.08));
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Bright orange outline
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FF8800';
        ctx.lineWidth = 3;
        ctx.beginPath();
        let firstOutlinePoint = true;
        
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2 + this.shapeOffset;
            const variation = 0.7 + Math.sin(i * 2.3 + this.craterSeed) * this.shapeVariation;
            const x = Math.cos(angle) * radiusX * variation;
            const y = Math.sin(angle) * radiusY * variation;
            
            if (firstOutlinePoint) {
                ctx.moveTo(x, y);
                firstOutlinePoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        
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
        
        // Fuel tracers for dopamine effect
        this.tracers = [];
        this.tracerTimer = 0;
    }
    
    update() {
        // Fall downward at consistent speed
        this.y += this.fallSpeed;
        
        // Add slight horizontal wobble for visual interest
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 0.5;
        
        // Keep within screen bounds horizontally
        this.x = Math.max(15, Math.min(canvas.width - 15, this.x));
        
        // Create fuel tracers for visual effect
        this.tracerTimer++;
        if (this.tracerTimer % 3 === 0) { // Create tracers every 3 frames
            const centerX = this.x + 15;
            const centerY = this.y + 15;
            
            // Create green/yellow fuel tracers
            for (let i = 0; i < 2; i++) {
                this.tracers.push({
                    x: centerX + (Math.random() - 0.5) * 20,
                    y: centerY + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -this.fallSpeed * 0.5 + (Math.random() - 0.5) * 1,
                    life: 20 + Math.random() * 15,
                    maxLife: 20 + Math.random() * 15,
                    size: 1.5 + Math.random() * 2,
                    hue: 60 + Math.random() * 60, // Green to yellow range
                });
            }
        }
        
        // Update existing tracers
        this.tracers = this.tracers.filter(tracer => {
            tracer.x += tracer.vx;
            tracer.y += tracer.vy;
            tracer.life--;
            tracer.vx *= 0.99;
            tracer.vy *= 0.99;
            return tracer.life > 0;
        });
    }
    
    render(ctx) {
        // Draw the fuel tracers first (behind the fuel)
        this.tracers.forEach(tracer => {
            const alpha = tracer.life / tracer.maxLife;
            
            ctx.save();
            ctx.globalAlpha = alpha * 0.7;
            
            // Create gradient for fuel tracer glow
            const gradient = ctx.createRadialGradient(tracer.x, tracer.y, 0, tracer.x, tracer.y, tracer.size * 1.5);
            gradient.addColorStop(0, `hsla(${tracer.hue}, 90%, 70%, ${alpha})`);
            gradient.addColorStop(0.6, `hsla(${tracer.hue}, 80%, 50%, ${alpha * 0.5})`);
            gradient.addColorStop(1, `hsla(${tracer.hue}, 70%, 30%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(tracer.x, tracer.y, tracer.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright core
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = `hsla(${tracer.hue}, 100%, 80%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(tracer.x, tracer.y, tracer.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
        
        // Then draw the fuel canister using parent method
        super.render(ctx);
    }
}

// Create game objects
const game = new Game();
const zinsco = new Zinsco();
const moon = new Moon();

console.log('Game objects created:', { game, zinsco, moon });

// Make game globally accessible for debugging
window.game = game;

// Add global ESC key listener
document.addEventListener('keydown', function(e) {
    console.log('Global key listener - Key pressed:', e.code, e.key);
    if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Global ESC detected, calling game.handleEscapeKey()');
        if (window.game && typeof window.game.handleEscapeKey === 'function') {
            window.game.handleEscapeKey();
        } else {
            console.error('Game object or handleEscapeKey method not found');
        }
    }
}, true); // Use capture phase to catch it early

// Game loop
function gameLoop() {
    game.update();
    game.render();
    requestAnimationFrame(gameLoop);
}

gameLoop();