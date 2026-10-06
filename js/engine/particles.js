// High-performance Particle and FX System (Trails, Sparks, Shockwaves, Damage Numbers, Slash Arcs)
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
        this.ghostTrails = [];
        this.slashArcs = [];
    }

    reset() {
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
        this.ghostTrails = [];
        this.slashArcs = [];
    }

    // --- DASH AFTERIMAGE TRAILS ---
    addGhostTrail(x, y, width, height, color = '#00f0ff', facing = 1, isAir = false) {
        this.ghostTrails.push({
            x,
            y,
            width,
            height,
            color,
            alpha: 0.65,
            decay: 3.2, // ~0.2s duration
            facing,
            isAir
        });
    }

    // --- NEON SPARKS & PARTICLES ---
    createSparks(x, y, count = 12, color = '#00f0ff', minSpeed = 80, maxSpeed = 320, size = 3) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * size + 1.5,
                color,
                alpha: 1.0,
                decay: 2.2 + Math.random() * 2.0,
                gravity: 280,
                drag: 0.94
            });
        }
    }

    // --- DIRECTIONAL SPRAY (e.g. Wall slide, Wall jump, Blood/Energy splash) ---
    createSpray(x, y, baseAngle, spread = 0.5, count = 8, color = '#ff0055', minSpeed = 100, maxSpeed = 280) {
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * spread;
            const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 3 + 1,
                color,
                alpha: 1.0,
                decay: 2.8 + Math.random() * 1.5,
                gravity: 350,
                drag: 0.92
            });
        }
    }

    // --- EXPANDING SHOCKWAVES ---
    createShockwave(x, y, maxRadius = 120, color = '#00f0ff', duration = 0.35, lineWidth = 4) {
        this.shockwaves.push({
            x,
            y,
            radius: 5,
            maxRadius,
            color,
            duration,
            life: duration,
            lineWidth
        });
    }

    // --- MELEE SLASH ARC VISUALS ---
    addSlashArc(x, y, radius = 55, startAngle = -Math.PI / 4, endAngle = Math.PI / 4, color = '#00ffff', facing = 1) {
        this.slashArcs.push({
            x,
            y,
            radius,
            startAngle,
            endAngle,
            color,
            facing,
            alpha: 1.0,
            decay: 6.5 // very fast flash (~150ms)
        });
    }

    // --- FLOATING DAMAGE & STATUS NUMBERS ---
    addDamageText(x, y, text, isCrit = false, isHeal = false, customColor = null) {
        let color = '#ffffff';
        let scale = 1.0;

        if (isHeal) {
            color = '#39ff14';
            scale = 1.1;
        } else if (isCrit) {
            color = '#ff0055';
            scale = 1.55;
            text = text + '!';
        } else if (customColor) {
            color = customColor;
        }

        this.floatingTexts.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 10,
            text: String(text),
            color,
            scale,
            alpha: 1.0,
            vx: (Math.random() - 0.5) * 40,
            vy: -110 - Math.random() * 40,
            duration: 0.85,
            life: 0.85
        });
    }

    update(dt) {
        // Ghost trails
        for (let i = this.ghostTrails.length - 1; i >= 0; i--) {
            const g = this.ghostTrails[i];
            g.alpha -= g.decay * dt;
            if (g.alpha <= 0) {
                this.ghostTrails.splice(i, 1);
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.pow(p.drag, dt * 60);
            p.vy *= Math.pow(p.drag, dt * 60);
            p.vy += p.gravity * dt;
            p.alpha -= p.decay * dt;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Slash Arcs
        for (let i = this.slashArcs.length - 1; i >= 0; i--) {
            const arc = this.slashArcs[i];
            arc.alpha -= arc.decay * dt;
            if (arc.alpha <= 0) {
                this.slashArcs.splice(i, 1);
            }
        }

        // Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= dt;
            const progress = 1.0 - (sw.life / sw.duration);
            sw.radius = 5 + (sw.maxRadius - 5) * Math.sin(progress * Math.PI * 0.5);
            if (sw.life <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.x += ft.vx * dt;
            ft.y += ft.vy * dt;
            ft.vy += 80 * dt; // slight gravity deceleration
            ft.life -= dt;
            ft.alpha = Math.max(0, ft.life / ft.duration);
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // 1. Ghost Trails
        for (const g of this.ghostTrails) {
            ctx.save();
            ctx.globalAlpha = g.alpha * 0.6;
            ctx.fillStyle = g.color;
            ctx.shadowColor = g.color;
            ctx.shadowBlur = 12;

            // Draw stylized player silhouette
            ctx.beginPath();
            ctx.roundRect(g.x, g.y, g.width, g.height, 6);
            ctx.fill();

            // Visor line
            ctx.fillStyle = '#ffffff';
            const visorX = g.facing > 0 ? g.x + g.width * 0.55 : g.x + g.width * 0.15;
            ctx.fillRect(visorX, g.y + g.height * 0.22, g.width * 0.3, 4);

            ctx.restore();
        }

        // 2. Slash Arcs
        for (const arc of this.slashArcs) {
            ctx.save();
            ctx.globalAlpha = arc.alpha;
            ctx.strokeStyle = arc.color;
            ctx.shadowColor = arc.color;
            ctx.shadowBlur = 16;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.arc(arc.x, arc.y, arc.radius, arc.startAngle, arc.endAngle, false);
            ctx.stroke();

            // Inner core stroke
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
        }

        // 3. Shockwaves
        for (const sw of this.shockwaves) {
            const alpha = Math.max(0, sw.life / sw.duration);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = sw.color;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 18;
            ctx.lineWidth = sw.lineWidth * alpha;

            ctx.beginPath();
            ctx.ellipse(sw.x, sw.y, sw.radius, sw.radius * 0.55, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 4. Particles (Additive Neon glow)
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';

        // 5. Floating Damage Text
        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = `900 ${Math.round(15 * ft.scale)}px "Outfit", "Inter", sans-serif`;
            ctx.textAlign = 'center';

            // Text glow and outline
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.lineWidth = 4;
            ctx.strokeText(ft.text, ft.x, ft.y);

            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 10;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        ctx.restore();
    }
}

window.particles = new ParticleSystem();
