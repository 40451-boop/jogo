// Player Character with deep, responsive mobility, aerial combos, wall kicks, and combat integration
class Player {
    constructor(x = 900, y = 1000) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 46;

        // Velocity & Physics
        this.vx = 0;
        this.vy = 0;
        this.facing = 1; // 1 = right, -1 = left

        // Base Movement Stats
        this.baseRunSpeed = 440;
        this.accelGround = 3400;
        this.accelAir = 2400;
        this.frictionGround = 3200;
        this.dragAir = 800;

        this.jumpForce = -720;
        this.gravity = 1950;
        this.terminalVelocity = 980;
        this.fastFallVelocity = 1450;

        // Wall Interaction
        this.wallSlideMaxSpeed = 160;
        this.wallJumpForceX = 540;
        this.wallJumpForceY = -680;
        this.wallLockTimer = 0; // Prevent fighting the kick off wall for 0.12s
        this.isWallSliding = false;
        this.wallDir = 0; // -1 if left wall, 1 if right wall

        // Coyote Time & Jump Buffers
        this.coyoteTimer = 0;
        this.COYOTE_DURATION = 0.13;
        this.remainingJumps = 1;
        this.maxJumps = 1; // 1 = double jump enabled

        // Dash Mechanics
        this.dashSpeed = 1150;
        this.dashDuration = 0.16;
        this.dashCooldownTime = 0.85;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashDirX = 1;
        this.dashDirY = 0;
        this.maxDashCharges = 1;
        this.dashCharges = 1;
        this.dashRechargeProgress = 0;

        // Fast Fall & Seismic Dive Slam
        this.isFastFalling = false;
        this.isDiveSlamming = false;

        // Combat & Attacks
        this.comboIndex = 0;
        this.comboResetTimer = 0;
        this.attackTimer = 0;
        this.attackDuration = 0.18;
        this.hitbox = null; // Active attack hitbox
        this.hitEnemiesThisSwing = new Set();

        // Hitstop & Invulnerability
        this.invulnerableTimer = 0;
        this.invulnerableFlash = 0;

        // Health & Stats
        this.baseMaxHp = 100;
        this.maxHp = 100;
        this.hp = 100;
        this.isDead = false;

        // Roguelike Build Multipliers & Perks
        this.moveSpeedMult = 1.0;
        this.damageMult = 1.0;
        this.attackSpeedMult = 1.0;
        this.critChance = 0.12;
        this.critMult = 2.0;
        this.knockbackMult = 1.0;
        this.aerialDamageBonus = 0;
        this.diveSlamRadiusMult = 1.0;

        // Perk Toggles
        this.phaseDashDamage = 0; // If > 0, dashing deals damage
        this.dashResetsOnKill = false;
        this.skyAcrobat = false; // Wall jump resets air dash
        this.chainLightning = false;
        this.lifestealOnKill = 0;
        this.hasAegisShield = false;
        this.aegisShieldReady = false;
        this.aegisCooldownTimer = 0;
        this.secondWindAvailable = false;
        this.executionerMark = false;

