// Wave Generation, Spawning Portals, Pacing, and Escalating Difficulty
class WaveManager {
    constructor() {
        this.currentWave = 1;
        this.overdriveCycle = 1; // Increments after defeating Boss
        this.enemiesToSpawn = [];
        this.activePortals = []; // { x, y, type, timer, makeElite }
        this.waveActive = false;
        this.waveClearDelay = 0;
        this.bannerText = '';
        this.bannerSubtext = '';
        this.bannerTimer = 0;
    }

    reset() {
        this.currentWave = 1;
        this.overdriveCycle = 1;
        this.enemiesToSpawn = [];
        this.activePortals = [];
        this.waveActive = false;
        this.waveClearDelay = 0;
        this.bannerTimer = 0;
    }

    startWave(waveNum, arena) {
        this.currentWave = waveNum;
        this.enemiesToSpawn = [];
        this.activePortals = [];
        this.waveActive = true;
        this.waveClearDelay = 0;

        // Determine composition
        const waveInCycle = ((this.currentWave - 1) % 10) + 1;
        this.overdriveCycle = Math.floor((this.currentWave - 1) / 10) + 1;

        if (waveInCycle === 10) {
            this.setupBossWave(arena);
        } else {
            this.setupStandardWave(waveInCycle, arena);
        }

        // Show wave banner
        this.bannerTimer = 2.4;
        if (waveInCycle === 10) {
            this.bannerText = 'ALERTA DE CHEFE!';
            this.bannerSubtext = 'OVERLOAD V-1: APEX ENFORCER';
            if (window.soundEngine) window.soundEngine.playBossRoar();
        } else if (waveInCycle === 5) {
            this.bannerText = `WAVE ${this.currentWave}: INVASÃO ELITE`;
            this.bannerSubtext = 'INIMIGOS MODIFICADOS DETECTADOS';
            if (window.soundEngine) window.soundEngine.playLaserCharge();
        } else {
            this.bannerText = `WAVE ${this.currentWave}`;
            this.bannerSubtext = this.overdriveCycle > 1 ? `CICLO OVERDRIVE ${this.overdriveCycle}` : 'SOBREVIVA À ARENA';
        }
    }

    setupStandardWave(waveInCycle, arena) {
        const queue = [];
        const scaleMult = 1 + (this.overdriveCycle - 1) * 0.35;

        switch (waveInCycle) {
            case 1:
                // Wave 1: 5-6 basic crawlers
                this.addEnemies(queue, 'crawler', Math.round(5 * scaleMult));
                break;
            case 2:
                // Wave 2: Crawlers + Drones
                this.addEnemies(queue, 'crawler', Math.round(6 * scaleMult));
                this.addEnemies(queue, 'drone', Math.round(4 * scaleMult));
                break;
            case 3:
                // Wave 3: Crawlers + Railgunners + Drones
                this.addEnemies(queue, 'crawler', Math.round(5 * scaleMult));
                this.addEnemies(queue, 'railgunner', Math.round(3 * scaleMult));
                this.addEnemies(queue, 'drone', Math.round(3 * scaleMult));
                break;
            case 4:
                // Wave 4: Goliaths + Drones + Crawlers
                this.addEnemies(queue, 'goliath', Math.round(2 * scaleMult));
                this.addEnemies(queue, 'drone', Math.round(5 * scaleMult));
                this.addEnemies(queue, 'crawler', Math.round(6 * scaleMult));
                break;
            case 5:
                // Wave 5: ELITE ENCOUNTER!
                this.addEnemies(queue, 'fastblade', Math.round(4 * scaleMult));
                this.addEnemies(queue, 'goliath', 1, true); // 1 Elite Goliath
                this.addEnemies(queue, 'drone', 2, true);   // 2 Elite Drones
                this.addEnemies(queue, 'crawler', Math.round(5 * scaleMult));
                break;
            case 6:
                // Wave 6: Mix with Volatile Kamikazes
                this.addEnemies(queue, 'volatile', Math.round(4 * scaleMult));
                this.addEnemies(queue, 'fastblade', Math.round(4 * scaleMult));
                this.addEnemies(queue, 'railgunner', Math.round(3 * scaleMult));
                this.addEnemies(queue, 'crawler', Math.round(6 * scaleMult));
                break;
            case 7:
                // Wave 7: Fast Blades + Railgunners + Drones
                this.addEnemies(queue, 'fastblade', Math.round(6 * scaleMult));
                this.addEnemies(queue, 'railgunner', Math.round(4 * scaleMult));
                this.addEnemies(queue, 'drone', Math.round(5 * scaleMult));
                break;
            case 8:
                // Wave 8: Heavy Goliaths + Volatiles + Swarms
                this.addEnemies(queue, 'goliath', Math.round(3 * scaleMult));
                this.addEnemies(queue, 'volatile', Math.round(6 * scaleMult));
                this.addEnemies(queue, 'crawler', Math.round(8 * scaleMult));
                this.addEnemies(queue, 'drone', Math.round(4 * scaleMult));
                break;
            case 9:
                // Wave 9: Mini-boss barrage (3 Elites + mix)
                this.addEnemies(queue, 'fastblade', 2, true);
                this.addEnemies(queue, 'goliath', 1, true);
                this.addEnemies(queue, 'railgunner', 2, true);
                this.addEnemies(queue, 'volatile', Math.round(4 * scaleMult));
                this.addEnemies(queue, 'crawler', Math.round(6 * scaleMult));
                break;
        }

        // Shuffle queue
        this.enemiesToSpawn = queue.sort(() => 0.5 - Math.random());
    }

