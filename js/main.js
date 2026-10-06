// Main Game Orchestrator & Render Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.width = 1280;
        this.height = 720;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Subsystems
        this.arena = new window.Arena();
        this.camera = new window.Camera(this.width, this.height);
        this.camera.setBounds(0, this.arena.width, 0, this.arena.height);
        window.camera = this.camera;

        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.shards = []; // Collectible dropped shards

        // State Machine
        this.state = 'MENU'; // 'MENU', 'PLAYING', 'UPGRADE', 'PAUSED', 'GAMEOVER', 'SHOP'
        this.killsThisRun = 0;
        this.shardsCollectedThisRun = 0;

        // Delta time handling
        this.lastTime = performance.now();
        this.targetFPS = 60;
        this.maxDT = 0.05;

        // UI Elements Cache
        this.initUI();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        // Global reference
        window.gameInstance = this;

        // Start Loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    handleResize() {
        // Maintain 16:9 aspect ratio or fit window nicely
        const windowW = window.innerWidth;
        const windowH = window.innerHeight;
        const scale = Math.min(windowW / this.width, windowH / this.height);
        this.canvas.style.width = `${Math.floor(this.width * scale)}px`;
        this.canvas.style.height = `${Math.floor(this.height * scale)}px`;
    }

    initUI() {
        // Menu Buttons
        document.getElementById('btnStartRun').onclick = () => this.startNewRun();
        document.getElementById('btnOpenShop').onclick = () => this.openShop();
        document.getElementById('btnOpenControls').onclick = () => this.openControlsModal();
        document.getElementById('btnCloseControls').onclick = () => this.closeControlsModal();
        
        // Shop Buttons
        document.getElementById('btnCloseShop').onclick = () => this.closeShop();

        // Game Over Buttons
        document.getElementById('btnRetry').onclick = () => this.startNewRun();
        document.getElementById('btnShopFromOver').onclick = () => this.openShop();
        document.getElementById('btnMenuFromOver').onclick = () => this.returnToMenu();

        // Pause Menu
        document.getElementById('btnResume').onclick = () => this.togglePause();
        document.getElementById('btnMenuFromPause').onclick = () => this.returnToMenu();
        document.getElementById('btnToggleMute').onclick = () => {
            const isMuted = window.soundEngine.toggleMute();
            document.getElementById('btnToggleMute').innerText = isMuted ? '🔊 Ativar Som' : '🔇 Silenciar';
        };

        // Upgrade Reroll Button
        document.getElementById('btnReroll').onclick = () => this.rerollUpgrades();

        // Audio initialization on first user interaction
        window.addEventListener('click', () => {
            if (window.soundEngine) window.soundEngine.init();
        }, { once: true });
        window.addEventListener('keydown', () => {
            if (window.soundEngine) window.soundEngine.init();
        }, { once: true });
    }

    startNewRun() {
        if (window.soundEngine) {
            window.soundEngine.init();
            window.soundEngine.resume();
        }

        // Initialize Player & Reset Systems
        this.player = new window.Player(900, 1000);
        this.player.applyMetaUpgrades(window.metaProgression.data);

        this.enemies = [];
        this.projectiles = [];
        this.shards = [];
        this.killsThisRun = 0;
        this.shardsCollectedThisRun = 0;

        window.particles.reset();
        window.waveManager.reset();
        window.upgradeManager.reset(window.metaProgression.data.rerollLevel);

        this.hideAllModals();
        document.getElementById('hud').classList.remove('hidden');

        this.state = 'PLAYING';
        window.waveManager.startWave(1, this.arena);
    }

    onWaveCleared() {
        this.state = 'UPGRADE';
        if (window.soundEngine) window.soundEngine.playUpgradeSelect();
        this.renderUpgradeModal();
    }

    renderUpgradeModal() {
        const modal = document.getElementById('upgradeModal');
        const cardsContainer = document.getElementById('upgradeCards');
        const rerollBtn = document.getElementById('btnReroll');

        cardsContainer.innerHTML = '';
        const options = window.upgradeManager.getRandomOptions(3);

        options.forEach((upgrade) => {
            const card = document.createElement('div');
            card.className = `upgrade-card rarity-${upgrade.rarity.toLowerCase()}`;
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-icon">${upgrade.icon}</span>
                    <span class="card-build-badge">${upgrade.build}</span>
                </div>
                <h3 class="card-title">${upgrade.name}</h3>
                <div class="card-rarity">${upgrade.rarity}</div>
                <p class="card-desc">${upgrade.description}</p>
                <button class="btn-select-card">ESCOLHER</button>
            `;

            card.onclick = () => {
                window.upgradeManager.applyUpgrade(upgrade, this.player);
                this.updateBuildHud();
                modal.classList.add('hidden');
                this.state = 'PLAYING';
                window.waveManager.startWave(window.waveManager.currentWave + 1, this.arena);
            };

            cardsContainer.appendChild(card);
        });

        rerollBtn.innerText = `RE-ROLAR (${window.upgradeManager.rerollsRemaining})`;
        rerollBtn.disabled = window.upgradeManager.rerollsRemaining <= 0;

        modal.classList.remove('hidden');
    }

    rerollUpgrades() {
        if (window.upgradeManager.rerollsRemaining > 0) {
            window.upgradeManager.rerollsRemaining--;
            if (window.soundEngine) window.soundEngine.playDash();
            this.renderUpgradeModal();
        }
    }

    updateBuildHud() {
        const container = document.getElementById('hudUpgrades');
        container.innerHTML = '';
        window.upgradeManager.selectedUpgrades.forEach((u) => {
            const icon = document.createElement('span');
            icon.className = 'hud-upgrade-badge';
            icon.title = `${u.name} - ${u.description}`;
            icon.innerText = u.icon;
            container.appendChild(icon);
        });
    }

    gameOver() {
        this.state = 'GAMEOVER';
        window.metaProgression.recordRun(window.waveManager.currentWave, this.killsThisRun);
        window.metaProgression.addShards(this.shardsCollectedThisRun);

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('statWave').innerText = window.waveManager.currentWave;
        document.getElementById('statKills').innerText = this.killsThisRun;
        document.getElementById('statShards').innerText = this.shardsCollectedThisRun;
        document.getElementById('totalShardsOver').innerText = window.metaProgression.data.shards;

        document.getElementById('gameOverModal').classList.remove('hidden');
    }

    openShop() {
        this.hideAllModals();
        this.renderShop();
        document.getElementById('shopModal').classList.remove('hidden');
    }

    closeShop() {
        document.getElementById('shopModal').classList.add('hidden');
        if (this.state === 'GAMEOVER') {
            document.getElementById('gameOverModal').classList.remove('hidden');
        } else {
            document.getElementById('mainMenu').classList.remove('hidden');
        }
    }

    renderShop() {
        document.getElementById('shopShardsCount').innerText = window.metaProgression.data.shards;
        const list = document.getElementById('shopItemsList');
        list.innerHTML = '';

        for (const key in window.metaProgression.UPGRADE_DEFINITIONS) {
            const def = window.metaProgression.UPGRADE_DEFINITIONS[key];
            const currentLevel = window.metaProgression.data[def.key];
            const isMax = currentLevel >= def.maxLevel;
            const cost = isMax ? 'MAX' : def.costs[currentLevel];
            const canAfford = !isMax && window.metaProgression.data.shards >= cost;

            const item = document.createElement('div');
            item.className = 'shop-item';
            item.innerHTML = `
                <div class="shop-info">
                    <h4>${def.name} <span class="shop-level">Nv. ${currentLevel}/${def.maxLevel}</span></h4>
                    <p>${def.desc}</p>
                </div>
                <div class="shop-action">
                    <span class="shop-cost">${isMax ? 'COMPLETO' : `💎 ${cost}`}</span>
                    <button class="btn-buy-upgrade ${canAfford ? 'affordable' : ''}" ${!canAfford ? 'disabled' : ''}>
                        ${isMax ? 'MÁXIMO' : 'MELHORAR'}
                    </button>
                </div>
            `;

            if (!isMax && canAfford) {
                const btn = item.querySelector('.btn-buy-upgrade');
                btn.onclick = () => {
                    if (window.metaProgression.buyUpgrade(key)) {
                        this.renderShop();
                    }
                };
            }

            list.appendChild(item);
        }
    }

    openControlsModal() {
        document.getElementById('controlsModal').classList.remove('hidden');
    }

    closeControlsModal() {
        document.getElementById('controlsModal').classList.add('hidden');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pauseModal').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pauseModal').classList.add('hidden');
        }
    }

    returnToMenu() {
        this.hideAllModals();
        document.getElementById('mainMenu').classList.remove('hidden');
        document.getElementById('menuHighScore').innerText = window.metaProgression.data.highScoreWave;
        document.getElementById('menuShards').innerText = window.metaProgression.data.shards;
        this.state = 'MENU';
    }

    hideAllModals() {
        document.getElementById('mainMenu').classList.add('hidden');
        document.getElementById('upgradeModal').classList.add('hidden');
        document.getElementById('gameOverModal').classList.add('hidden');
        document.getElementById('shopModal').classList.add('hidden');
        document.getElementById('controlsModal').classList.add('hidden');
        document.getElementById('pauseModal').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
    }

    spawnShards(x, y, count = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 200;
            this.shards.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 120,
                radius: 6,
                magnetRange: 220,
                color: '#ffd700',
                life: 18.0
            });
        }
    }

    updateShards(dt) {
        if (!this.player) return;
        const px = this.player.x + this.player.width / 2;
        const py = this.player.y + this.player.height / 2;

        for (let i = this.shards.length - 1; i >= 0; i--) {
            const s = this.shards[i];
            s.life -= dt;
            if (s.life <= 0) {
                this.shards.splice(i, 1);
                continue;
            }

            const dx = px - s.x;
            const dy = py - s.y;
            const dist = Math.hypot(dx, dy);

            // Magnet attraction
            if (dist < s.magnetRange) {
                const pullSpeed = 680 * (1.0 - dist / s.magnetRange) + 180;
                s.vx += (dx / dist) * pullSpeed * dt * 4;
                s.vy += (dy / dist) * pullSpeed * dt * 4;
            } else {
                s.vx *= 0.94;
                s.vy += 450 * dt; // Gravity on shards
                if (s.vy > 400) s.vy = 400;
            }

            s.x += s.vx * dt;
            s.y += s.vy * dt;

            // Collect check
            if (dist < s.radius + 20) {
                this.shardsCollectedThisRun++;
                if (window.soundEngine) window.soundEngine.playJump();
                if (window.particles) {
                    window.particles.createSparks(s.x, s.y, 8, '#ffd700', 80, 220);
                }
                this.shards.splice(i, 1);
            }
        }
    }

    // --- MAIN GAME LOOP ---
    gameLoop(timestamp) {
        const rawDT = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const dt = Math.min(rawDT, this.maxDT);

        // Input update
        window.input.update(dt, this.camera);

        // Pause Key check
        if (window.input.justPressed('pause')) {
            if (this.state === 'PLAYING' || this.state === 'PAUSED') {
                this.togglePause();
            }
        }

        if (this.state === 'PLAYING') {
            this.update(dt);
        }

        this.render();

        window.input.postUpdate();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // Camera Hitstop update
        const canAdvance = this.camera.update(dt, this.player);
        if (!canAdvance) return; // Hitstop freeze

        this.arena.update(dt);
        this.player.update(dt, this.arena, window.input);

        // Check Player Death
        if (this.player.isDead) {
            this.gameOver();
            return;
        }

        // Projectiles Update
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this.player, this.arena);
            if (p.isDead) {
                this.projectiles.splice(i, 1);
            }
        }

        // Enemies Update
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, this.player, this.arena, this.projectiles);

            // Check Player Attack Collision against Enemy
            if (this.player.hitbox && !this.player.hitEnemiesThisSwing.has(enemy)) {
                if (this.player.boxesIntersect(this.player.hitbox, enemy)) {
                    this.resolvePlayerHitOnEnemy(enemy);
                }
            }

            if (enemy.isDead) {
                this.killsThisRun++;
                // Check perk on kill
                if (this.player.dashResetsOnKill) {
                    this.player.dashCharges = Math.min(this.player.maxDashCharges, this.player.dashCharges + 1);
                }
                if (this.player.lifestealOnKill > 0) {
                    this.player.heal(this.player.lifestealOnKill);
                }
                this.enemies.splice(i, 1);
            }
        }

        // Waves & Spawning
        window.waveManager.update(dt, this.arena, this.enemies, this.enemies);

        // Shards
        this.updateShards(dt);

        // Particles
        window.particles.update(dt);

        // Update HUD
        this.updateHUD();
    }

    resolvePlayerHitOnEnemy(enemy) {
        this.player.hitEnemiesThisSwing.add(enemy);

        const hb = this.player.hitbox;
        let damage = hb.damage;

        // Aerial bonus
        if (!this.player.isGrounded && this.player.aerialDamageBonus > 0) {
            damage *= (1 + this.player.aerialDamageBonus);
        }

        // Executioner bonus
        if (this.player.executionerMark && enemy.hp / enemy.maxHp < 0.4) {
            damage *= 1.75;
        }

        // Crit roll
        const isCrit = Math.random() < this.player.critChance;
        if (isCrit) {
            damage *= this.player.critMult;
        }

        // Directional Knockback
        const kx = (this.player.facing * (hb.knockback || 450));
        const ky = hb.isAir ? -220 : -180;

        enemy.takeDamage(damage, kx, ky, isCrit);

        // Hitstop micro freeze for meaty punch
        this.camera.triggerHitstop(isCrit ? 0.055 : 0.035);

        // Chain Lightning Perk
        if (this.player.chainLightning) {
            let arcsLeft = 3;
            for (const other of this.enemies) {
                if (other !== enemy && !other.isDead && arcsLeft > 0) {
                    const d = Math.hypot(other.x - enemy.x, other.y - enemy.y);
                    if (d < 280) {
                        other.takeDamage(damage * 0.45, 0, -100, false);
                        arcsLeft--;
                        if (window.particles) {
                            window.particles.createSparks(other.x + other.width / 2, other.y + other.height / 2, 6, '#00f0ff', 80, 260);
                        }
                    }
                }
            }
        }
    }

    updateHUD() {
        if (!this.player) return;

        // Health Bar
        const hpPercent = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
        document.getElementById('hudHpFill').style.width = `${hpPercent}%`;
        document.getElementById('hudHpText').innerText = `${Math.round(this.player.hp)} / ${this.player.maxHp}`;

        // Dash Pips
        const dashContainer = document.getElementById('hudDashPips');
        dashContainer.innerHTML = '';
        for (let i = 0; i < this.player.maxDashCharges; i++) {
            const pip = document.createElement('div');
            pip.className = `dash-pip ${i < this.player.dashCharges ? 'ready' : ''}`;
            dashContainer.appendChild(pip);
        }

        // Waves & Enemies
        document.getElementById('hudWave').innerText = window.waveManager.currentWave;
        const totalEnemiesRemaining = this.enemies.length + window.waveManager.enemiesToSpawn.length + window.waveManager.activePortals.length;
        document.getElementById('hudEnemiesLeft').innerText = totalEnemiesRemaining;

        // Shards
        document.getElementById('hudShards').innerText = this.shardsCollectedThisRun;

        // Boss Health Bar check
        const boss = this.enemies.find(e => e instanceof window.ApexBoss);
        const bossBarContainer = document.getElementById('bossHealthContainer');
        if (boss && !boss.isDead) {
            bossBarContainer.classList.remove('hidden');
            const bossHpPercent = Math.max(0, (boss.hp / boss.maxHp) * 100);
            document.getElementById('bossHpFill').style.width = `${bossHpPercent}%`;
            document.getElementById('bossName').innerText = boss.name;
        } else {
            bossBarContainer.classList.add('hidden');
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Apply dynamic camera transform
        this.camera.applyTransform(this.ctx);

        // 1. Draw Arena Architecture & Hazards
        this.arena.draw(this.ctx);

        // 2. Draw Enemy Spawn Portals
        window.waveManager.drawPortals(this.ctx);

        // 3. Draw Collectible Shards
        for (const s of this.shards) {
            this.ctx.save();
            this.ctx.fillStyle = s.color;
            this.ctx.shadowColor = s.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 4. Draw Projectiles
        for (const p of this.projectiles) {
            p.draw(this.ctx);
        }

        // 5. Draw Enemies
        for (const e of this.enemies) {
            e.draw(this.ctx);
        }

        // 6. Draw Player
        if (this.player && !this.player.isDead) {
            this.player.draw(this.ctx);
        }

        // 7. Draw Particles, Trails & Floating Combat Text
        window.particles.draw(this.ctx);

        // Restore camera
        this.camera.restoreTransform(this.ctx);

        // 8. Screen-space Overlays (Wave Banner, Vignette)
        window.waveManager.drawBanner(this.ctx, this.width);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
