# Traduzir ecrãs da app

O texto português é a chave (`t('Texto')`, em `src/lib/i18n.tsx`); o inglês está em `src/lib/i18n-en.cjs`.

1. `python3 scripts/i18n/wrap_t.py app/ecra.tsx …` envolve os textos visíveis em `t()`.
2. `python3 scripts/i18n/untranslated.py app/ecra.tsx` mostra o que ficou de fora (palavras soltas, frases com valores → usar `t('… {n} …',{n})`).
3. `python3 scripts/i18n/toplevel_t.py app/ecra.tsx` avisa de `t()` fora dos componentes (fica sempre em português: chamar no render).
4. Acrescentar o inglês a `i18n-en.cjs` e o ecrã a `TRANSLATED` em `tests/i18n.test.cjs`.
