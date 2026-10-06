// Permanent Meta-Progression System (Core Shards & Neural Matrix)
class MetaProgression {
    constructor() {
        this.STORAGE_KEY = 'overdrive_meta_save_v1';
        this.data = {
            shards: 0,
            resilienceLevel: 0, // +15 Max HP per level (max 5)
            sharpnessLevel: 0,  // +8% Base Damage per level (max 5)
            overdriveLevel: 0,  // -8% Dash CD per level (max 4)
            critLevel: 0,       // +4% Crit Chance per level (max 4)
            rerollLevel: 0,     // +1 Reroll per level (max 2)
            highScoreWave: 1,
            totalKills: 0,
            totalRuns: 0
        };

        this.UPGRADE_DEFINITIONS = {
            resilience: {
                id: 'resilience',
                name: 'Resiliência do Chassi',
                desc: '+15 de Vida Máxima inicial por nível.',
                maxLevel: 5,
                costs: [10, 20, 35, 55, 80],
                key: 'resilienceLevel'
            },
            sharpness: {
                id: 'sharpness',
                name: 'Calibração de Lâmina',
                desc: '+8% de Dano de Ataque permanente por nível.',
                maxLevel: 5,
                costs: [12, 25, 45, 70, 100],
                key: 'sharpnessLevel'
            },
            overdrive: {
                id: 'overdrive',
                name: 'Reator de Overdrive',
                desc: '-8% no Tempo de Recarga do Dash por nível.',
                maxLevel: 4,
                costs: [15, 30, 50, 75],
                key: 'overdriveLevel'
            },
            crit: {
                id: 'crit',
                name: 'Matriz de Precisão',
                desc: '+4% de Chance Crítica inicial por nível.',
                maxLevel: 4,
                costs: [12, 24, 42, 65],
                key: 'critLevel'
            },
            reroll: {
                id: 'reroll',
                name: 'Módulo de Re-rolagem',
                desc: '+1 Reroll adicional de upgrades por run por nível.',
                maxLevel: 2,
                costs: [25, 60],
                key: 'rerollLevel'
            }
        };

        this.load();
    }

    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.data = { ...this.data, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load meta progression save', e);
        }
    }

    save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save meta progression', e);
        }
    }

    addShards(amount) {
        this.data.shards += amount;
        this.save();
    }

    recordRun(wave, kills) {
        this.data.totalRuns++;
        this.data.totalKills += kills;
        if (wave > this.data.highScoreWave) {
            this.data.highScoreWave = wave;
        }
        this.save();
    }

    canAfford(upgradeId) {
        const def = this.UPGRADE_DEFINITIONS[upgradeId];
        if (!def) return false;
        const currentLevel = this.data[def.key];
        if (currentLevel >= def.maxLevel) return false;
        const cost = def.costs[currentLevel];
        return this.data.shards >= cost;
    }

    buyUpgrade(upgradeId) {
        const def = this.UPGRADE_DEFINITIONS[upgradeId];
        if (!def) return false;
        const currentLevel = this.data[def.key];
        if (currentLevel >= def.maxLevel) return false;
        const cost = def.costs[currentLevel];

        if (this.data.shards >= cost) {
            this.data.shards -= cost;
            this.data[def.key]++;
            this.save();
            if (window.soundEngine) window.soundEngine.playUpgradeSelect();
            return true;
        }
        return false;
    }
}

window.metaProgression = new MetaProgression();