    setupBossWave(arena) {
        this.enemiesToSpawn = [
            { type: 'boss', isElite: false },
            { type: 'drone', isElite: false },
            { type: 'drone', isElite: false }
        ];
    }

    addEnemies(queue, type, count, isElite = false) {
        for (let i = 0; i < count; i++) {
            queue.push({ type, isElite });
        }
    }

    update(dt, arena, enemies, activeEnemiesList) {
        if (!this.waveActive) return;

        if (this.bannerTimer > 0) {
            this.bannerTimer -= dt;
        }

        // Paced spawning: if queue has items and less than 12 enemies on field
        if (this.enemiesToSpawn.length > 0 && activeEnemiesList.length + this.activePortals.length < 10) {
            const nextEnemy = this.enemiesToSpawn.pop();
            this.createSpawnPortal(nextEnemy, arena);
        }

        // Update active portals
        for (let i = this.activePortals.length - 1; i >= 0; i--) {
            const portal = this.activePortals[i];
            portal.timer -= dt;

            // Spawn particles at portal
            if (Math.random() < 0.4 && window.particles) {
                window.particles.createSparks(portal.x, portal.y, 2, portal.isElite ? '#ffd700' : '#ff0055', 40, 120, 2);
            }

            if (portal.timer <= 0) {
                // Spawn enemy from portal
                const spawned = this.instantiateEnemy(portal.type, portal.x, portal.y, portal.isElite);
                if (spawned) {
                    activeEnemiesList.push(spawned);
                    if (window.particles) {
                        window.particles.createShockwave(portal.x, portal.y, 50, portal.isElite ? '#ffd700' : '#00f0ff', 0.25, 4);
                    }
                }
                this.activePortals.splice(i, 1);
            }
        }

        // Check wave completion
        if (this.enemiesToSpawn.length === 0 && this.activePortals.length === 0 && activeEnemiesList.length === 0) {
            this.waveClearDelay += dt;
            if (this.waveClearDelay >= 1.2) {
                this.waveActive = false;
                // Wave completed! Trigger upgrade choice
                if (window.gameInstance) {
                    window.gameInstance.onWaveCleared();
                }
            }
        }
    }

    createSpawnPortal(enemyData, arena) {
        // Pick spawn location
        let pt;
        if (enemyData.type === 'drone') {
            pt = arena.spawnPoints.air[Math.floor(Math.random() * arena.spawnPoints.air.length)];
        } else if (enemyData.type === 'boss') {
            pt = { x: arena.width / 2, y: 350 };
        } else if (Math.random() < 0.3) {
            pt = arena.spawnPoints.side[Math.floor(Math.random() * arena.spawnPoints.side.length)];
        } else {
            pt = arena.spawnPoints.ground[Math.floor(Math.random() * arena.spawnPoints.ground.length)];
        }

        this.activePortals.push({
            x: pt.x,
            y: pt.y,
            type: enemyData.type,
            isElite: enemyData.isElite,
            timer: 0.95 // Portal telegraph duration
        });
    }

    instantiateEnemy(type, x, y, isElite = false) {
        let enemy = null;
        switch (type) {
            case 'crawler':
                enemy = new window.CrawlerEnemy(x, y);
                break;
            case 'drone':
                enemy = new window.DroneEnemy(x, y);
                break;
            case 'railgunner':
                enemy = new window.RailgunnerEnemy(x, y);
                break;
            case 'fastblade':
                enemy = new window.FastBladeEnemy(x, y);
                break;
            case 'goliath':
                enemy = new window.GoliathEnemy(x, y);
                break;
            case 'volatile':
                enemy = new window.VolatileEnemy(x, y);
                break;
            case 'boss':
                enemy = new window.ApexBoss(x, y);
                break;
        }

        if (enemy && isElite) {
            enemy.makeElite();
        }

        // Apply overdrive cycle scaling to HP
        if (enemy && this.overdriveCycle > 1) {
            const cycleBoost = 1 + (this.overdriveCycle - 1) * 0.25;
            enemy.maxHp = Math.round(enemy.maxHp * cycleBoost);
            enemy.hp = enemy.maxHp;
        }

        return enemy;
    }

    drawPortals(ctx) {
        for (const p of this.activePortals) {
            ctx.save();
            const progress = 1.0 - (p.timer / 0.95);
            const radius = 22 * Math.sin(progress * Math.PI);
            const color = p.isElite ? '#ffd700' : '#ff0055';

            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 18;
            ctx.lineWidth = 3;

            // Rotating cyber portal rings
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, radius, radius * 1.5, progress * Math.PI * 4, 0, Math.PI * 2);
            ctx.stroke();

            // Inner core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    drawBanner(ctx, viewportWidth) {
        if (this.bannerTimer > 0) {
            ctx.save();
            const alpha = Math.min(1.0, this.bannerTimer * 1.5);
            ctx.globalAlpha = alpha;

            ctx.font = '900 38px "Outfit", "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 20;
            ctx.fillText(this.bannerText, viewportWidth / 2, 140);

            if (this.bannerSubtext) {
                ctx.font = '700 16px "Outfit", "Inter", sans-serif';
                ctx.fillStyle = '#ff0055';
                ctx.shadowColor = '#ff0055';
                ctx.shadowBlur = 10;
                ctx.fillText(this.bannerSubtext, viewportWidth / 2, 172);
            }
            ctx.restore();
        }
    }
}

window.waveManager = new WaveManager();
