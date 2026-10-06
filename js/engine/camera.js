// Cinematic dynamic camera with smooth lerp, lookahead, speed zoom, screen shake, and hitstop
class Camera {
    constructor(viewportWidth = 1280, viewportHeight = 720) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;

        // Smooth damping
        this.smoothSpeed = 0.12;

        // Lookahead
        this.lookAheadX = 0;
        this.lookAheadY = 0;
        this.maxLookAhead = 150;

        // Dynamic Zoom
        this.zoom = 1.0;
        this.targetZoom = 1.0;
        this.baseZoom = 1.0;
        this.minZoom = 0.88;

        // Screen Shake (Trauma model: shake = trauma^2)
        this.trauma = 0;
        this.traumaDecay = 1.8; // Per second
        this.maxShakeOffset = 18;
        this.maxShakeAngle = 0.04;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.shakeAngle = 0;

        // Hitstop (micro-freeze)
        this.hitstopTimer = 0;

        // World Bounds
        this.bounds = {
            minX: 0,
            maxX: 2200,
            minY: 0,
            maxY: 1300
        };
    }

    setBounds(minX, maxX, minY, maxY) {
        this.bounds = { minX, maxX, minY, maxY };
    }

    addTrauma(amount) {
        this.trauma = Math.min(1.0, this.trauma + amount);
    }

    triggerHitstop(duration = 0.045) {
        this.hitstopTimer = Math.max(this.hitstopTimer, duration);
    }

    update(dt, target) {
        // Hitstop countdown
        if (this.hitstopTimer > 0) {
            this.hitstopTimer -= dt;
            if (this.hitstopTimer > 0) {
                return false; // Tells game loop to freeze game logic
            }
        }

        if (!target) return true;

        // Lookahead based on target velocity
        const targetVx = target.vx || 0;
        const targetVy = target.vy || 0;
        const speed = Math.hypot(targetVx, targetVy);

        const desiredLookX = (targetVx / 800) * this.maxLookAhead;
        const desiredLookY = (targetVy / 900) * (this.maxLookAhead * 0.7);
        this.lookAheadX += (desiredLookX - this.lookAheadX) * 0.08;
        this.lookAheadY += (desiredLookY - this.lookAheadY) * 0.08;

        // Dynamic Zoom out during high-speed moves (e.g. Dashing or Diving)
        if (speed > 550) {
            this.targetZoom = Math.max(this.minZoom, this.baseZoom - (speed / 1800) * 0.16);
        } else {
            this.targetZoom = this.baseZoom;
        }
        this.zoom += (this.targetZoom - this.zoom) * 0.06;

        // Desired camera center
        const desiredCenterX = target.x + (target.width ? target.width / 2 : 0) + this.lookAheadX;
        const desiredCenterY = target.y + (target.height ? target.height / 2 : 0) + this.lookAheadY;

        // Desired top-left of camera
        const halfW = (this.viewportWidth / this.zoom) / 2;
        const halfH = (this.viewportHeight / this.zoom) / 2;

        this.targetX = desiredCenterX - halfW;
        this.targetY = desiredCenterY - halfH;

        // Clamp inside bounds
        const maxCamX = this.bounds.maxX - (this.viewportWidth / this.zoom);
        const maxCamY = this.bounds.maxY - (this.viewportHeight / this.zoom);
        this.targetX = Math.max(this.bounds.minX, Math.min(this.targetX, maxCamX));
        this.targetY = Math.max(this.bounds.minY, Math.min(this.targetY, maxCamY));

        // Smooth lerp
        this.x += (this.targetX - this.x) * this.smoothSpeed;
        this.y += (this.targetY - this.y) * this.smoothSpeed;

        // Trauma decay & Shake calculation
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);
            const shake = this.trauma * this.trauma;
            const seed = Date.now() * 0.05;
            this.shakeOffsetX = (Math.sin(seed * 1.7) * this.maxShakeOffset * shake);
            this.shakeOffsetY = (Math.cos(seed * 2.3) * this.maxShakeOffset * shake);
            this.shakeAngle = (Math.sin(seed * 3.1) * this.maxShakeAngle * shake);
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
            this.shakeAngle = 0;
        }

        return true;
    }

    applyTransform(ctx) {
        ctx.save();
        // Center rotation for shake angle
        const cx = this.viewportWidth / 2;
        const cy = this.viewportHeight / 2;
        ctx.translate(cx + this.shakeOffsetX, cy + this.shakeOffsetY);
        if (this.shakeAngle !== 0) ctx.rotate(this.shakeAngle);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-cx - this.x, -cy - this.y);
    }

    restoreTransform(ctx) {
        ctx.restore();
    }
}

window.Camera = Camera;
