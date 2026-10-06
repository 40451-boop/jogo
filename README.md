# OVERDRIVE: ARENA ROGUELIKE

Um jogo de ação 2D singleplayer no estilo **Roguelike Arena**, focado em **movimentação ultra-rápida, combate dinâmico e sobrevivência contra waves crescentes de inimigos**.

---

## 🕹️ Como Jogar

O jogo está rodando em um servidor local em:
👉 **`http://localhost:8085`**

Você também pode abrir diretamente o arquivo [`index.html`](file:///C:/Users/Aluno/.gemini/antigravity-ide/scratch/overdrive-arena/index.html) no seu navegador preferido (Google Chrome, Edge, Firefox, Brave, etc.).

---

## 🎮 Controles

| Ação | Teclado & Mouse | Controle / Gamepad |
| :--- | :--- | :--- |
| **Mover Esquerda / Direita** | `A` / `D` ou `Setas` | Analógico Esquerdo / D-Pad |
| **Pulo / Pulo Duplo** | `W`, `Espaço` ou `Seta Cima` | Botão `A` (Xbox) / `X` (PS) |
| **Dash Horizontal & Aéreo** | `Shift`, `K` ou `Botão Direito do Mouse` | Botão `B` ou Gatilho `RT` |
| **Ataque Melee (Combo / Aéreo)** | `J` ou `Botão Esquerdo do Mouse` | Botão `X` (Xbox) / `Quadrado` (PS) |
| **Wall Slide & Wall Jump** | Encoste na parede + aperte `Pulo` | Encoste na parede + aperte `A` |
| **Queda Rápida (Fast Fall)** | `S` ou `Seta Baixo` no ar | Analógico para baixo no ar |
| **Seismic Dive Slam** | `S` / `Baixo` + `Ataque` no ar | Analógico para baixo + `X` |
| **Descer de Plataforma** | `S` / `Baixo` + `Pulo` | Analógico para baixo + `A` |
| **Pausar / Menu** | `Esc` ou `P` | Botão `Start` |

---

## 🚀 Mecânicas de Movimentação Avançada

1. **Combos Aéreos Fluidos**: Pular → Dash no ar → Wall Jump no pilar → Dash → Ataque giratório → Fast Fall → Wall Jump.
2. **Coyote Time & Jump Buffering**: Tolerância de tempo para saltar logo após cair de plataformas ou antes de encostar no chão.
3. **Pulo com Altura Variável**: Segurar a tecla de pulo atinge a altitude máxima; soltar antes corta a subida para manobras rasantes precisas.
4. **Dash com Invulnerabilidade (i-frames)**: Permite atravessar projéteis, lasers e enxames de inimigos.
5. **Kinetic Jump Pads**: Plataformas nos cantos inferiores que disparam o jogador verticalmente com força cinética extrema.

---

## 👾 Inimigos & Wave Progression

- **Wave 1**: *Neon Crawlers* (Básicos do chão, saltam quando próximos).
- **Wave 2**: Crawlers + *Aero Drones* (Inimigos voadores velozes).
- **Wave 3**: Crawlers + Drones + *Railgunners* (Atiradores de precisão com mira laser telegrafada).
- **Wave 4**: *Goliath Mechs* (Tanques pesados que geram ondas de choque no solo) + Drones.
- **Wave 5**: **Invasão Elite** (Inimigos com coroa dourada, vida ampliada e habilidades especiais).
- **Wave 6**: *Volatile Bots* (Kamikazes explosivos com alarme sonoro e raio de detonação).
- **Wave 7**: *Shadow Blades* (Ágeis com dash agressivo) + Railgunners + Drones.
- **Wave 8**: Combinação pesada de Goliaths + Volatiles + Drones.
- **Wave 9**: Onda Mini-Boss com múltiplos campeões Elites.
- **Wave 10**: **BOSS: OVERLOAD V-1: APEX ENFORCER**
  - *Fase 1*: Salvo de mísseis teleguiados e investidas.
  - *Fase 2*: Gigante Laser Sweeper que varre a arena (exige wall jump e dash para desviar).
  - *Fase 3 (Enfurecido)*: Modo Overclock com velocidade extrema e salto sísmico.
- **Pós-Boss**: Ciclos contínuos de Overdrive com scaling infinito de dificuldade!

---

## 🧬 Builds & Upgrades Roguelike

Após cada wave, escolha 1 entre 3 upgrades aleatórios (com suporte a re-rolagem):
- **Build de Velocidade**: Propulsores Hyper, Wall Jump resetando Dash.
- **Build Aérea**: Pulo Triplo (Zephyr Wings), Ceifador Aéreo (+50% dano no ar), Impacto Meteórico.
- **Build Agressiva**: Gume de Plasma, Ataque Overclock (+40% atk speed), Relâmpago em Cadeia, Algoz.
- **Build de Dash**: Dash de Fase (dano ao atravessar), Bateria Quântica (+1 carga de dash), Recarga Cinética ao matar.
- **Build Defensiva & Vampírica**: Escudo Aegis (anula 1 hit a cada 14s), Sifão de Nanitas (cura ao matar), Segundo Fôlego.

---

## 💎 Meta-Progressão (Matriz Neural)

Colete **Fragmentos de Núcleo (Core Shards)** durante as runs para desbloquear melhorias permanentes:
- **Resiliência do Chassi**: +Vida inicial.
- **Calibração de Lâmina**: +Dano permanente.
- **Reator de Overdrive**: -Tempo de recarga do Dash.
- **Matriz de Precisão**: +Chance de Acerto Crítico.
- **Módulo de Re-rolagem**: +Re-rolls de upgrades por run.
