// Robust Input Handler supporting Keyboard, Mouse, and Gamepad with action buffering
class InputHandler {
    constructor() {
        this.keys = {};
        this.prevKeys = {};
        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            leftDown: false,
            rightDown: false,
            leftJustPressed: false,
            rightJustPressed: false
        };

        // Key mappings
        this.bindings = {
            left: ['KeyA', 'ArrowLeft'],
            right: ['KeyD', 'ArrowRight'],
            up: ['KeyW', 'ArrowUp', 'Space'],
            down: ['KeyS', 'ArrowDown'],
            jump: ['Space', 'KeyW', 'ArrowUp'],
            dash: ['ShiftLeft', 'ShiftRight', 'KeyK'],
            attack: ['KeyJ'],
            pause: ['Escape', 'KeyP']
        };

        // Action buffers (in seconds)
        this.bufferTimers = {
            jump: 0,
            dash: 0,
            attack: 0
        };
        this.BUFFER_WINDOW = 0.14; // 140ms input buffer

        this.gamepadConnected = false;
        this.gamepadIndex = null;

        this.initListeners();
    }

    initListeners() {
        window.addEventListener('keydown', (e) => {
            // Prevent scrolling on space / arrow keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            if (!this.keys[e.code]) {
                this.keys[e.code] = true;
                this.checkBufferOnPress(e.code);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                this.mouse.x = (e.clientX - rect.left) * scaleX;
                this.mouse.y = (e.clientY - rect.top) * scaleY;
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.leftDown = true;
                this.mouse.leftJustPressed = true;
                this.bufferTimers.attack = this.BUFFER_WINDOW;
            } else if (e.button === 2) {
                e.preventDefault();
                this.mouse.rightDown = true;
                this.mouse.rightJustPressed = true;
                this.bufferTimers.dash = this.BUFFER_WINDOW;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadConnected = true;
            this.gamepadIndex = e.gamepad.index;
        });

        window.addEventListener('gamepaddisconnected', () => {
            this.gamepadConnected = false;
            this.gamepadIndex = null;
        });
    }

    checkBufferOnPress(code) {
        if (this.bindings.jump.includes(code)) {
            this.bufferTimers.jump = this.BUFFER_WINDOW;
        }
        if (this.bindings.dash.includes(code)) {
            this.bufferTimers.dash = this.BUFFER_WINDOW;
        }
        if (this.bindings.attack.includes(code)) {
            this.bufferTimers.attack = this.BUFFER_WINDOW;
        }
    }

    update(dt, camera) {
        // Update world mouse coordinates
        if (camera) {
            this.mouse.worldX = (this.mouse.x / camera.zoom) + camera.x;
            this.mouse.worldY = (this.mouse.y / camera.zoom) + camera.y;
        }

        // Tick down buffers
        for (const action in this.bufferTimers) {
            if (this.bufferTimers[action] > 0) {
                this.bufferTimers[action] -= dt;
                if (this.bufferTimers[action] < 0) this.bufferTimers[action] = 0;
            }
        }

        // Sample Gamepad
        this.pollGamepad();
    }

    postUpdate() {
        // Save current keys to previous keys
        this.prevKeys = { ...this.keys };
        this.mouse.leftJustPressed = false;
        this.mouse.rightJustPressed = false;
    }

    pollGamepad() {
        if (!navigator.getGamepads) return;
        const gamepads = navigator.getGamepads();
        const gp = gamepads[this.gamepadIndex] || gamepads[0];
        if (!gp) return;

        const deadzone = 0.25;
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;

        if (axisX < -deadzone || (gp.buttons[14] && gp.buttons[14].pressed)) {
            this.keys['GP_Left'] = true;
        } else {
            this.keys['GP_Left'] = false;
        }

        if (axisX > deadzone || (gp.buttons[15] && gp.buttons[15].pressed)) {
            this.keys['GP_Right'] = true;
        } else {
            this.keys['GP_Right'] = false;
        }

        if (axisY > deadzone || (gp.buttons[13] && gp.buttons[13].pressed)) {
            this.keys['GP_Down'] = true;
        } else {
            this.keys['GP_Down'] = false;
        }

        // Button 0 (A) -> Jump
        if (gp.buttons[0] && gp.buttons[0].pressed) {
            if (!this.prevKeys['GP_Jump']) {
                this.bufferTimers.jump = this.BUFFER_WINDOW;
            }
            this.keys['GP_Jump'] = true;
        } else {
            this.keys['GP_Jump'] = false;
        }

        // Button 1 (B) or Button 7 (RT) -> Dash
        if ((gp.buttons[1] && gp.buttons[1].pressed) || (gp.buttons[7] && gp.buttons[7].pressed)) {
            if (!this.prevKeys['GP_Dash']) {
                this.bufferTimers.dash = this.BUFFER_WINDOW;
            }
            this.keys['GP_Dash'] = true;
        } else {
            this.keys['GP_Dash'] = false;
        }

        // Button 2 (X) -> Attack
        if (gp.buttons[2] && gp.buttons[2].pressed) {
            if (!this.prevKeys['GP_Attack']) {
                this.bufferTimers.attack = this.BUFFER_WINDOW;
            }
            this.keys['GP_Attack'] = true;
        } else {
            this.keys['GP_Attack'] = false;
        }
    }

    isDown(action) {
        if (action === 'attack' && this.mouse.leftDown) return true;
        if (action === 'dash' && this.mouse.rightDown) return true;
        if (action === 'left' && this.keys['GP_Left']) return true;
        if (action === 'right' && this.keys['GP_Right']) return true;
        if (action === 'down' && this.keys['GP_Down']) return true;
        if (action === 'jump' && this.keys['GP_Jump']) return true;
        if (action === 'dash' && this.keys['GP_Dash']) return true;
        if (action === 'attack' && this.keys['GP_Attack']) return true;

        const codes = this.bindings[action];
        if (!codes) return false;
        return codes.some(code => !!this.keys[code]);
    }

    justPressed(action) {
        if (action === 'attack' && this.mouse.leftJustPressed) return true;
        if (action === 'dash' && this.mouse.rightJustPressed) return true;
        if (action === 'jump' && this.keys['GP_Jump'] && !this.prevKeys['GP_Jump']) return true;
        if (action === 'dash' && this.keys['GP_Dash'] && !this.prevKeys['GP_Dash']) return true;
        if (action === 'attack' && this.keys['GP_Attack'] && !this.prevKeys['GP_Attack']) return true;

        const codes = this.bindings[action];
        if (!codes) return false;
        return codes.some(code => this.keys[code] && !this.prevKeys[code]);
    }

    // Buffer check: returns true and consumes buffer if active
    consumeBuffer(action) {
        if (this.bufferTimers[action] > 0) {
            this.bufferTimers[action] = 0;
            return true;
        }
        return false;
    }

    hasBuffered(action) {
        return this.bufferTimers[action] > 0;
    }

    getHorizontalAxis() {
        let dir = 0;
        if (this.isDown('left')) dir -= 1;
        if (this.isDown('right')) dir += 1;
        return dir;
    }
}

window.input = new InputHandler();
