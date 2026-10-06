// Enemy System: Diverse AI behaviors, Projectiles, Elite modifiers, and Boss Encounter
class Projectile {
    constructor(x, y, vx, vy, damage = 15, radius = 6, color = '#ff0055', homing = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = radius;
        this.color = color;
        this.homing = homing;
        this.homingTimer = 1.2;
        this.life = 4.5;
        this.isDead = false;
    }

    update(dt, player, arena) {
        this.life -= dt;
        if (this.life <= 0) {
            this.isDead = true;
            return;
        }

        // Homing behavior
        if (this.homing && this.homingTimer > 0 && player) {
            this.homingTimer -= dt;
            const targetX = player.x + player.width / 2;
            const targetY = player.y + player.height / 2;
            const angleToTarget = Math.atan2(targetY - this.y, targetX - this.x);
            const currentAngle = Math.atan2(this.vy, this.vx);
            const speed = Math.hypot(this.vx, this.vy);

            // Interpolate angle
            let diff = angleToTarget - currentAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            const newAngle = currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), 3.5 * dt);
            this.vx = Math.cos(newAngle) * speed;
            this.vy = Math.sin(newAngle) * speed;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Trail sparks
        if (Math.random() < 0.4 && window.particles) {
            window.particles.createSparks(this.x, this.y, 1, this.color, 20, 60, 2);
        }

        // Check Arena Solids
        for (const s of arena.solids) {
            if (
                this.x + this.radius > s.x &&
                this.x - this.radius < s.x + s.width &&
                this.y + this.radius > s.y &&
                this.y - this.radius < s.y + s.height
            ) {
                this.isDead = true;
                if (window.particles) {
                    window.particles.createSparks(this.x, this.y, 8, this.color, 60, 180);
                }
                return;
            }
        }

