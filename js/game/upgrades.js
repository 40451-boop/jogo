// Roguelike Upgrades, Synergies, and Build System
const UPGRADE_POOL = [
    // --- BUILD: VELOCIDADE & DASH ---
    {
        id: 'hyper_thrusters',
        name: 'Propulsores Hyper',
        build: 'Velocidade',
        rarity: 'Common',
        icon: '⚡',
        description: '+25% de velocidade de movimento e +15% na aceleração.',
        apply: (player) => {
            player.moveSpeedMult += 0.25;
        }
    },
    {
        id: 'phase_dash',
        name: 'Dash de Fase',
        build: 'Dash',
        rarity: 'Rare',
        icon: '🌀',
        description: 'O Dash agora atravessa inimigos causando 45 de dano de corte.',
        apply: (player) => {
            player.phaseDashDamage += 45;
        }
    },
    {
        id: 'quantum_battery',
        name: 'Bateria Quântica',
        build: 'Dash',
        rarity: 'Epic',
        icon: '🔋',
        description: '+1 Carga máxima de Dash e recarga 20% mais rápida.',
        apply: (player) => {
            player.maxDashCharges += 1;
            player.dashCharges = Math.min(player.maxDashCharges, player.dashCharges + 1);
            player.dashCooldownTime = Math.max(0.4, player.dashCooldownTime * 0.8);
        }
    },
    {
        id: 'kinetic_recharge',
        name: 'Recarga Cinética',
        build: 'Dash',
        rarity: 'Rare',
        icon: '🔄',
        description: 'Eliminar qualquer inimigo restaura instantaneamente 1 carga de Dash.',
        apply: (player) => {
            player.dashResetsOnKill = true;
        }
    },
    {
        id: 'sky_acrobat',
        name: 'Acrobata Aéreo',
        build: 'Velocidade',
        rarity: 'Rare',
        icon: '🤸',
        description: 'Realizar um Wall Jump recupera 1 carga de Dash no ar.',
        apply: (player) => {
            player.skyAcrobat = true;
        }
    },

    // --- BUILD: AÉREA (AIR COMBAT) ---
    {
        id: 'zephyr_wings',
        name: 'Salto Zephyr',
        build: 'Aérea',
        rarity: 'Epic',
        icon: '🪶',
        description: '+1 Pulo extra no ar (Pulo Triplo!).',
        apply: (player) => {
            player.maxJumps += 1;
            player.remainingJumps += 1;
        }
    },
    {
        id: 'aero_reaper',
        name: 'Ceifador Aéreo',
        build: 'Aérea',
        rarity: 'Common',
        icon: '🌪️',
        description: 'Ataques realizados no ar causam +50% de dano adicional.',
        apply: (player) => {
            player.aerialDamageBonus += 0.50;
        }
    },
    {
        id: 'meteor_slam',
        name: 'Impacto Meteórico',
        build: 'Aérea',
        rarity: 'Rare',
        icon: '☄️',
        description: 'O Seismic Dive Slam tem o raio da onda de choque dobrado e causa +40 de dano.',
        apply: (player) => {
            player.diveSlamRadiusMult += 0.8;
            player.damageMult += 0.15;
        }
    },
    {
        id: 'high_velocity',
        name: 'Impulso Vertical',
        build: 'Aérea',
        rarity: 'Common',
        icon: '🚀',
        description: '+20% de altura máxima de pulo e queda rápida mais veloz.',
        apply: (player) => {
            player.jumpForce *= 1.15;
            player.fastFallVelocity += 250;
        }
    },

    // --- BUILD: AGRESSIVA & COMBATE CORPO A CORPO ---
    {
        id: 'plasma_edge',
        name: 'Gume de Plasma',
        build: 'Agressiva',
        rarity: 'Common',
        icon: '⚔️',
        description: '+30% de dano geral em todos os ataques corpo a corpo.',
        apply: (player) => {
            player.damageMult += 0.30;
        }
    },
    {
        id: 'overclock_strike',
        name: 'Ataque Overclock',
        build: 'Agressiva',
        rarity: 'Rare',
        icon: '⏱️',
        description: '+40% de velocidade de ataque para combos instantâneos.',
        apply: (player) => {
            player.attackSpeedMult += 0.40;
        }
    },
    {
        id: 'crit_matrix',
        name: 'Matriz Crítica',
        build: 'Agressiva',
        rarity: 'Rare',
        icon: '🎯',
        description: '+20% de chance de Acerto Crítico (Críticos causam 200% de dano).',
        apply: (player) => {
            player.critChance += 0.20;
        }
    },
    {
        id: 'executioner',
        name: 'Marcador Algoz',
        build: 'Agressiva',
        rarity: 'Epic',
        icon: '☠️',
        description: 'Causa +75% de dano devastador contra inimigos com menos de 40% de vida.',
        apply: (player) => {
            player.executionerMark = true;
        }
    },
    {
        id: 'repulsor_blade',
        name: 'Lâmina Repulsora',
        build: 'Agressiva',
        rarity: 'Common',
        icon: '💥',
        description: 'Seus ataques causam +100% de knockback, arremessando inimigos contra paredes.',
        apply: (player) => {
            player.knockbackMult += 1.0;
        }
    },
    {
        id: 'chain_lightning',
        name: 'Relâmpago em Cadeia',
        build: 'Agressiva',
        rarity: 'Legendary',
        icon: '⚡',
        description: 'Acertos com espada disparam arcos elétricos que eletrocutam até 3 inimigos próximos.',
        apply: (player) => {
            player.chainLightning = true;
        }
    },

    // --- BUILD: DEFENSIVA & SOBREVIVÊNCIA ---
    {
        id: 'nanite_siphon',
        name: 'Sifão de Nanitas',
        build: 'Defensiva',
        rarity: 'Rare',
        icon: '💉',
        description: 'Eliminar um inimigo restaura 6 pontos de vida imediatamente.',
        apply: (player) => {
            player.lifestealOnKill += 6;
        }
    },
    {
        id: 'aegis_shield',
        name: 'Escudo Aegis',
        build: 'Defensiva',
        rarity: 'Epic',
        icon: '🛡️',
        description: 'Gera uma barreira que anula completamente 1 acerto recebido a cada 14 segundos.',
        apply: (player) => {
            player.hasAegisShield = true;
            player.aegisShieldReady = true;
        }
    },
    {
        id: 'reinforced_plating',
        name: 'Blindagem Reforçada',
        build: 'Defensiva',
        rarity: 'Common',
        icon: '🧱',
        description: '+40 de Vida Máxima e cura instantânea de 30 HP.',
        apply: (player) => {
            player.maxHp += 40;
            player.heal(30);
        }
    },
    {
        id: 'second_wind',
        name: 'Segundo Fôlego',
        build: 'Defensiva',
        rarity: 'Legendary',
        icon: '❤️‍🔥',
        description: 'Ao sofrer dano fatal, você sobrevive com 50% de HP e ganha 2s de invulnerabilidade (1x por run).',
        apply: (player) => {
            player.secondWindAvailable = true;
        }
    }
];

class UpgradeManager {
    constructor() {
        this.selectedUpgrades = [];
        this.rerollsRemaining = 1;
    }

    reset(rerolls = 1) {
        this.selectedUpgrades = [];
        this.rerollsRemaining = rerolls;
    }

    getRandomOptions(count = 3) {
        // Filter out legendary one-time upgrades that have already been picked
        const available = UPGRADE_POOL.filter(u => {
            if (u.id === 'second_wind' && this.selectedUpgrades.some(s => s.id === 'second_wind')) {
                return false;
            }
            return true;
        });

        // Shuffle
        const shuffled = [...available].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    applyUpgrade(upgrade, player) {
        upgrade.apply(player);
        this.selectedUpgrades.push(upgrade);
        if (window.soundEngine) window.soundEngine.playUpgradeSelect();
    }
}

window.UPGRADE_POOL = UPGRADE_POOL;
window.upgradeManager = new UpgradeManager();
