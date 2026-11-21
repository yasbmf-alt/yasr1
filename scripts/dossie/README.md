# Dossiês do Yas Quest

Converte os PDFs "YAS QUEST · DOSSIÊ DA MISSÃO" num pacote JSON que o **⚓ Porto** importa.
O app não usa IA: o pacote traz o conteúdo pronto e ligado às questões já cadastradas.

```bash
pip install pdfplumber          # e o poppler-utils (pdftotext)
python3 scripts/dossie/converter.py saida.json banco_de_questoes.json DOSSIE1.pdf DOSSIE2.pdf ...
```

O conversor confere se cada questão citada no mapa existe no banco e é do mesmo tema, e se
cada cartão citado existe. Os avisos saem no terminal.

## Formato (`tipo: "yq-dossies"`)

```jsonc
{ "tipo": "yq-dossies", "versao": 1, "dossies": [ {
  "tema": "PCR: BLS, ACLS e PALS",          // um dos 14 temas (ilhas)
  "ilha": "Ilha do Coração Parado",
  "resumo": [ { "titulo": "…", "zona": "conduta", "blocos": [
      { "t": "p", "texto": "…" }, { "t": "li", "nivel": 2, "texto": "…" },
      { "t": "h", "texto": "subtítulo" }, { "t": "tabela", "cab": ["…"], "linhas": [["…"]] } ] } ],
  "story": ["parágrafo", "…"],
  "dialogos": { "apresentacao": [], "problema": [], "preparacao": [], "transicao": [], "acerto": [], "erro": [],
                "erroRepetido": [ { "subtopico": "…", "fala": "…", "cartoes": ["PC05"] } ],
                "durante": [], "derrota": [], "vitoria": [], "recuperacao": [] },
  "flashcards": [ { "id": "PC01", "subtopico": "…", "pergunta": "…", "resposta": "…", "zonas": ["conduta"] } ],
  "mapa": { "subtopicos": { "…": ["PC01"] }, "zonas": { "conduta": ["PC01"] },
            "questoes": { "uesm-a-001": { "cartoes": ["PC11"], "assunto": "…" } } },
  "referencias": ["…"]
} ] }
```

Também dá para escrever um dossiê à mão nesse formato, sem PDF.

## Onde cada parte aparece

| Parte | No jogo |
|---|---|
| `dialogos.apresentacao` + `story` | 📜 Chamado (com "pular história") |
| `resumo` + `dialogos.preparacao` | 📖 Dojo, antes da Arena |
| `transicao`, `acerto`, `erro`, `erroRepetido`, `durante`, `problema`, `vitoria`, `derrota` | ⚔️ Arena e 👑 Chefão; cada fala só aparece quando combina com a questão |
| `flashcards` | FSRS (baralho da ilha), com id fixo: reimportar não duplica nem perde a revisão |
| `mapa.questoes` (ou `mapa.zonas`) + `recuperacao` | 🩹 Cicatrizes: recuperação direcionada às questões erradas |

O conteúdo dos dossiês não fica no repositório (o app é público): ele vive nos seus dados.