        // Check Player Hit
        if (player && !player.isDead) {
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const dist = Math.hypot(px - this.x, py - this.y);
            if (dist < this.radius + 18) {
                player.takeDamage(this.damage);
                this.isDead = true;
                if (window.particles) {
                    window.particles.createSparks(this.x, this.y, 12, this.color, 100, 250);
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Base Enemy
class BaseEnemy {
    constructor(x, y, width, height, maxHp, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.speed = speed;

        this.vx = 0;
        this.vy = 0;
        this.facing = 1;
        this.isGrounded = false;
        this.isDead = false;

        this.hitFlashTimer = 0;
        this.isElite = false;
        this.shardReward = 1;

        // Knockback resistance
        this.knockbackResistance = 0.0;
    }

    takeDamage(amount, kx = 0, ky = 0, isCrit = false) {
        if (this.isDead) return false;

        this.hp -= amount;
        this.hitFlashTimer = 0.12;

        // Apply knockback
        const resist = 1.0 - this.knockbackResistance;
        this.vx += kx * resist;
        this.vy += ky * resist;

        if (window.soundEngine) window.soundEngine.playHitImpact(isCrit);
        if (window.camera) window.camera.addTrauma(isCrit ? 0.25 : 0.12);

        if (window.particles) {
            window.particles.addDamageText(this.x + this.width / 2, this.y, Math.round(amount), isCrit);
            window.particles.createSparks(this.x + this.width / 2, this.y + this.height / 2, isCrit ? 16 : 8, isCrit ? '#ff0055' : '#ffffff', 100, 360);
        }

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return true; // Fatal blow
        }
        return false;
    }

    die() {
        this.isDead = true;
        if (window.soundEngine) window.soundEngine.playEnemyDeath();
        if (window.camera) window.camera.addTrauma(0.18);
        if (window.particles) {
            window.particles.createShockwave(this.x + this.width / 2, this.y + this.height / 2, 70, this.isElite ? '#ffd700' : '#ff0055', 0.35, 4);
            window.particles.createSparks(this.x + this.width / 2, this.y + this.height / 2, 24, this.isElite ? '#ffd700' : '#ff0055', 120, 420);
        }

        // Spawn core shards
        if (window.gameInstance) {
            window.gameInstance.spawnShards(this.x + this.width / 2, this.y + this.height / 2, this.shardReward);
        }
    }

    makeElite() {
        this.isElite = true;
        this.maxHp = Math.round(this.maxHp * 2.4);
        this.hp = this.maxHp;
        this.width *= 1.25;
        this.height *= 1.25;
        this.shardReward *= 4;
        this.knockbackResistance = 0.45;
    }

    applyGravity(dt, gravity = 1800) {
        this.vy += gravity * dt;
        if (this.vy > 950) this.vy = 950;
    }

    resolveSolids(arena) {
        this.isGrounded = false;
        for (const s of arena.solids) {
            if (this.boxesIntersect(this, s)) {
                if (this.vy > 0 && this.y + this.height - this.vy * 0.03 <= s.y + 10) {
                    this.y = s.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                } else if (this.vx > 0) {
                    this.x = s.x - this.width;
                    this.vx = 0;
                } else if (this.vx < 0) {
                    this.x = s.x + s.width;
                    this.vx = 0;
                }
            }
        }
        // One-ways
        if (this.vy >= 0) {
            for (const plat of arena.oneWayPlatforms) {
                if (
                    this.x + this.width > plat.x &&
                    this.x < plat.x + plat.width &&
                    this.y + this.height >= plat.y &&
                    this.y + this.height <= plat.y + 16
                ) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                    break;
                }
            }
        }
    }

    boxesIntersect(r1, r2) {
        return (
            r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y
        );
    }

    drawHealthBar(ctx) {
        if (this.hp < this.maxHp) {
            const barW = Math.max(30, this.width);
            const barH = 5;
            const barX = this.x + (this.width - barW) / 2;
            const barY = this.y - 12;

            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(barX, barY, barW, barH);

            const hpPercent = Math.max(0, this.hp / this.maxHp);
            ctx.fillStyle = this.isElite ? '#ffd700' : '#ff0055';
            ctx.fillRect(barX, barY, barW * hpPercent, barH);
        }

        if (this.isElite) {
            // Draw Elite Golden Crown
            ctx.save();
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            const cx = this.x + this.width / 2;
            const cy = this.y - 18;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx - 12, cy - 8);
            ctx.lineTo(cx - 5, cy - 3);
            ctx.lineTo(cx, cy - 10);
            ctx.lineTo(cx + 5, cy - 3);
            ctx.lineTo(cx + 12, cy - 8);
            ctx.lineTo(cx + 10, cy);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }
}

// 1. NEON CRAWLER (Ground Chaser / Swarmer)
class CrawlerEnemy extends BaseEnemy {
    constructor(x, y) {
        super(x, y, 32, 34, 60, 220);
        this.jumpCooldown = 0;
        this.contactDamage = 18;
    }

    update(dt, player, arena) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

        // Path towards player horizontally
        const targetX = player.x + player.width / 2;
        const currentX = this.x + this.width / 2;
        const diffX = targetX - currentX;
        this.facing = Math.sign(diffX) || 1;

        // Move
        this.vx += (this.facing * this.speed - this.vx) * 0.12;

        // Leap if close or when encountering small ledge
        const dist = Math.hypot(diffX, player.y - this.y);
        if (this.isGrounded && dist < 180 && player.y < this.y - 40 && this.jumpCooldown <= 0) {
            this.vy = -620;
            this.vx = this.facing * (this.speed * 1.5);
            this.jumpCooldown = 1.8;
            this.isGrounded = false;
        }

        this.applyGravity(dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.resolveSolids(arena);

        // Contact attack
        if (this.boxesIntersect(this, player)) {
            player.takeDamage(this.contactDamage);
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = '#ff3366';
        }
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 4);
        ctx.fill();
        ctx.stroke();

        // Skittering legs
        ctx.fillStyle = '#ff0055';
        const legY = this.y + this.height - 4;
        ctx.fillRect(this.x + 4, legY, 6, 6);
        ctx.fillRect(this.x + this.width - 10, legY, 6, 6);

        this.drawHealthBar(ctx);
        ctx.restore();
    }
}

// 2. AERO DRONE (Flying Hunter)
class DroneEnemy extends BaseEnemy {
    constructor(x, y) {
        super(x, y, 36, 28, 48, 260);
        this.contactDamage = 16;
        this.swoopTimer = 0;
        this.knockbackResistance = 0.2;
    }

    update(dt, player, arena) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

        // Swoop motion towards player
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const dx = targetX - (this.x + this.width / 2);
        const dy = targetY - (this.y + this.height / 2);
        const dist = Math.hypot(dx, dy) || 1;

        this.facing = Math.sign(dx) || 1;

