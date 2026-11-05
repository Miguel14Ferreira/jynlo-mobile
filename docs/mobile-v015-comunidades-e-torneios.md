# Jynlo Mobile 0.15.0 — Competições por modalidade nas comunidades

## O que foi implementado
- Página **Competições da comunidade** que mostra os torneios agrupados por modalidade, sem juntar classificações de desportos diferentes.
- Torneios anteriores de modalidades removidas da comunidade continuam visíveis numa secção histórica.
- Cada torneio mostra o formato de resultados obtido do seu `scoringMode`, com um estado explícito quando o motor mobile ainda não está validado.
- Organizadores podem iniciar a criação de um torneio na modalidade correspondente; não se criam torneios automaticamente.
- O formulário de criação limita as escolhas às modalidades atualmente associadas à comunidade. O backend continua responsável por autorizar a criação e validar as regras.
- Modalidades sem motor de criação nativo validado continuam navegáveis para consulta de torneios, mas não herdam pontos do Futebol.
- Versão Android `0.15.0`, `versionCode 6`. O AAB `0.14.0` iniciado anteriormente pertence a um commit anterior e **não contém** esta funcionalidade.

## Validação
Verificar `npm run test:all`, `npm run typecheck` e executar testes com duas contas num dispositivo Android real antes de publicar esta versão.
O backend Jynlo `develop` aceita `sport` por torneio e `scoringMode` específico; a UI aplica um filtro de produto às modalidades da comunidade, não substitui validações no servidor.
