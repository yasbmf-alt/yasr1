// Falas oficiais do elenco do Yas Quest (14 chefões, Yasmim e Dr. Bigodes).
// Gerado de YAS_QUEST_FALAS_ELENCO_OFICIAL_14_TEMAS.json (versão 2.0). Não editar à mão.
export interface Interacao { yas: string; vilao: string; bigodes: string }
export interface FalasIlha {
  vilao: string; // nome oficial do chefão
  ilha: string;
  deboche: string[]; // provocações (contra-ataque)
  surto: string[]; // o chefão perdendo a pose ao levar dano (se vazio, usa o deboche)
  interacoes: Partial<Record<'entrada' | 'provocacao' | 'meio_da_luta' | 'fim_de_luta', Interacao>>;
  bigodes: { entrada: string; acerto: string[]; erro: string[]; vitoria: string; derrota: string };
}
export const PROTAGONISTA = 'Yasmim';
export const FALAS: Record<string, FalasIlha> = {
 "srag": {
  "vilao": "Dragão Hipoxêmico",
  "ilha": "Pico do Dragão Hipoxêmico",
  "deboche": [
   "Venturi é um dos meus maiores inimigos… Você acaba de entrar para a lista, sua espertinha!",
   "Não confunda minha baixa saturação com baixa autoestima, mocinha!",
   "Minha complacência pulmonar é baixa. Minha tolerância a você é ainda menor.",
   "Ai de você colocar uma VNI em mim… AI DE VOCÊ!"
  ],
  "surto": [
   "COMO OUSA ME CHAMAR DE HIPERCÁPNICO?! Isso é uma ofensa à minha espécie!",
   "PARE DE INTERPRETAR MINHA GASOMETRIA! Cuide da sua vida!",
   "ME DEIXA DESSATURAR EM PAZ!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Você está soltando fumaça ou pedindo oxigênio?",
    "vilao": "Minhas narinas não são assunto seu, sua espertinha!",
    "bigodes": "É fumaça. E muito teatro para uma gasometria só."
   },
   "provocacao": {
    "yas": "Você sempre recebe visitas assim?",
    "vilao": "Só as que eu pretendo deixar sem fôlego.",
    "bigodes": "Ótimo. Uma recepção calorosa e uma saturação péssima."
   },
   "meio_da_luta": {
    "yas": "Você ficou vermelho. É raiva?",
    "vilao": "É DIGNIDADE FERIDA!",
    "bigodes": "E eu pensando que era sinal clínico novo."
   },
   "fim_de_luta": {
    "yas": "Acho que já conheço suas fraquezas.",
    "vilao": "NÃO TENHO FRAQUEZAS! Tenho… peculiaridades ventilatórias.",
    "bigodes": "Chame como quiser. Eu chamo de oportunidade."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Pico do Dragão Hipoxêmico. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "ir": {
  "vilao": "Saturaldo",
  "ilha": "Vale do Fôlego Perdido",
  "deboche": [
   "Insuficiência respiratória?! Insuficiente é a sua educação, mocinha!",
   "Meu CO₂ está acumulado. Meu rancor por você também.",
   "Você tem alguma obsessão pela minha gasometria? Que inconveniente!",
   "Retentor de CO₂, sim. Retentor de desaforos, JAMAIS!",
   "Minha frequência respiratória aumentou só de olhar para a sua cara!",
   "Você devia cuidar mais da sua vida e menos da minha PaCO₂!",
   "Eu roubo o fôlego das pessoas há séculos! Quem você pensa que é?"
  ],
  "surto": [
   "ERA SÓ O QUE ME FALTAVA! Uma interna querendo mandar na minha respiração!",
   "NÃO ENCOSTE NO MEU CATETER, SUA ESPERTINHA!",
   "INTUBAÇÃO?! Nem pense nisso! Ainda não terminei de discutir com você!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "É você que anda roubando o ar do vale?",
    "vilao": "Roubando? Eu prefiro o termo 'redistribuição não autorizada'.",
    "bigodes": "Bonito. O crime agora tem nome fisiológico."
   },
   "provocacao": {
    "yas": "Você vive falando de CO₂, né?",
    "vilao": "FALE BAIXO! Estou tentando acumular uma coleção.",
    "bigodes": "Uma coleção que ninguém pediu, diga-se."
   },
   "meio_da_luta": {
    "yas": "E se eu trouxer oximetria?",
    "vilao": "Outra intrometida na minha vida privada!",
    "bigodes": "O monitor só está contando o que você aprontou."
   },
   "fim_de_luta": {
    "yas": "Não parece que está gostando da visita.",
    "vilao": "Eu gostaria mais se vocês parassem de respirar tão bem.",
    "bigodes": "Vamos tentar estragar os planos dele, então."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Vale do Fôlego Perdido. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "acido": {
  "vilao": "pHantasminha",
  "ilha": "Laboratório do Alquimista do pH",
  "deboche": [
   "Uma pitadinha de ácido aqui, um pouquinho de bicarbonato a menos ali… Uma verdadeira obra de arte!",
   "Essa fórmula de Winter… Nunca gostei desse sujeito!",
   "Eu passei horas desequilibrando esse pH! Tenha um pouco de consideração!",
   "Distúrbio misto?! Sim, sou um artista bastante versátil.",
   "Lá vem a fiscal do bicarbonato… Já estava demorando!",
   "Ai de você calcular o meu ânion gap… Eu tenho segredos que precisam ser preservados!",
   "Acidose metabólica é minha especialidade. Causar sofrimento acadêmico é meu passatempo.",
   "Um pH normal é uma das coisas mais entediantes que existem.",
   "Primeiro você descobre minha acidose, depois minha alcalose… Não posso ter um único segredo nessa relação?",
   "Eu tinha planos malignos até esses pulmões resolverem hiperventilar!",
   "Não me venha com Henderson-Hasselbalch! Já tenho inimigos suficientes!",
   "BUUUUU! Que susto! Achei que você não fosse descobrir minha acidose fantasma!",
   "Halloween dura uma noite. Meus distúrbios mistos assombram o ano inteiro.",
   "Quem disse que fantasma não tem pH? BUUU! Tenho, e está péssimo!",
   "Você quer me exorcizar com a fórmula de Winter? Que falta de respeito!",
   "Eu ia aparecer no seu pesadelo… mas você apareceu na minha gasometria.",
   "HUUUU… Um bicarbonato sumiu! Mistério? Não, fui eu!"
  ],
  "surto": [
   "NÃO OUSE COMPENSAR A MINHA ACIDOSE, SUA ESPERTINHA!",
   "RINS TRAIDORES! Quem autorizou essa compensação?!",
   "COMO ASSIM O DISTÚRBIO É COMPENSADO?! Eu exijo que ele fique descompensado!",
   "NÃO ACENDA ESSA LUZ! MEU ÂNION GAP GOSTA DE MISTÉRIOS!",
   "ME DEIXE ASSOMBRAR ESSA COMPENSAÇÃO EM PAZ!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Esse corredor está gelado. Bigodes, você viu alguma coisa?",
    "vilao": "BUUUUU! Eu sou o pHantasminha! O terror das gasometrias!",
    "bigodes": "Fantasma com laboratório próprio. Era só o que faltava."
   },
   "provocacao": {
    "yas": "Você está tentando me assustar com esse bicarbonato?",
    "vilao": "NÃO! Quer dizer… BUUU! Minha surpresa dependia de você não olhar o resultado!",
    "bigodes": "O susto foi convincente. A interpretação, nem tanto."
   },
   "meio_da_luta": {
    "yas": "Seu lençol está tremendo. Está com medo?",
    "vilao": "É O VENTO DO ALÉM! NÃO É MEDO!",
    "bigodes": "Claro. O além aparentemente tem ansiedade de desempenho."
   },
   "fim_de_luta": {
    "yas": "Acho que seu castelo está ficando menos assustador.",
    "vilao": "NÃO APAGUE MINHAS VELAS! EU PRECISO DE AMBIÊNCIA!",
    "bigodes": "Acabou a encenação. Próxima sala."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Laboratório do Alquimista do pH. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "vm": {
  "vilao": "PEEP Vader",
  "ilha": "Fortaleza das Engrenagens de Ar",
  "deboche": [
   "Um barotrauma de vez em quando… Qual o problema? Todo mundo precisa de um hobby!",
   "Eu estava preparando um pneumotórax tão bonito… Você não tem coração, mocinha!",
   "Auto-PEEP é uma das minhas maiores obras-primas. Modéstia à parte!",
   "Quem foi que te ensinou a medir pressão de platô?! Preciso ter uma conversa com essa pessoa…",
   "Desmame?! Mas eu nem terminei de causar complicações!",
   "Eu ofereço volutrauma, barotrauma e atelectrauma. Um verdadeiro pacote de benefícios!",
   "Você tem alguma coisa contra os meus pneumotórax, sua espertinha?!",
   "Ah, pronto! A fiscal da ventilação mecânica chegou!",
   "Eu aumento a pressão, você diminui… Francamente, que relacionamento tóxico!",
   "Ai de você extubar esse paciente antes de eu terminar meu trabalho…"
  ],
  "surto": [
   "NÃO ME VENHA COM VENTILAÇÃO PROTETORA, SUA DEFENSORA DE ALVÉOLOS!",
   "NÃO OUSE CORRIGIR ESSA ASSINCRONIA! Passei horas planejando isso!",
   "DEIXA EU HIPERDISTENDER UM ALVÉOLO EM PAZ!",
   "COMO OUSA MELHORAR A COMPLACÊNCIA DESSE PULMÃO?! Eu tive tanto trabalho!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "É aqui que você fabrica seus barotraumas?",
    "vilao": "Com muito cuidado! O caos também exige técnica.",
    "bigodes": "Uma fábrica de complicações. Sem alvará, imagino."
   },
   "provocacao": {
    "yas": "Você tem orgulho disso tudo?",
    "vilao": "Olhe os alarmes! É quase uma orquestra.",
    "bigodes": "Uma orquestra que só toca quando alguém fez algo errado."
   },
   "meio_da_luta": {
    "yas": "Vou conferir sua pressão de platô.",
    "vilao": "NÃO ME FISCALIZE NA MINHA PRÓPRIA FORTALEZA!",
    "bigodes": "Pronto. A pressão dele já subiu antes da do paciente."
   },
   "fim_de_luta": {
    "yas": "Parece que seu plano está falhando.",
    "vilao": "É só uma turbulência no meu projeto!",
    "bigodes": "Uma turbulência que está ficando cara para o chefão."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Fortaleza das Engrenagens de Ar. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "va": {
  "vilao": "Glotilda",
  "ilha": "Glotilda, serpente das vias aéreas",
  "deboche": [
   "Sssss… Ouviu esse estridor? É a minha música de entrada.",
   "Não é um assobio, mocinha. É um aviso em alta frequência!",
   "Ai de quem iluminar minha glote sem pedir licençsssssa!",
   "Sssss… Fechar a passagem de ar é uma arte que poucos apreciam.",
   "Você reconheceu a obstrução? Isso é uma invasão da minha privacssssidade!",
   "O sssssom está aumentando… E o meu mau humor também.",
   "Meu plano era um estridor triunfal. Você veio com oxigênio e estragou tudo.",
   "Sssss… Cuidado onde pisa. Eu conheço cada curva desta via aérea.",
   "Como ousa ouvir meus sinais? Eu tentei ser discretíssssima!"
  ],
  "surto": [
   "NÃO ME VENHA COM VIA AÉREA DEFINITIVA! EU SOU UMA COBRA DE IDEIAS LIVRES!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Esse chiado está vindo de onde?",
    "vilao": "Sssss… Da minha entrada triunfal, naturalmente.",
    "bigodes": "Entrada triunfal com via aérea estreita. Original."
   },
   "provocacao": {
    "yas": "Você está fazendo esse som de propósito?",
    "vilao": "Sssss… Posso fazer mais alto, se preferir!",
    "bigodes": "Não dê ideias."
   },
   "meio_da_luta": {
    "yas": "Sua língua está travando no S.",
    "vilao": "É CHAMADO DE ESTILO, MOCINHA!",
    "bigodes": "Acho que ela vai precisar de uma revisão de dicção."
   },
   "fim_de_luta": {
    "yas": "Parece que sua ameaça perdeu a força.",
    "vilao": "EU AINDA TENHO MUITOS SSSSS NA MANGA!",
    "bigodes": "E nenhum argumento novo, aparentemente."
   }
  },
  "bigodes": {
   "entrada": "Mais uma missão. Vamos ver o que o chefão aprontou.",
   "acerto": [
    "Correto. O plano dele durou menos que o discurso.",
    "Boa. Menos uma complicação para esta noite."
   ],
   "erro": [
    "Não funcionou. Reveja o ponto e tente outra vez.",
    "Calma. O erro está no raciocínio, não na próxima alternativa."
   ],
   "vitoria": "Missão encerrada. Continuemos.",
   "derrota": "Essa batalha não define o aprendizado. Vamos revisar."
  }
 },
 "tox": {
  "vilao": "Toxana",
  "ilha": "Pântano do Caldeirão Venenoso",
  "deboche": [
   "Uma gota de veneno, duas de confusão… e uma pitada de arrogância. Perfeito!",
   "Antídoto? Que palavra desagradável. Prefiro chamar de sabotagem à bruxaria.",
   "Fiz um caldeirão de toxinas e você aparece com uma anamnese. Falta de imaginação!",
   "O melhor das minhas poções é que nunca se sabe qual órgão vai reclamar primeiro.",
   "Tanta substância perigosa neste mundo e você insiste em escolher a conduta certa.",
   "Eu ia transformar esta emergência num mistério. Você estragou o suspense, espertinha!"
  ],
  "surto": [
   "COMO ASSIM VOCÊ RECONHECEU MINHA POÇÃO?! Nem coloquei o rótulo!",
   "NÃO ENCOSTE NO MEU CARVÃO! EU TINHA PLANOS PARA ELE!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "O que tem nesse caldeirão, Toxana?",
    "vilao": "Uma mistura absolutamente irresponsável. Minha especialidade!",
    "bigodes": "Pelo menos ela admite."
   },
   "provocacao": {
    "yas": "Sua poção tem bula?",
    "vilao": "BULA?! Eu sou uma bruxa, não uma indústria farmacêutica!",
    "bigodes": "É. Controle de qualidade não é o forte da casa."
   },
   "meio_da_luta": {
    "yas": "Essa fumaça está mudando de cor.",
    "vilao": "É O TOQUE FINAL DA MINHA OBRA!",
    "bigodes": "Ou um ótimo motivo para sair daqui."
   },
   "fim_de_luta": {
    "yas": "Acabaram as surpresas, Toxana?",
    "vilao": "AINDA TENHO UMA POÇÃO SECRETA! Onde coloquei mesmo?",
    "bigodes": "Procure com calma. Nós já vamos."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Pântano do Caldeirão Venenoso. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "lra": {
  "vilao": "Golem da Creatinina",
  "ilha": "Cavernas do Golem de Creatinina",
  "deboche": [
   "A creatinina sobe… e eu fico mais alto! HA. HA. HA!",
   "Prerrenal, renal, pós-renal… Gosto de todas! Sou um golem democrático.",
   "Hahaha… creatinina! Espera. Do que estávamos falando?",
   "Eu estava construindo uma bela oligúria. Que inconveniência a sua."
  ],
  "surto": [
   "UREIA… UREIA… UREIA… HAHAHA! CREATININAAAA!",
   "UREIA! UREIA! Não consigo parar. Nem quero.",
   "COMO OUSA INVESTIGAR MINHA CREATININA?! EU A CULTIVEI COM CARINHO!",
   "NÃO ME VENHA COM ESSE PAPO DE DIURESE! MINHA PEDRA, MINHAS REGRAS!",
   "UREIA… UREIA… Quem é você mesmo? Ah, a espertinha do rim!",
   "CREATININAAAA! É meu nome favorito depois do meu próprio."
  ],
  "interacoes": {
   "entrada": {
    "yas": "Ele está falando alguma coisa?",
    "vilao": "UREIA! UREIA! CREATININAAAA! HAHAHA!",
    "bigodes": "Comunicação limitada, entusiasmo excessivo."
   },
   "provocacao": {
    "yas": "Você sabe outra palavra?",
    "vilao": "CREATININA! …UREIA!",
    "bigodes": "Quase um discurso de formatura."
   },
   "meio_da_luta": {
    "yas": "Ele está rindo do quê?",
    "vilao": "HAHAHA! MINHA CREATININA SUBIU!",
    "bigodes": "Excelente. O próprio vilão fornece a evolução."
   },
   "fim_de_luta": {
    "yas": "Golem, acabou.",
    "vilao": "UREIA…? Ureia…",
    "bigodes": "Pela primeira vez, uma pausa produtiva."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Cavernas do Golem de Creatinina. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "pcr": {
  "vilao": "Robô Sem Pulso",
  "ilha": "Ilha do Coração Parado",
  "deboche": [],
  "surto": [
   "SISTEMA INICIADO. PULSO: NÃO ENCONTRADO. MALDADE: 100%.",
   "BIP. BIP. ALERTA: ESTUDANTE EXCESSIVAMENTE PREPARADA.",
   "PROTOCOLANDO DERROTA… ERRO. ERRO. ERRO.",
   "VOCÊ INTERROMPEU MINHA ASSISTOLIA PERFEITA. REINICIANDO INDIGNAÇÃO.",
   "COMANDO NÃO RECONHECIDO: DESISTIR. BIP.",
   "ANALISANDO… RITMO… ANALISANDO… OFENSA PESSOAL DETECTADA.",
   "BATERIA FRACA. EGO: DANIFICADO. HA. HA… HA?",
   "FALHA CRÍTICA: A ES- PER- TI- NHA SABE O QUE ESTÁ FAZENDO.",
   "NÃO TOQUE NO BOTÃO VERMELHO. É O MEU FAVORITO.",
   "REINICIALIZAÇÃO NECESSÁRIA. NÃO POR MINHA CULPA. BIP."
  ],
  "interacoes": {
   "entrada": {
    "yas": "Bigodes, esse robô está desligado?",
    "vilao": "INICIALIZANDO. PULSO: AUSENTE. HUMOR: MALIGNO.",
    "bigodes": "O diagnóstico vem com legenda. Conveniente."
   },
   "provocacao": {
    "yas": "Você fala sempre assim?",
    "vilao": "CONFIRMAÇÃO. PERSONALIDADE INSTALADA NA VERSÃO 1.0.",
    "bigodes": "E nunca recebeu atualização."
   },
   "meio_da_luta": {
    "yas": "Acho que ele travou.",
    "vilao": "ERRO. ERRO. MINHA MALDADE NÃO TRAVA.",
    "bigodes": "O vocabulário, sim."
   },
   "fim_de_luta": {
    "yas": "Podemos encerrar o sistema?",
    "vilao": "NEGATIVO. EU EXIJO… BIP… REINÍCIO…",
    "bigodes": "Pedido negado."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Ilha do Coração Parado. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "dva": {
  "vilao": "Noradrenalinda",
  "ilha": "Vulcão das Pressões",
  "deboche": [
   "Querida, pressão alta não é defeito. É presença de palco. 💅",
   "Minha perfusão é impecável. Minha humildade, opcional.",
   "Como ousa titular minha dose sem consultar minha equipe de beleza?!",
   "Ai, que deselegante… alguém mencionou hipotensão na minha presença.",
   "Minha pressão é uma diva. Não aceita qualquer número.",
   "Se a pressão despencar, é drama. Se subir, é protagonismo.",
   "Você ajustou a bomba? Querida, eu mesma deveria ser a dona da UTI.",
   "Meu choque foi planejado para causar impacto. Literalmente. 💅"
  ],
  "surto": [
   "EU NÃO ESTOU VASOCONSTRITA. ESTOU EM MINHA FASE EXCLUSIVA!",
   "NÃO CONFUNDA MINHA POTÊNCIA COM EXCESSO DE PERSONALIDADE, MOCINHA!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Noradrenalinda, você está se admirando no monitor?",
    "vilao": "Querida, se a pressão é minha, a estrela também sou eu. 💅",
    "bigodes": "Autoconfiança definitivamente não está em falta."
   },
   "provocacao": {
    "yas": "Esse brilho todo é necessário?",
    "vilao": "É glamour hemodinâmico, querida. Você não entenderia.",
    "bigodes": "Não pretendia entender."
   },
   "meio_da_luta": {
    "yas": "Seu salto está tremendo, diva.",
    "vilao": "MEU SALTO NÃO TREME. O CHÃO É QUE ESTÁ INSTÁVEL!",
    "bigodes": "Sempre uma explicação conveniente."
   },
   "fim_de_luta": {
    "yas": "Acho que a apresentação acabou.",
    "vilao": "NÃO ACABOU! EU AINDA TENHO UM ÚLTIMO CLOSE!",
    "bigodes": "Sem bis. Obrigado."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Vulcão das Pressões. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "ad": {
  "vilao": "Polvo Serotoninérgico",
  "ilha": "Recife do Polvo Serotonina",
  "deboche": [
   "São oito braços e nenhum deles consegue segurar meu plano. Que situação!",
   "Eu ia provocar um caos serotoninérgico, mas me distraí com um peixinho.",
   "Sou um gênio do fundo do mar. Às vezes esqueço de qual mar.",
   "Minha serotonina está toda animada! Eu também! Por quê, mesmo?",
   "Eu ia fazer uma entrada dramática… tropecei no terceiro tentáculo.",
   "Alguém viu meu antídoto? NÃO! Quer dizer, meu plano maligno!",
   "Você não pode me derrotar. Ainda faltam seis tentáculos para contar!",
   "Se eu me abraçar com os oito braços, isso conta como contenção?"
  ],
  "surto": [
   "COMO ASSIM VOCÊ DESFEZ MEU PLANO?! Eu tinha escrito em… espera, em qual tentáculo?",
   "NÃO VALE! Você usou raciocínio clínico e eu só trouxe oito mãos!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Por que há oito braços presos na mesma porta?",
    "vilao": "Eu tentei entrar de maneira ameaçadora. Foi mal.",
    "bigodes": "A ameaça ficou do lado de fora."
   },
   "provocacao": {
    "yas": "Qual é seu plano desta vez?",
    "vilao": "É brilhante! Só preciso lembrar… qual tentáculo guardou.",
    "bigodes": "Nós podemos prosseguir sem ele."
   },
   "meio_da_luta": {
    "yas": "Você está amarrado em si mesmo.",
    "vilao": "É UMA ESTRATÉGIA!… Acho.",
    "bigodes": "Criativa, mas pouco funcional."
   },
   "fim_de_luta": {
    "yas": "Você quer ajuda para sair daí?",
    "vilao": "Sim! Quer dizer, NÃO! SOU UM VILÃO!",
    "bigodes": "Uma decisão por vez."
   }
  },
  "bigodes": {
   "entrada": "Bem-vinda a Recife do Polvo Serotonina. Primeiro observamos o problema; depois estragamos o plano do chefão.",
   "acerto": [
    "Boa. Ele perdeu HP e um pouco da pose.",
    "Essa doeu mais no orgulho do que no HP.",
    "O vilão queria complicações. Você apresentou raciocínio clínico."
   ],
   "erro": [
    "Essa ele ganhou. Vamos olhar o raciocínio, não decorar uma letra.",
    "O chefão conseguiu nos confundir. Abra o post-it do tópico e retome."
   ],
   "vitoria": "Missão concluída. O vilão vai precisar de uma boa dose de humildade.",
   "derrota": "O chefão ganhou esta rodada, não o tema. Revise o tópico e volte."
  }
 },
 "ep": {
  "vilao": "Tempestoso",
  "ilha": "Tempestoso, tempestade de emoções",
  "deboche": [
   "Hoje estou tranquilo… NÃO, NÃO ESTOU! TROVÕES!",
   "Eu tinha uma nuvem cinzenta perfeitamente organizada. Agora está tudo bagunçado.",
   "Meu humor mudou três vezes nesta frase. A previsão segue instável.",
   "Você quer atravessar minha tempestade com uma avaliação clínica? Que audácia!",
   "Eu estava no auge do meu discurso dramático. Precisa mesmo interromper?",
   "Não confunda meus trovões com argumentos. Às vezes nem eu acompanho.",
   "Mais uma intervenção sensata? Nem a meteorologia previu essa.",
   "Minha tempestade não é decoração. É um evento atmosférico de proporções épicas!"
  ],
  "surto": [
   "UM RAIO! UM PENSAMENTO! NÃO, DOIS! Ah, que confusão!",
   "ACHO QUE ESTOU INVENCÍVEL! …Ou talvez precise ficar sozinho sob esta nuvem."
  ],
  "interacoes": {
   "entrada": {
    "yas": "Está chovendo dentro da sala?",
    "vilao": "EU SOU O TEMPESTOSO!… Desculpe, hoje o céu está difícil.",
    "bigodes": "Vamos reduzir o barulho e entender o que está acontecendo."
   },
   "provocacao": {
    "yas": "Esse trovão foi uma ameaça ou um desabafo?",
    "vilao": "Os dois! NÃO… talvez só uma previsão ruim.",
    "bigodes": "Previsões não são diagnósticos."
   },
   "meio_da_luta": {
    "yas": "A tempestade mudou de direção.",
    "vilao": "EU MUDEI DE IDEIA! O CÉU ACOMPANHOU!",
    "bigodes": "Ao menos o clima é coerente com a decoração."
   },
   "fim_de_luta": {
    "yas": "Acho que podemos diminuir os trovões.",
    "vilao": "Talvez… sem perder minha grandiosidade?",
    "bigodes": "Grandiosidade não exige decibéis."
   }
  },
  "bigodes": {
   "entrada": "Mais uma missão. Vamos ver o que o chefão aprontou.",
   "acerto": [
    "Correto. O plano dele durou menos que o discurso.",
    "Boa. Menos uma complicação para esta noite."
   ],
   "erro": [
    "Não funcionou. Reveja o ponto e tente outra vez.",
    "Calma. O erro está no raciocínio, não na próxima alternativa."
   ],
   "vitoria": "Missão encerrada. Continuemos.",
   "derrota": "Essa batalha não define o aprendizado. Vamos revisar."
  }
 },
 "pp": {
  "vilao": "Espelho Distorcente",
  "ilha": "Espelho Distorcente, mestre das aparências",
  "deboche": [
   "Você viu uma resposta. Eu vi sete interpretações. Todas tortas, naturalmente.",
   "Não minto, mocinha. Apenas ofereço reflexos criativamente inexatos.",
   "O que é realidade? Neste espelho, depende do ângulo.",
   "Troquei a imagem, embaralhei o sentido… e você ainda reconheceu o fenômeno?",
   "Sua certeza tem uma rachadura. Posso ampliá-la, se quiser.",
   "Ora, ora… Um pensamento se olhando no espelho e achando que é percepção.",
   "O reflexo diz uma coisa. Eu digo outra. Quem disse que devo ser coerente?",
   "Até meu espelho está ofendido com tanta precisão conceitual."
  ],
  "surto": [
   "VOCÊ NÃO PODE SIMPLESMENTE DISTINGUIR ESSAS ALTERAÇÕES! É MEU TRABALHO CONFUNDIR!",
   "NÃO OLHE TÃO DE PERTO! MINHAS DISTORÇÕES PERDEM O CHARME!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Esse reflexo não parece comigo.",
    "vilao": "Exatamente! Eu aperfeiçoei as distorções.",
    "bigodes": "Um espelho que reprova fidelidade. Interessante."
   },
   "provocacao": {
    "yas": "Você está tentando mudar o que eu disse?",
    "vilao": "Mudar? Prefiro reinterpretar a seu desfavor.",
    "bigodes": "Ao menos é transparente sobre o método."
   },
   "meio_da_luta": {
    "yas": "Seu reflexo está falhando.",
    "vilao": "NÃO ESTÁ FALHANDO! É UMA REALIDADE ALTERNATIVA!",
    "bigodes": "Conveniente. E inteiramente não verificável."
   },
   "fim_de_luta": {
    "yas": "Vejo você com mais clareza agora.",
    "vilao": "ENTÃO PARE DE OLHAR!",
    "bigodes": "Concordo. Já vi o suficiente."
   }
  },
  "bigodes": {
   "entrada": "Mais uma missão. Vamos ver o que o chefão aprontou.",
   "acerto": [
    "Correto. O plano dele durou menos que o discurso.",
    "Boa. Menos uma complicação para esta noite."
   ],
   "erro": [
    "Não funcionou. Reveja o ponto e tente outra vez.",
    "Calma. O erro está no raciocínio, não na próxima alternativa."
   ],
   "vitoria": "Missão encerrada. Continuemos.",
   "derrota": "Essa batalha não define o aprendizado. Vamos revisar."
  }
 },
 "psi": {
  "vilao": "Rei das Vozes",
  "ilha": "Rei das Vozes, monarca interrompido",
  "deboche": [
   "Por decreto real, ninguém mais me interrompe. VOCÊS AÍ TAMBÉM NÃO!",
   "Eu ordenei uma cerimônia… mas há vozes discordando do protocolo.",
   "Escute! Ou melhor, não escute. Isso era uma conversa privada.",
   "Um rei deve ser ouvido. O problema é que eu escuto mais do que pedi.",
   "Você identificou meu truque? Silêncio! Preciso consultar o conselho invisível.",
   "A coroa é minha. As interrupções, infelizmente, parecem públicas.",
   "Eu estava fazendo um pronunciamento brilhante… Onde foi que parei?"
  ],
  "surto": [
   "SILÊNCIO! O REI VAI FALAR! …Quem disse que eu já terminei?",
   "NÃO DISCUTA COMIGO, MOCINHA! Já tenho opiniões demais nesta sala.",
   "TRÊS MINISTROS FALANDO AO MESMO TEMPO! E EU NEM TENHO MINISTROS!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Majestade, podemos conversar?",
    "vilao": "SIM! …Não, quem disse não? SILÊNCIO, ESTOU FALANDO!",
    "bigodes": "A audiência real está bastante tumultuada."
   },
   "provocacao": {
    "yas": "O conselho está reunido?",
    "vilao": "ESTÁ!… Não, não olhe para lá. Eles não gostam.",
    "bigodes": "Vamos nos concentrar no que conseguimos observar."
   },
   "meio_da_luta": {
    "yas": "Você perdeu o fio do discurso.",
    "vilao": "NÃO PERDI! ESTOU OUVINDO… quer dizer, pensando.",
    "bigodes": "Pode concluir. Sem pressa."
   },
   "fim_de_luta": {
    "yas": "A coroa continua sua. A batalha acabou.",
    "vilao": "E AS VOZES?… Silêncio, já entendi!",
    "bigodes": "Pelo menos um acordo foi possível."
   }
  },
  "bigodes": {
   "entrada": "Mais uma missão. Vamos ver o que o chefão aprontou.",
   "acerto": [
    "Correto. O plano dele durou menos que o discurso.",
    "Boa. Menos uma complicação para esta noite."
   ],
   "erro": [
    "Não funcionou. Reveja o ponto e tente outra vez.",
    "Calma. O erro está no raciocínio, não na próxima alternativa."
   ],
   "vitoria": "Missão encerrada. Continuemos.",
   "derrota": "Essa batalha não define o aprendizado. Vamos revisar."
  }
 },
 "pal": {
  "vilao": "Guardiã Guerreira",
  "ilha": "Guardiã Guerreira, guardiã da última travessia",
  "deboche": [
   "Você chama de recuo. Eu chamo de uma batalha cuja coragem ainda não compreendeu.",
   "Nem toda espada precisa ser desembainhada. Mas eu ainda não decidi guardar a minha.",
   "Eu protejo esta passagem. Não confunda firmeza com crueldade.",
   "Passei eras medindo força em golpes. Você insiste em medir dignidade.",
   "Seu raciocínio é sereno. Irritantemente sereno.",
   "Eu não temo o fim de uma batalha. Temo que alguém esqueça quem estamos protegendo.",
   "Talvez a maior coragem seja baixar a espada. NÃO SE ACOSTUME A ME OUVIR DIZER ISSO.",
   "Você não venceu pela força, mocinha. Isso me deixa sem um argumento.",
   "Há vitórias silenciosas. Ainda estou aprendendo a reconhecê-las."
  ],
  "surto": [
   "COMO ASSIM O CONFORTO TAMBÉM PODE SER UMA VITÓRIA?!"
  ],
  "interacoes": {
   "entrada": {
    "yas": "Guardiã, por que empunha essa espada?",
    "vilao": "Protejo uma travessia que ninguém atravessa sozinho.",
    "bigodes": "Então já temos um ponto em comum."
   },
   "provocacao": {
    "yas": "E se a melhor decisão não exigir luta?",
    "vilao": "Uma guerreira sem batalha? Você pede muito.",
    "bigodes": "Às vezes é a batalha que exige menos de nós."
   },
   "meio_da_luta": {
    "yas": "Você parece estar pensando.",
    "vilao": "Talvez a força tenha outras formas. Não me interrompa.",
    "bigodes": "Finalmente, um silêncio útil."
   },
   "fim_de_luta": {
    "yas": "Podemos guardar a espada agora?",
    "vilao": "Talvez. Se for para proteger a dignidade, sim.",
    "bigodes": "Uma decisão melhor que qualquer golpe."
   }
  },
  "bigodes": {
   "entrada": "Mais uma missão. Vamos ver o que o chefão aprontou.",
   "acerto": [
    "Correto. O plano dele durou menos que o discurso.",
    "Boa. Menos uma complicação para esta noite."
   ],
   "erro": [
    "Não funcionou. Reveja o ponto e tente outra vez.",
    "Calma. O erro está no raciocínio, não na próxima alternativa."
   ],
   "vitoria": "Missão encerrada. Continuemos.",
   "derrota": "Essa batalha não define o aprendizado. Vamos revisar."
  }
 }
};