        // Flying physics
        const dirX = dx / dist;
        const dirY = dy / dist;
        this.vx += (dirX * this.speed - this.vx) * 0.08;
        this.vy += (dirY * this.speed - this.vy) * 0.08;

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Repel from solid arena bounds
        for (const s of arena.solids) {
            if (this.boxesIntersect(this, s)) {
                if (this.x < s.x) this.vx = -120;
                else this.vx = 120;
                if (this.y < s.y) this.vy = -120;
                else this.vy = 120;
            }
        }

        if (this.boxesIntersect(this, player)) {
            player.takeDamage(this.contactDamage);
        }
    }

    draw(ctx) {
        ctx.save();
        const time = Date.now() * 0.01;
        const bob = Math.sin(time) * 3;

        ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + bob);

        if (this.hitFlashTimer > 0) {
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = '#00f0ff';
        }

        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;

        // Triangular aerial shape
        ctx.beginPath();
        ctx.moveTo(this.facing * 18, 0);
        ctx.lineTo(-this.facing * 14, -14);
        ctx.lineTo(-this.facing * 8, 0);
        ctx.lineTo(-this.facing * 14, 14);
        ctx.closePath();
        ctx.fill();

        // Pulsing thruster
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.fillRect(-this.facing * 16, -3, 6, 6);

        ctx.restore();
        this.drawHealthBar(ctx);
    }
}

// 3. RAILGUNNER (Ranged Sniper)
class RailgunnerEnemy extends BaseEnemy {
    constructor(x, y) {
        super(x, y, 32, 46, 55, 120);
        this.shootTimer = 2.2;
        this.chargeTimer = 0;
        this.aimX = 0;
        this.aimY = 0;
        this.contactDamage = 12;
    }

    update(dt, player, arena, projectiles) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height * 0.4;
        this.facing = Math.sign(targetX - cx) || 1;

        // Maintain distance
        const dist = Math.hypot(targetX - cx, targetY - cy);
        if (dist < 320) {
            this.vx += (-this.facing * this.speed - this.vx) * 0.08;
        } else if (dist > 650) {
            this.vx += (this.facing * this.speed - this.vx) * 0.08;
        } else {
            this.vx *= 0.9;
        }

        this.applyGravity(dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.resolveSolids(arena);

        // Shooting cycle
        this.shootTimer -= dt;
        if (this.shootTimer <= 0.9 && this.shootTimer > 0) {
            // Charging laser sight
            this.chargeTimer += dt;
            this.aimX = targetX;
            this.aimY = targetY;
            if (this.shootTimer >= 0.88 && window.soundEngine) {
                window.soundEngine.playLaserCharge();
            }
        }

        if (this.shootTimer <= 0) {
            // FIRE!
            this.shootTimer = 2.4;
            this.chargeTimer = 0;
            const angle = Math.atan2(this.aimY - cy, this.aimX - cx);
            const projSpeed = 750;
            projectiles.push(new Projectile(cx, cy, Math.cos(angle) * projSpeed, Math.sin(angle) * projSpeed, 22, 6, '#ff0055'));

            if (window.soundEngine) window.soundEngine.playLaserShoot();
            if (window.particles) {
                window.particles.createSparks(cx, cy, 10, '#ff0055', 120, 320);
            }
        }

        if (this.boxesIntersect(this, player)) {
            player.takeDamage(this.contactDamage);
        }
    }

    draw(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height * 0.4;

        // Draw telegraph laser line when charging
        if (this.shootTimer <= 0.9 && this.shootTimer > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([8, 4]);
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(this.aimX, this.aimY);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#9900ff';
        ctx.strokeStyle = '#bf40bf';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#9900ff';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 4);
        ctx.fill();
        ctx.stroke();

        // Railgun barrel
        ctx.fillStyle = '#00f0ff';
        const barrelX = this.facing > 0 ? this.x + this.width : this.x - 14;
        ctx.fillRect(barrelX, cy - 3, 14, 6);

        this.drawHealthBar(ctx);
        ctx.restore();
    }
}

// 4. SHADOW BLADE (Fast Dasher)
class FastBladeEnemy extends BaseEnemy {
    constructor(x, y) {
        super(x, y, 30, 44, 75, 340);
        this.dashCooldown = 2.0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.contactDamage = 24;
    }

    update(dt, player, arena) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;

        const targetX = player.x + player.width / 2;
        const cx = this.x + this.width / 2;
        this.facing = Math.sign(targetX - cx) || 1;

