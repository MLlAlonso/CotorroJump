class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.initGameState();
    }

    initGameState() {
        this.leftPressed = false;
        this.rightPressed = false;
        this.gameStarted = false;
        this.score = 0;
        this.lastTouchedPlatformY = Infinity;
        this.hasShield = false;
        this.hasBoots = false;
        this.originalPlayerJumpSpeed = -550;
        this.timers = {
            damageObject: { elapsed: 0, interval: Phaser.Math.Between(8000, 12000) },
            scoreBonus: { elapsed: 0, interval: 10000 },
            shieldObject: { elapsed: 0, interval: 18000 },
            bootsObject: { elapsed: 0, interval: 15000 },
            bootsEffect: { elapsed: 0, duration: 5000 }
        };
        this.shieldObject = null;
        this.bootsObject = null;
        this.isPaused = false;
        this.specialObjectsGravity = 10;
        this.platformTypes = ['static', 'bomb'];
        this.platforms = null;
        this.bombPlatformPercentage = 0.15;
        // Agregamos variables para los sonidos
        this.jumpSound = null;
        this.cortinillaSound = null;
        this.hitSound = null;
        this.pickupSound = null;
    }

    preload() {
        this.load.image('sky', 'assets/sky.png');
        // Cargamos los archivos de sonido
        this.load.audio('jump', 'assets/sounds/jump.wav');
        this.load.audio('star', 'assets/sounds/Cortinilla.wav');
        this.load.audio('hit', 'assets/sounds/hitHurt.wav');
        this.load.audio('pickup', 'assets/sounds/pickup.wav');
    }

    create() {
        this.setupScene();
        this.setupControls();
        this.setupSounds();
    }

    setupScene() {
        this.setupBackground();
        this.setupText();
        this.setupPlatforms();
        this.setupPlayer();
        this.setupFallingObjects();
        this.setupShieldObjects();
        this.setupBootsObjects();
        this.setupCamera();
        this.setupCollisions();
        this.setupPauseButton();
        this.setupSounds();
    }

    setupBackground() {
        this.bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height * 2, 'sky')
            .setOrigin(0, 1)
            .setScrollFactor(0);
    }

    setupSounds() {
        this.jumpSound = this.sound.add('jump', { volume: 0.35 });
        this.hitSound = this.sound.add('hit');
        this.pickupSound = this.sound.add('pickup');
        this.starSound = this.sound.add('star', {
            loop: false,
            volume: 0.20, // Ajustar volumen
        });
        this.starSound.play(); // Se reproduce en el inicio
    }

    setupText() {
        this.startText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Presiona espacio o toca para comenzar', {
            fontSize: '15px',
            fill: '#000',
            padding: { x: 10, y: 6 },
            align: 'center'
        }).setOrigin(0.5);

        this.scoreText = this.add.text(10, 10, 'Puntos: 0', {
            fontSize: '18px',
            fill: '#000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(10);
    }

    /*  -----------------------
            Game State   
        -----------------------
    */
    setupCamera() {
        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
        this.cameras.main.setDeadzone(100, 200).setBounds(0, -Infinity, this.scale.width, Infinity);
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
        this.input.on('pointerdown', () => this.startGame());
        this.setupTouchControls();
        this.input.keyboard.on('keydown-P', () => this.togglePause());
    }

    setupTouchControls() {
        if (this.isMobileDevice()) {
            this.input.on('pointerdown', (pointer) => {
                const mid = this.scale.width / 2;
                if (pointer.x < mid) {
                    this.leftPressed = true;
                    this.rightPressed = false;
                } else {
                    this.leftPressed = false;
                    this.rightPressed = true;
                }
            });

            this.input.on('pointermove', (pointer) => {
                const mid = this.scale.width / 2;
                if (pointer.isDown) {
                    if (pointer.x < mid) {
                        this.leftPressed = true;
                        this.rightPressed = false;
                    } else {
                        this.leftPressed = false;
                        this.rightPressed = true;
                    }
                }
            });

            this.input.on('pointerup', () => {
                this.leftPressed = false;
                this.rightPressed = false;
            });
        } else {
            // Soporte para controles de escritorio
            const setButtonState = (btn, state) => {
                ['pointerdown', 'pointerup', 'pointerout', 'pointercancel'].forEach(event =>
                    btn?.addEventListener(event, () => this[state] = event === 'pointerdown')
                );
            };

            const leftBtn = document.getElementById('left-btn');
            const rightBtn = document.getElementById('right-btn');
            if (leftBtn && rightBtn) {
                setButtonState(leftBtn, 'leftPressed');
                setButtonState(rightBtn, 'rightPressed');
            }
        }
    }


    setupCollisions() {
        this.physics.add.overlap(this.player, this.fallingObjects, this.handleFallingObjectCollision, null, this);
        this.physics.add.overlap(this.player, this.shieldObjects, this.handleShieldCollision, null, this);
        this.physics.add.overlap(this.player, this.bootsObjects, this.handleBootsCollision, null, this);
    }

    setupPauseButton() {
        this.pauseBtn = document.getElementById('pause-btn');
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.pauseText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, 'Pausado', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5).setDepth(100).setVisible(false);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.physics.pause();
        // Agregar sonido para pausar
        this.pauseText.setVisible(this.isPaused);
        if (!this.isPaused) {
            this.physics.resume();
        }
    }

    startGame() {
        if (this.gameStarted) return;

        this.gameStarted = true;

        // Detener la cortinilla si está sonando
        if (this.cortinillaSound && this.cortinillaSound.isPlaying) {
            this.cortinillaSound.stop();
        }

        this.startText.destroy();               // Eliminar texto de inicio
        this.player.body.allowGravity = true;  // Activar gravedad
        this.player.body.setVelocityY(-550);   // Primer salto
    }

    endGame() {
        this.player.setData('isAlive', false);
        this.player.body.setVelocityY(0);
        this.player.body.allowGravity = false;
        this.physics.pause();
        this.add.text(this.scale.width / 2, this.scale.height / 2, '¡Game Over!', {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);
    }

    isMobileDevice() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    /*  -----------------------
            Player   
        -----------------------
    */

    setupPlayer() {
        const bottomPlatform = this.platforms.getChildren()[0];
        this.player = this.physics.add.existing(
            this.add.rectangle(bottomPlatform.x, bottomPlatform.y - 40, 30, 30, 0x0000aa)
        );
        this.player.body.setCollideWorldBounds(false).setBounce(0).allowGravity = false;
        this.player.setData('isAlive', true);
        this.maxPlayerY = this.player.y;
        this.playerColor = 0x0000aa;
        this.originalPlayerJumpSpeed = -550;
    }

    handlePlayerMovement() {
        const moveSpeed = 200;
        const screenWidth = this.scale.width;

        let velocityX = 0;

        if (this.isMobileDevice()) {
            // En móviles: usar botones o touch
            if (this.leftPressed) {
                velocityX = -moveSpeed;
            } else if (this.rightPressed) {
                velocityX = moveSpeed;
            }
        } else {
            // En PC: usar teclas del teclado
            if (this.cursors.left.isDown) {
                velocityX = -moveSpeed;
            } else if (this.cursors.right.isDown) {
                velocityX = moveSpeed;
            }
        }

        this.player.body.setVelocityX(velocityX);

        // Envolvimiento horizontal
        const halfWidth = this.player.width / 2;
        if (this.player.x < -halfWidth) this.player.x = screenWidth + halfWidth;
        else if (this.player.x > screenWidth + halfWidth) this.player.x = -halfWidth;
    }


    /*  -----------------------
            Platforms   
        -----------------------
    */

    setupPlatforms() {
        this.platforms = this.physics.add.staticGroup();
        this.platformSpacing = 100;
        this.maxPlatforms = 15;

        for (let i = 0; i < 10; i++) {
            const type = Math.random() < this.bombPlatformPercentage ? 'bomb' : 'static';
            this.createPlatform(Phaser.Math.Between(30, this.scale.width - 30), 600 - i * this.platformSpacing, 'static');
        }

        this.lastGeneratedPlatformY = this.getHighestPlatformY();
    }

    createPlatform(x, y, type = 'static') {
        const platform = this.platforms.create(x, y, null)
            .setOrigin(0.5)
            .setDisplaySize(60, 20)
            .refreshBody();

        const gfx = this.add.rectangle(x, y, 60, 20, this.getPlatformColor(type));
        gfx.setDepth(1); // Opcional: controla que el jugador esté arriba

        platform.gfx = gfx;
        platform.update = () => {
            gfx.setPosition(platform.x, platform.y);
        };

        platform.type = type;
        platform.isOneWay = true;

        if (type === 'bomb') {
            platform.timer = null;
        }

        return platform;
    }


    getPlatformColor(type) {
        switch (type) {
            case 'static': return 0x84CA33;
            case 'bomb': return 0xF1DA10;
            default: return 0x84CA33;
        }
    }

    spawnPlatform(y) {
        const platformType = this.platformTypes[Phaser.Math.Between(0, this.platformTypes.length - 1)];
        this.createPlatform(Phaser.Math.Between(30, this.scale.width - 30), y, platformType);
    }

    getHighestPlatformY() {
        return Math.min(...this.platforms.getChildren().map(platform => platform.y));
    }

    handlePlatformCollisions() {
        this.physics.overlap(this.player, this.platforms, (player, platform) => {
            if (platform.isOneWay && player.body.velocity.y > 0 && Math.abs(player.body.bottom - platform.body.top) < 10) {
                player.body.setVelocityY(-550);
                this.jumpSound.play(); // Reproducir el sonido de salto aquí
                if (platform.y < this.lastTouchedPlatformY) {
                    this.lastTouchedPlatformY = platform.y;
                    this.scoreText.setText('Puntos: ' + (++this.score));
                }

                if (platform.type === 'bomb') {
                    if (!platform.timer) {
                        platform.timer = this.time.delayedCall(1500, () => {
                            platform.gfx?.destroy();
                            platform.destroy();
                            platform.timer = null;
                        });
                    }
                }
            }
        });
    }

    handlePlatformGeneration() {
        const bufferHeight = 3 * this.platformSpacing;
        while (this.lastGeneratedPlatformY > this.player.y - bufferHeight) {
            this.spawnPlatform(this.lastGeneratedPlatformY -= this.platformSpacing);
        }

        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        this.platforms.getChildren().forEach(platform => {
            if (platform.y > cameraBottom + 200) {
                platform.gfx?.destroy();
                platform.destroy();
            }
        });
    }

    /*  -----------------------
            Objects   
        -----------------------
    */
    setupFallingObjects() {
        this.fallingObjects = this.physics.add.group();
    }

    setupShieldObjects() {
        this.shieldObjects = this.physics.add.group();
    }

    setupBootsObjects() {
        this.bootsObjects = this.physics.add.group();
    }

    spawnFallingObject(type, color, velocityRange) {
        if (!this.gameStarted || !this.player.getData('isAlive')) return;
        const x = Phaser.Math.Between(30, this.scale.width - 30);
        const y = this.cameras.main.scrollY - this.scale.height * 1.5;
        const object = this.add.rectangle(x, y, 20, 20, color);
        this.physics.add.existing(object);
        object.body.setCircle(10);

        const fallTime = 50000; // Tiempo de caída para hacerlos más lentos
        const distance = this.scale.height * 1.5;
        const initialVelocity = (distance - 0.5 * 1000 * (fallTime * fallTime) / 1000000) / (fallTime / 1000);
        const slowMotionFactor = 0.2; // Factor de cámara lenta
        object.body.setVelocityY(initialVelocity * slowMotionFactor);
        object.setData('type', type);
        this.fallingObjects.add(object);
        object.alias = type === 'damage' ? 'Ladrillo' : 'DC3';
        return object;
    }

    spawnFallingDamageObject() {
        const damage = this.spawnFallingObject('damage', 0xff0000, [0, 0]);
        if (damage) {
            damage.body.gravity.y = this.specialObjectsGravity;
        }
    }

    spawnScoreBonusObject() {
        const score = this.spawnFallingObject('score', 0x0000ff, [0, 0]);
        if (score) {
            score.body.gravity.y = this.specialObjectsGravity;
        }
    }

    spawnShieldObject() {
        if (!this.gameStarted || !this.player.getData('isAlive') || this.hasShield) return;
        const x = Phaser.Math.Between(30, this.scale.width - 30);
        const y = this.cameras.main.scrollY - this.scale.height * 1.5;
        const shield = this.add.rectangle(x, y, 20, 20, 0xffff00);
        this.physics.add.existing(shield);
        shield.body.setImmovable(true);
        shield.body.gravity.y = this.specialObjectsGravity;
        this.shieldObjects.add(shield);
        this.shieldObject = shield;
        shield.alias = 'Casco';
    }

    spawnBootsObject() {
        if (!this.gameStarted || !this.player.getData('isAlive') || this.hasBoots) return;
        const x = Phaser.Math.Between(30, this.scale.width - 30);
        const y = this.cameras.main.scrollY - this.scale.height * 1.5;
        const boots = this.add.rectangle(x, y, 20, 20, 0x00ff00);
        this.physics.add.existing(boots);
        boots.body.setImmovable(true);
        boots.body.gravity.y = this.specialObjectsGravity;
        this.bootsObjects.add(boots);
        this.bootsObject = boots;
        boots.alias = 'Botas';
    }

    handleFallingObjectCollision(player, fallingObject) {
        if (!player.getData('isAlive')) return;

        const type = fallingObject.getData('type');
        if (type === 'damage') {
            this.hitSound.play();

            if (this.hasShield) {
                this.hasShield = false;
                this.player.fillColor = this.playerColor;
                this.shieldObject?.destroy();
                this.shieldObject = null;
                this.hitSound.play();
            } else {
                this.endGame();
            }
        } else if (type === 'score') {
            this.score += 10;
            this.scoreText.setText('Puntos: ' + this.score);
            this.pickupSound.play();
        }

        fallingObject.destroy();
    }

    handleShieldCollision(player, shield) {
        if (!this.hasShield) {
            this.hasShield = true;
            this.player.fillColor = 0xffff00;
            shield.destroy();
            this.shieldObject = null;
            this.pickupSound.play();
        }
    }

    handleBootsCollision(player, boots) {
        if (!this.hasBoots) {
            this.hasBoots = true;
            this.originalPlayerJumpSpeed = this.player.body.velocity.y;
            this.player.body.setVelocityY(-1000);
            this.timers.bootsEffect.elapsed = 0;
            this.timers.bootsEffect.duration = 5000;
            this.bootsObject.destroy();
            this.bootsObject = null;
            this.score += 3;
            this.scoreText.setText('Puntos: ' + this.score);
            this.pickupSound.play();
        }
    }

    handleFallingObjects(delta) {
        this.timers.damageObject.elapsed += delta;
        this.timers.scoreBonus.elapsed += delta;

        if (this.timers.damageObject.elapsed >= this.timers.damageObject.interval) {
            this.spawnFallingDamageObject();
            this.timers.damageObject.elapsed = 0;
            this.timers.damageObject.interval = Phaser.Math.Between(5000, 10000);
        }

        if (this.timers.scoreBonus.elapsed >= this.timers.scoreBonus.interval) {
            this.spawnScoreBonusObject();
            this.timers.scoreBonus.elapsed = 0;
            this.timers.scoreBonus.interval = Phaser.Math.Between(10000, 15000);
        }

        const cameraBottom = this.cameras.main.scrollY + this.scale.height;
        this.fallingObjects.getChildren().forEach(object => {
            if (object.y > cameraBottom + 50) {
                object.destroy();
            }
        });
    }

    handleShieldSpawning(delta) {
        this.timers.shieldObject.elapsed += delta;
        if (this.timers.shieldObject.elapsed >= this.timers.shieldObject.interval) {
            this.spawnShieldObject();
            this.timers.shieldObject.elapsed = 0;
        }
    }

    handleBootsSpawning(delta) {
        this.timers.bootsObject.elapsed += delta;
        if (this.timers.bootsObject.elapsed >= this.timers.bootsObject.interval) {
            this.spawnBootsObject();
            this.timers.bootsObject.elapsed = 0;
        }
    }

    handleBootsEffect(delta) {
        if (this.hasBoots) {
            this.timers.bootsEffect.elapsed += delta;
            if (this.timers.bootsEffect.elapsed >= this.timers.bootsEffect.duration) {
                this.hasBoots = false;
                this.player.fillColor = this.playerColor;
                this.player.body.setVelocityY(this.originalPlayerJumpSpeed);
            }
        }
    }


    update(time, delta) {
        if (!this.gameStarted || !this.player.getData('isAlive') || this.isPaused) return;

        this.handlePlayerMovement();
        this.handlePlatformCollisions();
        this.handlePlatformGeneration();
        this.handleFallingObjects(delta);
        this.handleShieldSpawning(delta);
        this.handleBootsSpawning(delta);
        this.handleBootsEffect(delta);
        this.bg.tilePositionY = this.cameras.main.scrollY; 
        this.platforms.children.iterate(platform => {
            if (platform && platform.update) {
                platform.update();
            }
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    backgroundColor: '#166180',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: [MainScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: 'game-container'
};

new Phaser.Game(config);