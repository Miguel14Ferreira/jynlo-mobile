# Feed web → Jynlo Mobile (v0.6)

Referência: ecrã original `image(20261103-013047).png` e ficheiros `social-feed.component.html`, `social-feed.component.css`, `social-stories.component.html` no `develop` da FE.

## Hierarquia do Feed a preservar

1. Cabeçalho Jynlo: marca, notificações, identidade da **conta ativa** (nunca seletor falso de Tiago/André).
2. Boas-vindas: cor azul-noite, fotografia desportiva, saudação e texto de descoberta.
3. Stories: criação, grupos por autor/comunidade, expiração 24h, media (foto/vídeo).
4. A minha semana desportiva: três destinos — jogos futuros, jogos com vagas, comunidades; horizontal no mobile, não eliminar dois cartões.
5. Publicar com a comunidade: até 1000 caracteres, foto ou vídeo, ações distintas.
6. Feed de posts e atividades: autor, data, conteúdo/media, gostos, comentários, partilha, sessão associada.
7. Descoberta da coluna lateral da web: pessoas e comunidades ficam abaixo do feed como secções, sem desaparecer.

## Navegação

5 separadores: Feed · Explorar · Comunidades · Mensagens · Perfil. «Atividades / As minhas sessões», recintos, notificações e torneios continuam acessíveis por atalhos e interiores. Esta distribuição não implica retirar as funcionalidades do projeto.

## Sem equivalências falsas

Não substituir karting por uma tabela de futebol; não apresentar moradas exatas aos visitantes; não declarar uma sessão confirmada sem resposta do servidor; não tratar um botão de demonstração como autorização real. No ambiente de demonstração, todo o conteúdo é fictício e isolado.

## Estado

Ecrã Feed refeito + contratos de serviços implementados, mas **ainda não são paridade web completa**, e **ainda não há compilação nativa ou integração real validadas**. O objetivo para cada módulo é chegar ao mesmo percurso ponta-a-ponta do frontend web antes de o considerar concluído.