        if (this.isDashing) {
            this.dashTimer -= dt;
            if (Math.random() < 0.6 && window.particles) {
                window.particles.addGhostTrail(this.x, this.y, this.width, this.height, '#ff0055', this.facing);
            }
            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.vx *= 0.3;
            }
        } else {
            this.vx += (this.facing * this.speed - this.vx) * 0.15;

            // Trigger lunge dash when in range
            const dist = Math.hypot(targetX - cx, (player.y + player.height / 2) - (this.y + this.height / 2));
            if (dist < 260 && this.dashCooldown <= 0) {
                this.isDashing = true;
                this.dashTimer = 0.22;
                this.dashCooldown = 2.4;
                this.vx = this.facing * 850;
                if (window.soundEngine) window.soundEngine.playDash();
            }
        }

        this.applyGravity(dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.resolveSolids(arena);

        if (this.boxesIntersect(this, player)) {
            player.takeDamage(this.contactDamage);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#00ffff';
        ctx.strokeStyle = '#00bfff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        ctx.stroke();

        // Sleek cyber visor
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(this.facing > 0 ? this.x + this.width - 10 : this.x + 2, this.y + 10, 8, 5);

        this.drawHealthBar(ctx);
        ctx.restore();
    }
}

// 5. GOLIATH JUGGERNAUT (Heavy Tank with Shockwaves)
class GoliathEnemy extends BaseEnemy {
    constructor(x, y) {
        super(x, y, 54, 68, 260, 110);
        this.slamCooldown = 3.5;
        this.isChargingSlam = false;
        this.chargeTimer = 0;
        this.contactDamage = 35;
        this.knockbackResistance = 0.75;
        this.shardReward = 3;
    }

    update(dt, player, arena) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.slamCooldown > 0) this.slamCooldown -= dt;

        const targetX = player.x + player.width / 2;
        const cx = this.x + this.width / 2;
        this.facing = Math.sign(targetX - cx) || 1;

        if (this.isChargingSlam) {
            this.chargeTimer += dt;
            this.vx = 0;
            if (this.chargeTimer >= 0.8) {
                // SLAM!
                this.isChargingSlam = false;
                this.slamCooldown = 4.0;
                this.chargeTimer = 0;
                if (window.soundEngine) window.soundEngine.playDiveSlam();
                if (window.camera) window.camera.addTrauma(0.5);
                if (window.particles) {
                    window.particles.createShockwave(cx, this.y + this.height, 160, '#ff0055', 0.45, 8);
                    window.particles.createSparks(cx, this.y + this.height, 26, '#ff0055', 150, 480);
                }

                // Shockwave hits player if on ground nearby
                const pDist = Math.abs((player.x + player.width / 2) - cx);
                if (pDist < 170 && player.isGrounded) {
                    player.takeDamage(28);
                    player.vy = -450;
                }
            }
        } else {
            this.vx += (this.facing * this.speed - this.vx) * 0.08;
            const dist = Math.abs(targetX - cx);
            if (dist < 140 && this.isGrounded && this.slamCooldown <= 0) {
                this.isChargingSlam = true;
                this.chargeTimer = 0;
            }
        }

        this.applyGravity(dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.resolveSolids(arena);

        if (this.boxesIntersect(this, player)) {
            player.takeDamage(this.contactDamage);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : '#334466';
        ctx.strokeStyle = this.isChargingSlam ? '#ff0055' : '#00f0ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = this.isChargingSlam ? 16 : 8;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();

        // Heavy armor plates
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(this.x + 8, this.y + 12, this.width - 16, 6);
        ctx.fillRect(this.x + 8, this.y + 30, this.width - 16, 6);

        this.drawHealthBar(ctx);
        ctx.restore();
    }
}

// 6. VOLATILE BOT (Explosive Kamikaze)
class VolatileEnemy extends BaseEnemy {
    constructor(x, y) {
        super(x, y, 28, 30, 40, 290);
        this.fuseTimer = 1.4;
        this.isTicking = false;
        this.contactDamage = 45;
        this.shardReward = 1;
    }

    update(dt, player, arena) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const dist = Math.hypot(targetX - cx, targetY - cy);

        this.facing = Math.sign(targetX - cx) || 1;
        this.vx += (this.facing * this.speed - this.vx) * 0.12;

        if (dist < 120 && !this.isTicking) {
            this.isTicking = true;
        }

        if (this.isTicking) {
            this.fuseTimer -= dt;
            if (this.fuseTimer <= 0) {
                // Detonate!
                this.detonate(player);
                return;
            }
        }

        this.applyGravity(dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.resolveSolids(arena);

        if (this.boxesIntersect(this, player)) {
            this.detonate(player);
        }
    }

