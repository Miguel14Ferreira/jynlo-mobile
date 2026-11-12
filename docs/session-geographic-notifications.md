# Jynlo — descoberta local e notificações úteis

Estado: especificação de produto e segurança. **Não ativar distribuição de notificações de novas sessões até existir implementação backend testada.**

## Contrato com o utilizador
- A Jynlo pode funcionar sem permissão GPS. Preferências: zona escolhida manualmente ou localização aproximada obtida apenas durante a utilização.
- Sem localização em segundo plano e sem partilha de GPS entre utilizadores.
- Para novas sessões públicas, a pessoa escolhe **ativar/desativar** avisos, raio (10/25/50/100 km), modalidades e cidade de referência. Valor sugerido, nunca obrigatório: 25 km.
- Avisos de comunidades a que pertence são configuráveis à parte. Sessões privadas e de acesso restrito nunca são anunciadas fora da respetiva audiência.
- Convites e alterações a sessões em que a pessoa participa são notificações transacionais, separadas do marketing de descoberta.

## Regras do backend antes de ativar
1. Após criação de sessão elegível e confirmada no servidor, publicar um evento idempotente `session_created:<id>`; não enviar no request HTTP de criação.
2. Restringir candidatos a contas autenticadas, não bloqueadas, que aceitaram **avisos de novas sessões**, modalidade e raio. Filtrar primeiro por bbox geográfica e confirmar a distância Haversine (coordenadas públicas validadas) ou preferências explícitas de cidade.
3. Não inventar coordenadas para o utilizador ou sessão. Se a sessão não tiver GPS público válido, não enviar avisos geográficos.
4. Se a sessão for **COMMUNITY_ONLY**, entregar apenas a membros autorizados e que aceitaram alertas da comunidade, mesmo fora do raio; se for privada por palavra-passe, não anunciar a desconhecidos.
5. Limite inicial: no máximo 2 notificações proativas de descoberta por dia/conta. Agrupar sessões próximas numa única notificação quando possível.
6. Gravar a deduplicação `(recipient,session,eventType)`, respeitar expiração/cancelamento e preferências no momento do envio. Excluir autor e pessoas já inscritas.
7. Nunca colocar morada exata, telefone, identidade do utilizador ou localização residencial no texto push. O destino abre a vista de sessão com autorização confirmada pela API.
8. Modo `dry-run` com métricas por região, modalidade, elegibilidade e descartes antes de produção.

## UI planeada
- Onboarding opcional: «Descobre desporto perto de ti», escolher cidade ou pedir localização aproximada.
- Notificações → «Novas sessões perto de mim», modalidade, raio, «Novidades das minhas comunidades».
- Explorar: «Perto de mim», «Comunidades», «Portugal»; navegar noutras cidades sem alterar o local habitual.

## Critérios de aceitação
- Lisboa nunca recebe aviso geográfico de uma sessão do Porto quando fora do raio, e vice-versa.
- Membro de comunidade do Porto em Lisboa pode receber avisos da sua comunidade se tiver ativado a opção.
- GPS negado não bloqueia a app; cidade manual funciona.
- Sessões privadas não geram fuga de informação.
- Duplicados, rate limits, sessão cancelada, bloqueios e logout testados.
