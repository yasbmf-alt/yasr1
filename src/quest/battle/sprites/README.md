# Sprites da batalha (placeholders)

Desenhos provisórios em SVG. Para trocar por um desenho seu, salve um **PNG** (ou WebP)
com **o mesmo nome** na mesma pasta: ele passa a ser usado no lugar do SVG, sem mexer
em código. Pode apagar o SVG depois, se quiser.

Desenhe em pixel art no tamanho base abaixo (ou múltiplos exatos: 2×, 3×, 4×) e com
fundo transparente. A tela amplia sem borrar (`image-rendering: pixelated`).

| Arquivo | Tamanho base | O que é |
|---|---|---|
| `bigode.svg` | 16 × 17 | Dr. Bigode (narrador) |
| `yas-costas.svg` | 16 × 22 | Yas de costas, no lado de baixo da arena |
| `plataforma.svg` | 48 × 8 | chão oval onde os personagens ficam |
| `monstros/<slug>.svg` | 24 × 24 | monstro de cada tema |
| `ilhas/<slug>.svg` | 120 × 80 | fundo da ilha de cada tema (sem transparência) |

Slugs dos temas:

| slug | tema | monstro |
|---|---|---|
| `srag` | SRAG | Dragão Hipoxêmico |
| `ir` | Insuficiência respiratória | Fantasma Sem Fôlego |
| `acido` | Distúrbios do equilíbrio acidobásico | Alquimista do pH |
| `vm` | Ventilação mecânica e traqueostomia | Maestro do Ventilador |
| `va` | Vias aéreas básica e avançada | Serpente da Glote |
| `tox` | Intoxicações exógenas agudas | Bruxa do Caldeirão |
| `lra` | Lesão renal aguda | Golem de Creatinina |
| `pcr` | PCR: BLS, ACLS e PALS | Robô Sem Pulso |
| `dva` | Drogas vasoativas | Vampiro da Noradrenalina |
| `ad` | Psicofarmacologia: antidepressivos | Polvo Serotonina |
| `ep` | Emergências em psiquiatria | Tempestade da Crise |
| `pp` | Psicopatologia e exame do estado mental | Espelho Distorcido |
| `psi` | Esquizofrenia e transtornos psicóticos | Senhor dos Critérios |
| `pal` | Cuidados paliativos e manejo da dor | Guardiã da Lamparina |

Ilha Final e Revanche usam o slug `srag` como fallback.