    detonate(player) {
        if (this.isDead) return;
        this.isDead = true;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const blastRadius = 140;

        if (window.soundEngine) window.soundEngine.playExplosion();
        if (window.camera) window.camera.addTrauma(0.6);
        if (window.particles) {
            window.particles.createShockwave(cx, cy, blastRadius, '#ff3300', 0.45, 8);
            window.particles.createSparks(cx, cy, 35, '#ff3300', 160, 520);
        }

        // Damage player if in blast radius
        const pDist = Math.hypot((player.x + player.width / 2) - cx, (player.y + player.height / 2) - cy);
        if (pDist <= blastRadius) {
            player.takeDamage(this.contactDamage);
        }

        // Also damage nearby enemies
        if (window.gameInstance && window.gameInstance.enemies) {
            for (const other of window.gameInstance.enemies) {
                if (other !== this && !other.isDead) {
                    const eDist = Math.hypot((other.x + other.width / 2) - cx, (other.y + other.height / 2) - cy);
                    if (eDist <= blastRadius) {
                        other.takeDamage(60, Math.sign(other.x - cx) * 500, -300);
                    }
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const pulse = this.isTicking ? Math.sin(Date.now() * 0.03) > 0 : false;
        ctx.fillStyle = pulse ? '#ffffff' : '#ff2200';
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = this.isTicking ? 18 : 8;

        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        this.drawHealthBar(ctx);
        ctx.restore();
    }
}

// 7. WAVE 10 BOSS: "OVERLOAD V-1: APEX ENFORCER"
class ApexBoss extends BaseEnemy {
    constructor(x, y) {
        super(x, y, 76, 96, 1500, 240);
        this.name = 'APEX ENFORCER V-1';
        this.contactDamage = 30;
        this.knockbackResistance = 0.95;
        this.shardReward = 30;

        // Boss Attack States: 'IDLE', 'MISSILE_SALVO', 'LASER_SWEEP', 'APEX_SLAM'
        this.state = 'IDLE';
        this.stateTimer = 2.0;
        this.phase = 1; // Phase 1, Phase 2 (< 60% HP), Phase 3 Enraged (< 30% HP)
        this.laserAngle = 0;
        this.laserDuration = 0;
    }

    update(dt, player, arena, projectiles) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

        // Phase Check
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.3) {
            this.phase = 3; // Enraged Overclock
            this.speed = 320;
        } else if (hpPercent <= 0.6) {
            this.phase = 2;
            this.speed = 280;
        }

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        this.facing = Math.sign(targetX - cx) || 1;

        this.stateTimer -= dt;

        if (this.state === 'IDLE') {
            // Reposition towards player
            this.vx += (this.facing * this.speed - this.vx) * 0.08;
            this.applyGravity(dt);

            if (this.stateTimer <= 0) {
                // Select attack based on phase
                const attacks = ['MISSILE_SALVO', 'APEX_SLAM'];
                if (this.phase >= 2) attacks.push('LASER_SWEEP');
                const nextAttack = attacks[Math.floor(Math.random() * attacks.length)];
                this.startAttack(nextAttack, player);
            }
        } else if (this.state === 'MISSILE_SALVO') {
            this.vx *= 0.85;
            this.applyGravity(dt);

            // Fire 4-6 homing plasma missiles
            if (this.salvoCount > 0 && this.salvoIntervalTimer <= 0) {
                this.salvoCount--;
                this.salvoIntervalTimer = 0.22;
                const missileAngle = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.2;
                const missile = new Projectile(cx, cy - 20, Math.cos(missileAngle) * 450, Math.sin(missileAngle) * 450, 18, 8, '#00f0ff', true);
                projectiles.push(missile);
                if (window.soundEngine) window.soundEngine.playLaserShoot();
            } else if (this.salvoIntervalTimer > 0) {
                this.salvoIntervalTimer -= dt;
            }

            if (this.stateTimer <= 0) {
                this.state = 'IDLE';
                this.stateTimer = 1.4;
            }
        } else if (this.state === 'APEX_SLAM') {
            if (this.slamStage === 'LEAP') {
                if (this.vy >= 0) {
                    // Reached zenith, slam down toward player X
                    this.slamStage = 'FALL';
                    this.vy = 1400;
                    this.vx = (targetX - cx) * 1.5;
                }
            } else if (this.slamStage === 'FALL') {
                this.vy = 1400;
                if (this.isGrounded) {
                    // IMPACT!
                    this.slamStage = 'RECOVER';
                    this.stateTimer = 0.8;
                    if (window.soundEngine) window.soundEngine.playDiveSlam();
                    if (window.camera) window.camera.addTrauma(0.8);
                    if (window.particles) {
                        window.particles.createShockwave(cx, this.y + this.height, 240, '#ff0055', 0.5, 10);
                        window.particles.createSparks(cx, this.y + this.height, 40, '#ff0055', 200, 600);
                    }
                    // Damage player if in range
                    const dist = Math.hypot(targetX - cx, (player.y + player.height) - (this.y + this.height));
                    if (dist < 220) {
                        player.takeDamage(35);
                    }
                }
            } else if (this.slamStage === 'RECOVER') {
                this.vx = 0;
                if (this.stateTimer <= 0) {
                    this.state = 'IDLE';
                    this.stateTimer = 1.6;
                }
            }
        } else if (this.state === 'LASER_SWEEP') {
            this.vx *= 0.5;
            this.applyGravity(dt);

            // Sweeping gigantic arena laser beam
            this.laserAngle += (this.laserSweepDir * 1.8) * dt;

            // Check if player collides with laser beam line
            const laserLen = 1400;
            const lx2 = cx + Math.cos(this.laserAngle) * laserLen;
            const ly2 = cy + Math.sin(this.laserAngle) * laserLen;

            // Simple distance point to line segment
            const pDist = this.distToSegment(player.x + player.width / 2, player.y + player.height / 2, cx, cy, lx2, ly2);
            if (pDist < 22) {
                player.takeDamage(26);
            }

            if (this.stateTimer <= 0) {
                this.state = 'IDLE';
                this.stateTimer = 1.8;
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.resolveSolids(arena);

        if (this.boxesIntersect(this, player)) {
            player.takeDamage(this.contactDamage);
        }
    }

    startAttack(attackName, player) {
        this.state = attackName;
        const cx = this.x + this.width / 2;

        if (attackName === 'MISSILE_SALVO') {
            this.salvoCount = this.phase === 3 ? 8 : 5;
            this.salvoIntervalTimer = 0;
            this.stateTimer = 2.0;
            if (window.soundEngine) window.soundEngine.playLaserCharge();
        } else if (attackName === 'APEX_SLAM') {
            this.slamStage = 'LEAP';
            this.vy = -850;
            this.vx = (player.x - cx) * 0.8;
            this.stateTimer = 2.5;
            if (window.soundEngine) window.soundEngine.playJump();
        } else if (attackName === 'LASER_SWEEP') {
            this.laserSweepDir = this.facing;
            this.laserAngle = this.facing > 0 ? -Math.PI * 0.4 : -Math.PI * 0.6;
            this.stateTimer = 2.4;
            if (window.soundEngine) window.soundEngine.playBossRoar();
        }
    }

    distToSegment(px, py, x1, y1, x2, y2) {
        const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    draw(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // Draw Laser Sweep Beam
        if (this.state === 'LASER_SWEEP') {
            ctx.save();
            const laserLen = 1400;
            const lx2 = cx + Math.cos(this.laserAngle) * laserLen;
            const ly2 = cy + Math.sin(this.laserAngle) * laserLen;

            ctx.strokeStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 24;
            ctx.lineWidth = 16;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(lx2, ly2);
            ctx.stroke();

            // Inner white laser core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = this.hitFlashTimer > 0 ? '#ffffff' : (this.phase === 3 ? '#ff0055' : '#1a1f38');
        ctx.strokeStyle = this.phase === 3 ? '#ff3300' : '#00f0ff';
        ctx.lineWidth = 4;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 12);
        ctx.fill();
        ctx.stroke();

        // Cyber Boss Core
        ctx.fillStyle = this.phase === 3 ? '#ffff00' : '#ff0055';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 14, 0, Math.PI * 2);
        ctx.fill();

        // Shoulder cannons
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(this.x - 10, this.y + 10, 10, 24);
        ctx.fillRect(this.x + this.width, this.y + 10, 10, 24);

        ctx.restore();
    }
}

window.CrawlerEnemy = CrawlerEnemy;
window.DroneEnemy = DroneEnemy;
window.RailgunnerEnemy = RailgunnerEnemy;
window.FastBladeEnemy = FastBladeEnemy;
window.GoliathEnemy = GoliathEnemy;
window.VolatileEnemy = VolatileEnemy;
window.ApexBoss = ApexBoss;
window.Projectile = Projectile;
