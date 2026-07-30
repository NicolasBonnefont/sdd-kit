# Gabarito do Module Pack

Referência descarregada de [`SKILL.md`](SKILL.md). São cinco seções, teto de **200
linhas**. Pack curto é pack lido; pack lido é pack que protege.

Quando o conteúdo estourar o teto, o módulo é grande demais — registre isso no próprio
pack como achado.

## 1. Fronteira

O que este módulo é dono. E, com o mesmo peso, o que pertence a outro lugar apesar de
parecer dele — é essa metade que evita mudança no módulo errado.

## 2. Regras de negócio e invariantes

Cada invariante é uma frase declarativa do que permanece verdadeiro, escrita na
linguagem do domínio.

**Ancore em código real, com caminho e linha.** A âncora é o que torna a invariante
verificável por quem vier depois:

> Um pedido sem itens permanece não faturável — `.../validators/order-has-items.validator.ts:18`

## 3. Padrão canônico

**Aponte um arquivo de referência real.** "Copie a estrutura de X" carrega mais
informação que três parágrafos de prosa.

Quando o módulo segue um padrão diferente do de referência do repositório, diga qual é o
dele. O revisor precisa saber contra o que comparar, e consistência com o código ao redor
é o critério que vale em código legado.

## 4. Blast radius

Quem consome o módulo e o que muda junto. É a seção que mais evita regressão — invista
nela.

Cubra:

- **Consumidores diretos**, com caminho
- **Contratos que atravessam processo**: eventos, filas, endpoints, dados compartilhados com outro serviço
- **Pontos de registro**: os arquivos que precisam ser editados para uma funcionalidade nova aparecer — registro de rota, de menu, de módulo, de permissão. São os mais fáceis de esquecer; liste todos
- **Onde mora a condicional**, quando o módulo varia por flag, permissão ou cliente

## 5. Armadilhas

As gambiarras e **o porquê** delas. O porquê é o que faz o próximo agente preservar a
gambiarra em vez de "consertar" e quebrar produção.

## Critério de conclusão

O pack está pronto quando as cinco seções existem, **cada invariante tem âncora que
resolve**, e o blast radius lista consumidor e ponto de registro com caminho.

Seção que você não conseguiu preencher com o que verificou fica declarada como não
verificada — os revisores tratam este arquivo como verdade.
