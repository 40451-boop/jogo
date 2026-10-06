// Arena Layout, Platforms, Jump Pads, and Cyberpunk Aesthetics
class Arena {
    constructor() {
        this.width = 1920;
        this.height = 1200;

        // Solid walls/floors that block from all sides
        this.solids = [];

        // One-way platforms (can jump up through, press Down+Jump to drop down)
        this.oneWayPlatforms = [];

        // Kinetic Jump Pads
        this.jumpPads = [];

        // Enemy spawn points (categorized: ground, air, side)
        this.spawnPoints = {
            ground: [],
            air: [],
            side: []
        };

        this.initLayout();
    }

    initLayout() {
        const W = this.width;
        const H = this.height;
        const wallThick = 60;
        const floorThick = 80;

        // 1. BOUNDARIES (Solid)
        // Left Wall
        this.solids.push({ x: 0, y: 0, width: wallThick, height: H, type: 'wall' });
        // Right Wall
        this.solids.push({ x: W - wallThick, y: 0, width: wallThick, height: H, type: 'wall' });
        // Ceiling
        this.solids.push({ x: 0, y: 0, width: W, height: 40, type: 'ceiling' });
        // Main Floor
        this.solids.push({ x: 0, y: H - floorThick, width: W, height: floorThick, type: 'floor' });

        // 2. VERTICAL SOLID PILLARS (Prime targets for wall sliding and wall jumping)
        // Left mid pillar
        this.solids.push({ x: 420, y: 380, width: 44, height: 460, type: 'pillar' });
        // Right mid pillar
        this.solids.push({ x: 1456, y: 380, width: 44, height: 460, type: 'pillar' });
        // Central low divider block
        this.solids.push({ x: 910, y: 920, width: 100, height: 120, type: 'pillar' });

        // 3. ONE-WAY SEMI-SOLID PLATFORMS
        // Lower Tier platforms
        this.oneWayPlatforms.push({ x: 140, y: 940, width: 220, height: 18 });
        this.oneWayPlatforms.push({ x: 530, y: 920, width: 280, height: 18 });
        this.oneWayPlatforms.push({ x: 1110, y: 920, width: 280, height: 18 });
        this.oneWayPlatforms.push({ x: 1560, y: 940, width: 220, height: 18 });

        // Mid Tier platforms
        this.oneWayPlatforms.push({ x: 220, y: 700, width: 160, height: 18 });
        this.oneWayPlatforms.push({ x: 520, y: 690, width: 220, height: 18 });
        this.oneWayPlatforms.push({ x: 810, y: 650, width: 300, height: 18 }); // Center hub
        this.oneWayPlatforms.push({ x: 1180, y: 690, width: 220, height: 18 });
        this.oneWayPlatforms.push({ x: 1540, y: 700, width: 160, height: 18 });

        // High Tier platforms
        this.oneWayPlatforms.push({ x: 120, y: 440, width: 240, height: 18 });
        this.oneWayPlatforms.push({ x: 520, y: 440, width: 200, height: 18 });
        this.oneWayPlatforms.push({ x: 830, y: 400, width: 260, height: 18 }); // High center nest
        this.oneWayPlatforms.push({ x: 1200, y: 440, width: 200, height: 18 });
        this.oneWayPlatforms.push({ x: 1560, y: 440, width: 240, height: 18 });

        // Top Sky Perches
        this.oneWayPlatforms.push({ x: 340, y: 220, width: 200, height: 18 });
        this.oneWayPlatforms.push({ x: 740, y: 200, width: 440, height: 18 }); // Sky bridge
        this.oneWayPlatforms.push({ x: 1380, y: 220, width: 200, height: 18 });

        // 4. KINETIC JUMP PADS (Launch player with tremendous upward force)
        this.jumpPads.push({
            x: 100,
            y: H - floorThick - 12,
            width: 70,
            height: 12,
            force: -1050,
            cooldown: 0
        });
        this.jumpPads.push({
            x: W - 170,
            y: H - floorThick - 12,
            width: 70,
            height: 12,
            force: -1050,
            cooldown: 0
        });
        this.jumpPads.push({
            x: 925,
            y: 920 - 12,
            width: 70,
            height: 12,
            force: -980,
            cooldown: 0
        });

        // 5. SPAWN POINTS
        // Ground Spawns
        this.spawnPoints.ground = [
            { x: 260, y: H - floorThick - 30 },
            { x: 670, y: H - floorThick - 30 },
            { x: 1250, y: H - floorThick - 30 },
            { x: 1660, y: H - floorThick - 30 },
            { x: 600, y: 920 - 30 },
            { x: 1200, y: 920 - 30 }
        ];

        // Air Spawns
        this.spawnPoints.air = [
            { x: 300, y: 150 },
            { x: 700, y: 140 },
            { x: 960, y: 120 },
            { x: 1220, y: 140 },
            { x: 1620, y: 150 },
            { x: 960, y: 340 }
        ];

        // Side Ambush Spawns
        this.spawnPoints.side = [
            { x: 100, y: 400 },
            { x: 100, y: 660 },
            { x: W - 100, y: 400 },
            { x: W - 100, y: 660 }
        ];
    }