        // Ground detection helper
        this.isGrounded = false;
        this.droppingThroughPlatform = false;
    }

    applyMetaUpgrades(meta) {
        if (!meta) return;
        this.maxHp = this.baseMaxHp + (meta.resilienceLevel * 15);
        this.hp = this.maxHp;
        this.damageMult = 1.0 + (meta.sharpnessLevel * 0.08);
        this.dashCooldownTime = Math.max(0.45, 0.85 - (meta.overdriveLevel * 0.08));
        this.critChance = 0.12 + (meta.critLevel * 0.04);
    }

    takeDamage(amount) {
        if (this.isDead || this.dashTimer > 0 || this.invulnerableTimer > 0) {
            return false;
        }

        // Check Aegis Shield
        if (this.hasAegisShield && this.aegisShieldReady) {
            this.aegisShieldReady = false;
            this.aegisCooldownTimer = 14.0;
            this.invulnerableTimer = 0.8;
            if (window.soundEngine) window.soundEngine.playHitImpact(true);
            if (window.particles) {
                window.particles.createShockwave(this.x + this.width / 2, this.y + this.height / 2, 80, '#00f0ff', 0.35, 6);
                window.particles.addDamageText(this.x + this.width / 2, this.y, 'AEGIS SHIELD!', false, false, '#00f0ff');
            }
            return false;
        }

        this.hp -= amount;
        this.invulnerableTimer = 0.75; // 0.75s iframes

        if (window.soundEngine) window.soundEngine.playHitImpact(false);
        if (window.camera) {
            window.camera.addTrauma(0.45);
            window.camera.triggerHitstop(0.06);
        }
        if (window.particles) {
            window.particles.createSparks(this.x + this.width / 2, this.y + this.height / 2, 20, '#ff0055', 120, 380);
            window.particles.addDamageText(this.x + this.width / 2, this.y, `-${Math.round(amount)}`, true, false, '#ff0055');
        }

        if (this.hp <= 0) {
            if (this.secondWindAvailable) {
                this.secondWindAvailable = false;
                this.hp = Math.round(this.maxHp * 0.5);
                this.invulnerableTimer = 2.0;
                if (window.soundEngine) window.soundEngine.playBossRoar();
                if (window.particles) {
                    window.particles.createShockwave(this.x + this.width / 2, this.y + this.height / 2, 180, '#39ff14', 0.6, 8);
                    window.particles.addDamageText(this.x + this.width / 2, this.y, 'SECOND WIND ACTIVATED!', false, true);
                }
                return false;
            }
            this.hp = 0;
            this.isDead = true;
            if (window.soundEngine) window.soundEngine.playEnemyDeath();
        }
        return true;
    }

    heal(amount) {
        if (this.isDead) return;
        const actual = Math.min(this.maxHp - this.hp, amount);
        if (actual > 0) {
            this.hp += actual;
            if (window.particles) {
                window.particles.addDamageText(this.x + this.width / 2, this.y - 15, `+${Math.round(actual)} HP`, false, true);
                window.particles.createSparks(this.x + this.width / 2, this.y + this.height / 2, 10, '#39ff14', 60, 180);
            }
        }
    }

    update(dt, arena, input) {
        if (this.isDead) return;

        // Timers tick
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
        if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
        if (this.wallLockTimer > 0) this.wallLockTimer -= dt;
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
                this.hitbox = null;
            }
        }
        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= dt;
            if (this.comboResetTimer <= 0) {
                this.comboIndex = 0;
            }
        }

        // Aegis shield recharge
        if (this.hasAegisShield && !this.aegisShieldReady) {
            this.aegisCooldownTimer -= dt;
            if (this.aegisCooldownTimer <= 0) {
                this.aegisShieldReady = true;
                if (window.particles) {
                    window.particles.addDamageText(this.x + this.width / 2, this.y - 20, 'AEGIS READY', false, false, '#00f0ff');
                }
            }
        }

        // Dash recharge logic
        if (this.dashCharges < this.maxDashCharges) {
            this.dashRechargeProgress += dt / this.dashCooldownTime;
            if (this.dashRechargeProgress >= 1.0) {
                this.dashCharges++;
                this.dashRechargeProgress = 0;
            }
        }

        // Input readings
        const moveAxis = input.getHorizontalAxis();
        if (moveAxis !== 0 && this.wallLockTimer <= 0) {
            this.facing = moveAxis;
        }

        const wantsJump = input.consumeBuffer('jump') || input.justPressed('jump');
        const wantsDash = input.consumeBuffer('dash') || input.justPressed('dash');
        const wantsAttack = input.consumeBuffer('attack') || input.justPressed('attack');
        const wantsFastFall = input.isDown('down');

        // Check platform drop-through (Down + Jump)
        if (wantsFastFall && wantsJump && this.isGrounded) {
            this.droppingThroughPlatform = true;
            this.y += 6;
            this.vy = 200;
        } else {
            this.droppingThroughPlatform = false;
        }

        // --- DASH HANDLING ---
        if (wantsDash && this.dashCharges > 0 && this.dashTimer <= 0) {
            this.startDash(moveAxis, wantsFastFall ? 1 : 0);
        }

        if (this.dashTimer > 0) {
            this.updateDash(dt, arena);
            // Can cancel dash into an attack!
            if (wantsAttack) {
                this.executeAttack('dash');
            }
            return; // Dash overrides normal gravity/movement
        }

        // --- ATTACK HANDLING ---
        if (wantsAttack && this.attackTimer <= 0) {
            if (this.isDiveSlamming) {
                // Already dive-slamming
            } else if (!this.isGrounded && wantsFastFall) {
                this.startDiveSlam();
            } else if (!this.isGrounded) {
                this.executeAttack('aerial');
            } else {
                this.executeAttack('ground');
            }
        }

        // --- FAST FALL & DIVE SLAM UPDATE ---
        if (!this.isGrounded && wantsFastFall && !this.isWallSliding) {
            this.isFastFalling = true;
            if (this.vy < this.fastFallVelocity) {
                this.vy += 3200 * dt;
            }
        } else if (this.isGrounded) {
            this.isFastFalling = false;
        }

        // --- HORIZONTAL MOVEMENT ---
        if (this.wallLockTimer <= 0) {
            const currentMaxSpeed = this.baseRunSpeed * this.moveSpeedMult;
            const targetSpeed = moveAxis * currentMaxSpeed;
            const accel = this.isGrounded ? this.accelGround : this.accelAir;
            const friction = this.isGrounded ? this.frictionGround : this.dragAir;

            if (moveAxis !== 0) {
                if (Math.sign(this.vx) !== 0 && Math.sign(this.vx) !== moveAxis) {
                    // Quick turnaround
                    this.vx += moveAxis * accel * 1.5 * dt;
                } else {
                    this.vx += moveAxis * accel * dt;
                    if (Math.abs(this.vx) > currentMaxSpeed) {
                        this.vx = Math.sign(this.vx) * currentMaxSpeed;
                    }
                }
            } else {
                // Apply friction / drag
                if (Math.abs(this.vx) > friction * dt) {
                    this.vx -= Math.sign(this.vx) * friction * dt;
                } else {
                    this.vx = 0;
                }
            }
        }

        // --- JUMP & WALL JUMP ---
        if (wantsJump && !this.droppingThroughPlatform) {
            if (this.isWallSliding) {
                // WALL JUMP! Kick diagonally away from wall
                this.vx = -this.wallDir * this.wallJumpForceX;
                this.vy = this.wallJumpForceY;
                this.facing = -this.wallDir;
                this.wallLockTimer = 0.12; // brief horizontal lock for clean kick
                this.isWallSliding = false;
                this.isGrounded = false;
                this.coyoteTimer = 0;

                if (this.skyAcrobat && this.dashCharges < this.maxDashCharges) {
                    this.dashCharges = Math.min(this.maxDashCharges, this.dashCharges + 1);
                }

                if (window.soundEngine) window.soundEngine.playWallJump();
                if (window.particles) {
                    const kickX = this.wallDir === -1 ? this.x : this.x + this.width;
                    window.particles.createSparks(kickX, this.y + this.height * 0.5, 14, '#00f0ff', 140, 360);
                }
            } else if (this.isGrounded || this.coyoteTimer > 0) {
                // GROUND JUMP
                this.vy = this.jumpForce;
                this.isGrounded = false;
                this.coyoteTimer = 0;
                if (window.soundEngine) window.soundEngine.playJump();
                if (window.particles) {
                    window.particles.createSparks(this.x + this.width / 2, this.y + this.height, 8, '#ffffff', 60, 200);
                }
            } else if (this.remainingJumps > 0) {
                // DOUBLE JUMP / AERIAL JUMP
                this.vy = this.jumpForce * 0.95;
                this.remainingJumps--;
                if (window.soundEngine) window.soundEngine.playDoubleJump();
                if (window.particles) {
                    window.particles.createShockwave(this.x + this.width / 2, this.y + this.height, 45, '#00f0ff', 0.22, 3);
                    window.particles.createSparks(this.x + this.width / 2, this.y + this.height, 12, '#00f0ff', 100, 300);
                }
            }
        }

        // Variable Jump Height: cut upward velocity if jump key released early
        if (!input.isDown('jump') && this.vy < -150) {
            this.vy *= 0.55;
        }

        // --- WALL SLIDE CHECK ---
        const touchingWall = this.checkWallCollision(arena);
        if (touchingWall !== 0 && !this.isGrounded && this.vy > 0 && (moveAxis === touchingWall || moveAxis === 0)) {
            this.isWallSliding = true;
            this.wallDir = touchingWall;
            this.vy = Math.min(this.vy, this.wallSlideMaxSpeed);

            // Wall slide friction sparks
            if (Math.random() < 0.35 && window.particles) {
                const sparkX = touchingWall === -1 ? this.x : this.x + this.width;
                window.particles.createSparks(sparkX, this.y + this.height * 0.8, 2, '#00f0ff', 40, 140);
            }
        } else {
            this.isWallSliding = false;
        }

        // --- GRAVITY & TERMINAL VELOCITY ---
        if (!this.isWallSliding) {
            this.vy += this.gravity * dt;
            const maxFall = this.isFastFalling ? this.fastFallVelocity : this.terminalVelocity;
            if (this.vy > maxFall) this.vy = maxFall;
        }

        // --- MOVE & RESOLVE COLLISIONS ---
        this.moveAndCollide(dt, arena);

        // Check Jump Pads
        arena.checkJumpPads(this);

        // Update active attack hitbox position to follow player
        if (this.hitbox) {
            this.updateHitboxPosition();
        }
    }

    startDash(axisX, axisY) {
        this.dashCharges--;
        this.dashTimer = this.dashDuration;
        this.invulnerableTimer = this.dashDuration + 0.05; // Invulnerable during dash

        // Dash direction defaults to facing horizontal
        this.dashDirX = axisX !== 0 ? axisX : this.facing;
        this.dashDirY = (axisY > 0 && !this.isGrounded) ? 0.6 : 0;

        // Normalize
        const len = Math.hypot(this.dashDirX, this.dashDirY) || 1;
        this.dashDirX /= len;
        this.dashDirY /= len;

        this.vx = this.dashDirX * this.dashSpeed;
        this.vy = this.dashDirY * this.dashSpeed;

        if (window.soundEngine) window.soundEngine.playDash();
        if (window.camera) window.camera.addTrauma(0.18);
        if (window.particles) {
            window.particles.createShockwave(this.x + this.width / 2, this.y + this.height / 2, 60, '#00f0ff', 0.25, 4);
            window.particles.addGhostTrail(this.x, this.y, this.width, this.height, '#00f0ff', this.facing, !this.isGrounded);
        }
    }

    updateDash(dt, arena) {
        this.dashTimer -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Clamp to arena solids
        this.resolveSolidsOnly(arena);

        // Spawn afterimage ghost trail
        if (Math.random() < 0.7 && window.particles) {
            window.particles.addGhostTrail(this.x, this.y, this.width, this.height, '#00f0ff', this.facing, !this.isGrounded);
        }

        // Phase Dash Damage
        if (this.phaseDashDamage > 0) {
            this.hitbox = {
                x: this.x - 10,
                y: this.y - 10,
                width: this.width + 20,
                height: this.height + 20,
                damage: this.phaseDashDamage * this.damageMult,
                knockback: 400,
                isDash: true
            };
        }

        if (this.dashTimer <= 0) {
            this.hitbox = null;
            this.vx *= 0.45; // Smooth exit from dash
            this.vy *= 0.45;
        }
    }

    startDiveSlam() {
        this.isDiveSlamming = true;
        this.vy = 1600;
        this.vx = 0;
        if (window.soundEngine) window.soundEngine.playDash();
        if (window.particles) {
            window.particles.addGhostTrail(this.x, this.y, this.width, this.height, '#ff0055', this.facing, true);
        }
    }

    executeAttack(type) {
        this.attackTimer = this.attackDuration / this.attackSpeedMult;
        this.comboResetTimer = 0.55;
        this.hitEnemiesThisSwing.clear();

        let baseDmg = 35;
        let kb = 450;
        let arcRadius = 65;

        if (type === 'ground') {
            this.comboIndex = (this.comboIndex + 1) % 3;
            baseDmg = 35 + this.comboIndex * 15;
            kb = 400 + this.comboIndex * 200;
            // Slight forward lunge
            this.vx += this.facing * 140;
        } else if (type === 'aerial') {
            baseDmg = 42 * (1.0 + this.aerialDamageBonus);
            kb = 350;
            arcRadius = 75;
            // Float mid-air briefly
            this.vy = Math.min(this.vy * 0.2, -60);
        } else if (type === 'dash') {
            baseDmg = 55;
            kb = 600;
            arcRadius = 80;
        }

        const dmg = baseDmg * this.damageMult;

        this.hitbox = {
            type,
            combo: this.comboIndex,
            damage: dmg,
            knockback: kb * this.knockbackMult,
            width: arcRadius * 1.4,
            height: arcRadius * 1.3,
            radius: arcRadius,
            isAir: !this.isGrounded
        };
        this.updateHitboxPosition();

        if (window.soundEngine) window.soundEngine.playSlash(this.comboIndex);

        // Visual Slash Arc
        if (window.particles) {
            const hx = this.facing > 0 ? this.x + this.width + 10 : this.x - 10;
            const hy = this.y + this.height * 0.45;
            const startAng = this.facing > 0 ? -Math.PI * 0.45 : Math.PI * 0.55;
            const endAng = this.facing > 0 ? Math.PI * 0.45 : Math.PI * 1.45;
            const slashColor = this.comboIndex === 2 ? '#ff0055' : '#00f0ff';
            window.particles.addSlashArc(hx, hy, arcRadius, startAng, endAng, slashColor, this.facing);
            window.particles.createSparks(hx, hy, 8, slashColor, 120, 320);
        }
    }

    updateHitboxPosition() {
        if (!this.hitbox) return;
        const hb = this.hitbox;
        if (hb.isDash) return;

        if (this.facing > 0) {
            hb.x = this.x + this.width * 0.4;
        } else {
            hb.x = this.x - hb.width + this.width * 0.6;
        }
        hb.y = this.y + (this.height - hb.height) * 0.5;
    }

    checkWallCollision(arena) {
        const testDistance = 4;
        // Check Left Wall
        const leftBox = { x: this.x - testDistance, y: this.y + 4, width: testDistance, height: this.height - 8 };
        for (const s of arena.solids) {
            if (this.boxesIntersect(leftBox, s)) return -1;
        }
        // Check Right Wall
        const rightBox = { x: this.x + this.width, y: this.y + 4, width: testDistance, height: this.height - 8 };
        for (const s of arena.solids) {
            if (this.boxesIntersect(rightBox, s)) return 1;
        }
        return 0;
    }

    moveAndCollide(dt, arena) {
        // --- HORIZONTAL MOVEMENT ---
        this.x += this.vx * dt;
        for (const solid of arena.solids) {
            if (this.boxesIntersect(this, solid)) {
                if (this.vx > 0) {
                    this.x = solid.x - this.width;
                    this.vx = 0;
                } else if (this.vx < 0) {
                    this.x = solid.x + solid.width;
                    this.vx = 0;
                }
            }
        }

        // --- VERTICAL MOVEMENT ---
        const prevY = this.y;
        this.y += this.vy * dt;
        let landed = false;

        // Check Solids (Floor, Ceilings, Pillars)
        for (const solid of arena.solids) {
            if (this.boxesIntersect(this, solid)) {
                if (this.vy > 0) {
                    // Hit floor
                    this.y = solid.y - this.height;
                    this.vy = 0;
                    landed = true;
                } else if (this.vy < 0) {
                    // Hit ceiling
                    this.y = solid.y + solid.height;
                    this.vy = 0;
                }
            }
        }

        // Check One-Way Platforms (Only collide when falling down and player feet were above ledge)
        if (!this.droppingThroughPlatform && this.vy >= 0) {
            const feetPrevY = prevY + this.height;
            const feetCurrY = this.y + this.height;

            for (const plat of arena.oneWayPlatforms) {
                if (
                    this.x + this.width > plat.x &&
                    this.x < plat.x + plat.width &&
                    feetPrevY <= plat.y + 4 &&
                    feetCurrY >= plat.y
                ) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    landed = true;
                    break;
                }
            }
        }

        // Ground state update
        if (landed) {
            if (!this.isGrounded) {
                // Just landed!
                this.remainingJumps = this.maxJumps;
                if (this.isDiveSlamming) {
                    this.triggerDiveSlamImpact();
                }
            }
            this.isGrounded = true;
            this.coyoteTimer = this.COYOTE_DURATION;
            this.isFastFalling = false;
        } else {
            this.isGrounded = false;
        }
    }

    resolveSolidsOnly(arena) {
        for (const solid of arena.solids) {
            if (this.boxesIntersect(this, solid)) {
                if (this.vx > 0) this.x = solid.x - this.width;
                else if (this.vx < 0) this.x = solid.x + solid.width;
                if (this.vy > 0) this.y = solid.y - this.height;
                else if (this.vy < 0) this.y = solid.y + solid.height;
            }
        }
    }

    triggerDiveSlamImpact() {
        this.isDiveSlamming = false;
        const radius = 180 * this.diveSlamRadiusMult;
        const dmg = 80 * this.damageMult;

        if (window.soundEngine) window.soundEngine.playDiveSlam();
        if (window.camera) window.camera.addTrauma(0.65);
        if (window.particles) {
            window.particles.createShockwave(this.x + this.width / 2, this.y + this.height, radius, '#ff0055', 0.45, 8);
            window.particles.createSparks(this.x + this.width / 2, this.y + this.height, 35, '#ff0055', 180, 520);
        }

        // Deal AOE damage to enemies via global hook in waveManager or main
        if (window.gameInstance && window.gameInstance.enemies) {
            for (const enemy of window.gameInstance.enemies) {
                const dist = Math.hypot((this.x + this.width / 2) - (enemy.x + enemy.width / 2), (this.y + this.height) - (enemy.y + enemy.height));
                if (dist <= radius) {
                    enemy.takeDamage(dmg, Math.sign(enemy.x - this.x) * 600, -450, false);
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

    draw(ctx) {
        ctx.save();

        // Invulnerability flash
        if (this.invulnerableTimer > 0) {
            this.invulnerableFlash += 0.2;
            if (Math.sin(this.invulnerableFlash * 15) > 0) {
                ctx.globalAlpha = 0.45;
            }
        }

        // Cyber Body Render
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        ctx.translate(cx, cy);

        // Tilt body slightly based on horizontal speed
        const tilt = (this.vx / 800) * 0.18;
        ctx.rotate(tilt);

        // Flip horizontally based on facing
        if (this.facing < 0) {
            ctx.scale(-1, 1);
        }

        const hw = this.width / 2;
        const hh = this.height / 2;

        // Aegis shield aura bubble
        if (this.hasAegisShield && this.aegisShieldReady) {
            ctx.save();
            ctx.strokeStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Torso / Suit
        ctx.fillStyle = '#121422';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.roundRect(-hw, -hh, this.width, this.height, 6);
        ctx.fill();
        ctx.stroke();

        // Cyber Visor / Eye glow
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 12;
        ctx.fillRect(hw - 14, -hh + 10, 12, 6);

        // Core energy chest plate
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Katana / Energy Blade Holster or Strike
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        if (this.attackTimer > 0) {
            // Extended blade in attack pose
            ctx.fillRect(hw - 2, -6, 28, 4);
        } else {
            // Sheathed energy edge on back
            ctx.fillRect(-hw - 4, -hh + 6, 4, 30);
        }

        ctx.restore();
    }
}

window.Player = Player;
