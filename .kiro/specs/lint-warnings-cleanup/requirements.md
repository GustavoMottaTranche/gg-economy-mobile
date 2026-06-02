# Lint Warnings Cleanup

## Overview

Eliminar todos os 69 warnings de lint do projeto gg-economy-mobile, aplicando a política de zero warnings.

## Requirements

1. TODAS as variáveis não usadas (`@typescript-eslint/no-unused-vars`) devem ser removidas ou prefixadas com `_`.
2. TODOS os hooks com dependências faltando (`react-hooks/exhaustive-deps`) devem ter suas dependências corrigidas.
3. TODOS os hooks chamados condicionalmente (`react-hooks/rules-of-hooks`) devem ser refatorados para chamada incondicional.
4. O comando `npm run lint` deve retornar 0 errors E 0 warnings após a conclusão.
5. Todos os testes existentes devem continuar passando (`npm test -- --passWithNoTests`).
6. Nenhuma mudança de comportamento funcional deve ser introduzida.
