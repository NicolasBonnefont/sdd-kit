'use strict';

// Conventional Commits — https://www.conventionalcommits.org
//
// O limite de 100 caracteres no header já vem do config-conventional. Está repetido
// aqui de propósito: é a regra que o time combinou, então fica explícita no repositório
// em vez de escondida numa dependência.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
  },
};
