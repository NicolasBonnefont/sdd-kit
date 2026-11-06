#!/usr/bin/env node
'use strict';

// Porta de entrada via npx. Não instala nada por conta própria: garante um clone
// em local estável e delega ao install.js, que é a única implementação.
//
// O clone estável é obrigatório. O npx executa o pacote a partir de um diretório
// temporário, e as skills são instaladas por link — apontar para o temporário
// deixaria tudo quebrado assim que o npm limpasse o cache.

const { execFileSync, spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { homedir } = require('node:os');
const { join } = require('node:path');

// HTTPS porque o repositório é público: clonar por SSH exigiria chave configurada, o que
// costuma faltar numa máquina Windows nova.
const REPO = process.env.SDD_KIT_REPO || 'https://github.com/NicolasBonnefont/sdd-kit.git';
const HOME = process.env.SDD_KIT_HOME || join(homedir(), 'sdd-kit');

const run = (cmd, args, opts = {}) =>
    execFileSync(cmd, args, { stdio: 'inherit', ...opts });

function ensureClone() {
    if (existsSync(join(HOME, '.git'))) {
        try {
            run('git', ['-C', HOME, 'pull', '--ff-only', '--quiet']);
        } catch {
            console.error(`  Não consegui atualizar ${HOME}; seguindo com a versão local.`);
        }
        return;
    }

    console.log(`  Clonando ${REPO}`);
    console.log(`  em ${HOME}`);
    run('git', ['clone', '--quiet', REPO, HOME]);
}

function main() {
    try {
        execFileSync('git', ['--version'], { stdio: 'ignore' });
    } catch {
        console.error('  git é necessário e não foi encontrado no PATH.');
        process.exit(1);
    }

    ensureClone();

    const installer = join(HOME, 'install.js');
    if (!existsSync(installer)) {
        console.error(`  ${HOME} está numa versão antiga e não consegui atualizar.`);
        console.error('  Atualize esse clone com git pull e rode de novo.');
        process.exit(1);
    }

    const result = spawnSync(process.execPath, [installer, ...process.argv.slice(2)], {
        stdio: 'inherit',
    });
    process.exit(result.status === null ? 1 : result.status);
}

main();