    update(dt) {
        for (const pad of this.jumpPads) {
            if (pad.cooldown > 0) {
                pad.cooldown -= dt;
            }
        }
    }

    checkJumpPads(entity) {
        for (const pad of this.jumpPads) {
            if (
                entity.x + entity.width > pad.x &&
                entity.x < pad.x + pad.width &&
                entity.y + entity.height >= pad.y &&
                entity.y + entity.height <= pad.y + pad.height + 15 &&
                entity.vy >= 0 &&
                pad.cooldown <= 0
            ) {
                entity.vy = pad.force;
                pad.cooldown = 0.25;
                if (window.soundEngine) window.soundEngine.playJump();
                if (window.particles) {
                    window.particles.createShockwave(pad.x + pad.width / 2, pad.y, 70, '#ff0055', 0.28, 5);
                    window.particles.createSparks(pad.x + pad.width / 2, pad.y, 16, '#ff0055', 180, 480);
                }
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        const time = Date.now() * 0.001;

        // 1. Background Grid & Cyber Aesthetic
        ctx.save();
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, this.width, this.height);

        // Perspective grid lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;
        const gridSize = 64;
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // Ambient cyber glow columns
        const gradientLeft = ctx.createLinearGradient(0, 0, 300, 0);
        gradientLeft.addColorStop(0, 'rgba(255, 0, 85, 0.08)');
        gradientLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradientLeft;
        ctx.fillRect(0, 0, 300, this.height);

        const gradientRight = ctx.createLinearGradient(this.width, 0, this.width - 300, 0);
        gradientRight.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
        gradientRight.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradientRight;
        ctx.fillRect(this.width - 300, 0, 300, this.height);

        ctx.restore();

        // 2. Solid Structures (Walls, Floor, Pillars)
        for (const solid of this.solids) {
            ctx.save();
            ctx.fillStyle = '#10131f';
            ctx.fillRect(solid.x, solid.y, solid.width, solid.height);

            // Neon edge highlights
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.strokeRect(solid.x, solid.y, solid.width, solid.height);

            // Industrial grip pattern on walls
            if (solid.type === 'wall' || solid.type === 'pillar') {
                ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
                for (let py = solid.y + 15; py < solid.y + solid.height - 15; py += 32) {
                    ctx.fillRect(solid.x + 6, py, solid.width - 12, 3);
                }
            } else if (solid.type === 'floor') {
                ctx.fillStyle = 'rgba(255, 0, 85, 0.18)';
                for (let px = solid.x + 30; px < solid.x + solid.width - 30; px += 48) {
                    ctx.fillRect(px, solid.y + 4, 24, 4);
                }
            }
            ctx.restore();
        }

        // 3. One-Way Platforms
        for (const plat of this.oneWayPlatforms) {
            ctx.save();
            // Semitransparent platform body
            ctx.fillStyle = 'rgba(16, 26, 48, 0.88)';
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

            // Glowing top ledge rail
            ctx.strokeStyle = '#ff0077';
            ctx.shadowColor = '#ff0077';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(plat.x, plat.y);
            ctx.lineTo(plat.x + plat.width, plat.y);
            ctx.stroke();

            // Bottom subtle border
            ctx.strokeStyle = 'rgba(255, 0, 119, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

            // Tech tick marks
            ctx.fillStyle = '#ff0077';
            ctx.fillRect(plat.x + 4, plat.y + 3, 5, plat.height - 6);
            ctx.fillRect(plat.x + plat.width - 9, plat.y + 3, 5, plat.height - 6);
            ctx.restore();
        }

        // 4. Kinetic Jump Pads
        for (const pad of this.jumpPads) {
            ctx.save();
            const pulse = 0.7 + Math.sin(time * 8) * 0.3;
            ctx.fillStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 16 * pulse;
            ctx.fillRect(pad.x, pad.y, pad.width, pad.height);

            // Glowing chevron indicator pointing UP
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            const cx = pad.x + pad.width / 2;
            const cy = pad.y + 5;
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy + 3);
            ctx.lineTo(cx, cy - 4);
            ctx.lineTo(cx + 12, cy + 3);
            ctx.stroke();
            ctx.restore();
        }
    }
}

window.Arena = Arena;
