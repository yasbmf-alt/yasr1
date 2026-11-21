// Batalha de demonstração: funciona mesmo sem nenhuma questão no banco.
import type { BattleCast, BattleQuestion } from './types';

export const DEMO_CAST: BattleCast = { tema: 'SRAG', slug: 'srag', monstro: 'Dragão Hipoxêmico' };

export const DEMO_QUESTIONS: BattleQuestion[] = [
  {
    id: 'demo-01', tema: 'SRAG', zona: 'diagnostico', origem: 'exemplo',
    enunciado: 'Homem de 45 anos com pneumonia viral piora mesmo com máscara com reservatório (FiO₂ 0,6). Gasometria: PaO₂ 58 mmHg. Radiografia com opacidades bilaterais; ecocardiograma normal. Como classificar a SDRA e qual a conduta?',
    alternativas: { A: 'SDRA leve: manter máscara e repetir gasometria em 1 h.', B: 'SDRA moderada: cateter nasal de alto fluxo antes de pensar em intubação.', C: 'SDRA grave: intubação e ventilação mecânica protetora.', D: 'Não é SDRA, pois o infiltrado não ocupa 75% dos campos.' },
    gabarito: 'C',
    comentario: 'PaO₂/FiO₂ = 58 ÷ 0,6 ≈ 97, ou seja, abaixo de 100: SDRA grave pela classificação de Berlim. Infiltrado bilateral sem causa cardíaca (eco normal) completa o critério. Conduta: intubação e ventilação protetora (volume corrente de 4 a 8 mL/kg do peso predito, em geral 6 mL/kg).',
  },
  {
    id: 'demo-02', tema: 'PCR: BLS, ACLS e PALS', zona: 'tratamento', origem: 'exemplo',
    enunciado: 'Paciente em PCR. No monitor: assistolia, confirmada após checar cabos, ganho e derivação. Qual medicação deve ser feita?',
    alternativas: { A: 'Atropina 1 mg.', B: 'Lidocaína 1 a 1,5 mg/kg.', C: 'Epinefrina 1 mg.', D: 'Amiodarona 300 mg.' },
    gabarito: 'C',
    comentario: 'Assistolia é ritmo não chocável: RCP de alta qualidade e epinefrina 1 mg IV/IO o quanto antes, repetindo a cada 3 a 5 minutos. Atropina saiu do algoritmo de PCR; amiodarona e lidocaína são para FV/TV sem pulso refratárias.',
  },
  {
    id: 'demo-03', tema: 'Intoxicações exógenas agudas', zona: 'diagnostico', origem: 'exemplo',
    enunciado: 'Jovem trazido confuso, com pele seca e quente, pupilas dilatadas, taquicardia, mucosas secas e retenção urinária. Qual síndrome tóxica é a mais provável?',
    alternativas: { A: 'Colinérgica.', B: 'Anticolinérgica.', C: 'Opioide.', D: 'Simpaticomimética.' },
    gabarito: 'B',
    comentario: 'Pele SECA e quente, midríase, taquicardia, mucosas secas, retenção urinária e confusão: síndrome anticolinérgica ("seco como um osso, quente como o inferno"). Na simpaticomimética os achados são parecidos, mas a pele é sudorética — essa é a pegadinha clássica.',
  },
  {
    id: 'demo-04', tema: 'Lesão renal aguda', zona: 'diagnostico', origem: 'exemplo',
    enunciado: 'Idosa com vômitos há 3 dias, hipotensão postural e oligúria. Exames: ureia e creatinina elevadas, sódio urinário baixo e fração de excreção de sódio (FeNa) abaixo de 1%. Qual o tipo mais provável de lesão renal aguda?',
    alternativas: { A: 'Pré-renal.', B: 'Renal por necrose tubular aguda.', C: 'Pós-renal.', D: 'Renal por glomerulonefrite.' },
    gabarito: 'A',
    comentario: 'Hipovolemia com rim "guardando sódio" (sódio urinário baixo e FeNa < 1%) indica LRA pré-renal: o túbulo ainda funciona. Na necrose tubular aguda o túbulo lesado perde sódio (FeNa > 2%).',
  },
  {
    id: 'demo-05', tema: 'Insuficiência respiratória', zona: 'pegadinha', origem: 'exemplo',
    enunciado: 'O que define a insuficiência respiratória aguda do tipo II (hipercápnica)?',
    alternativas: { A: 'PaO₂ menor que 60 mmHg em ar ambiente.', B: 'PaCO₂ maior que 50 mmHg.', C: 'Saturação de O₂ menor que 95%.', D: 'Frequência respiratória acima de 30 irpm.', E: 'Lactato maior que 2 mmol/L.' },
    gabarito: 'B',
    comentario: 'Tipo II = falha de ventilação: PaCO₂ acima de 50 mmHg (hipercapnia), geralmente com acidose respiratória. PaO₂ abaixo de 60 mmHg define o tipo I (hipoxêmico). Saturação, frequência respiratória e lactato não definem o tipo.',
  },
  {
    id: 'demo-06', tema: 'SRAG', zona: 'tratamento', origem: 'exemplo',
    enunciado: 'Na ventilação mecânica protetora da SDRA, como deve ser calculado o volume corrente?',
    alternativas: { A: '10 mL/kg do peso real.', B: '6 mL/kg do peso predito (pela altura e pelo sexo).', C: '8 mL/kg do peso real.', D: '12 mL/kg do peso ideal pelo IMC.' },
    gabarito: 'B',
    comentario: 'O pulmão "tem o tamanho" da altura da pessoa, não do peso: o volume corrente é calculado pelo peso PREDITO (altura e sexo), em torno de 6 mL/kg (faixa de 4 a 8), mantendo pressão de platô até 30 cmH₂O.',
  },
];
