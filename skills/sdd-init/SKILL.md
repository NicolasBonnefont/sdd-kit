---
name: sdd-init
description: Prepara um repositório para o ciclo SDD — inspeciona o projeto, escreve o AGENTS.md da raiz e cria a estrutura de specs. Rode uma vez por repositório.
compatibility: Requer git e bash
disable-model-invocation: true
---

# /sdd-init

Coloca um repositório novo dentro do ciclo. Roda uma vez, e o entregável principal é o
**`AGENTS.md` da raiz** — a constituição do projeto, de onde todas as skills e todos os
revisores tiram os fatos.

Este comando é o que torna o ferramental utilizável por qualquer time, em qualquer
projeto. O ferramental não sabe nada sobre o produto: quem sabe é o arquivo que você
vai escrever aqui.

## Passo 1 — investigue, não pergunte

Descubra sozinho o que der. Só pergunte o que o repositório não revela.

**Stack e comandos**
- Manifesto de dependências: `package.json`, `composer.json`, `pyproject.toml`, `go.mod`, `Gemfile`, `pom.xml`, `Cargo.toml`
- Qual é o comando de teste **de verdade**? Rode-o. Script declarado pode estar quebrado
- Comando de lint, de build, de subir em desenvolvimento
- Versão de linguagem fixada: `.nvmrc`, `.tool-versions`, `.python-version`

**Rede de segurança** — o fato mais importante do arquivo
- Quantos arquivos de teste existem, contra quantos de código?
- Existe relatório de cobertura? Qual o número real?
- Os thresholds estão ativos ou comentados?
- Os hooks de pre-commit realmente executam? Formato antigo de husky sob versão nova não roda

**Arquitetura**
- Diretórios de primeiro e segundo nível de `src/` ou equivalente
- Existe mais de um estilo arquitetural convivendo? Se existe, qual é o de referência para código novo e onde está o melhor exemplar dele
- Onde ficam entidades, rotas, configuração

**Fronteiras**
- O projeto compartilha banco, fila ou cache com outro serviço?
- Publica ou consome evento? Onde está o contrato?
- Quem consome a API dele?

**Processo**
- Branch base real: `git symbolic-ref refs/remotes/origin/HEAD`
- Padrão de nome de branch nos últimos 30 commits
- Template de PR, se houver
- CI: o que roda de fato? `include` de outro repositório significa que você **não sabe** — diga que não sabe, não invente

**Riscos**
- Os dez maiores arquivos. Concentração de tamanho é concentração de risco
- Divergências entre a documentação existente e o código. **Registre cada uma** — é o achado mais valioso desta etapa, porque documentação errada faz agente gerar código quebrado

Encontrando material sensível — `.env` e variantes, chave, certificado, dump de banco,
fixture com dado real de pessoa —, reporte o caminho e siga sem o conteúdo.

## Passo 2 — escreva o `AGENTS.md` da raiz

**Leia [`AGENTS-FORMAT.md`](AGENTS-FORMAT.md) e siga o gabarito.** Ele traz as oito seções,
o teto de tamanho e as notas de preenchimento.

## Passo 3 — estrutura de specs

Crie o diretório de specs com um `.gitkeep`. O padrão é `docs/specs/`.

Se o time usa outra convenção, crie um `.sdd.json` na raiz. Todas as chaves são
opcionais e só existem para sobrescrever a detecção automática:

```json
{
  "specsDir": "docs/specs",
  "baseBranch": "main",
  "formatCommand": "make fmt"
}
```

Não crie o arquivo se os padrões servem. Configuração vazia é ruído.

Nada precisa ser configurado para o nome das branches: o ferramental casa o spec com a
branch por correspondência de nome, então `915-auditoria`, `feat/ABC-123-tela` e
`JIRA-456/ajuste` funcionam sem ajuste.

## Passo 4 — reporte e pergunte

Liste, nesta ordem:

1. O que você escreveu no `AGENTS.md`
2. **O que não conseguiu determinar** e precisa de resposta humana — tipicamente as fronteiras com outros sistemas e o que o CI realmente executa
3. As divergências entre documentação e código que encontrou
4. Quais módulos são os melhores candidatos ao primeiro `/sdd-pack`, e por quê

Peça revisão do `AGENTS.md` antes de commitar. Ele vira fonte de verdade para todo
agente que tocar o projeto: errado, propaga erro em escala.

## Ao terminar

O caminho a partir daqui é `/sdd-pack` no módulo de maior movimento, depois `/sdd-spec` no
próximo card. **Não tente documentar todos os módulos de uma vez.** A cobertura cresce
mudança a mudança; tentativa de documentar tudo de uma vez é exatamente o que costuma
morrer pela metade.
