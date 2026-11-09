# Jynlo Mobile — Gate de piloto com dados reais (09-11-2026)

Estado inicial: **NÃO APROVADO PARA DISTRIBUIÇÃO**. Este documento é uma checklist de aceitação, não um relatório de testes passados. Auditoria estática do repositório não prova comportamento em Android real.

## Build e backend (bloqueadores)
- [ ] Build EAS Android `preview` concluída, APK instalada e abre sem crash em dois Android distintos.
- [ ] Registar ID/commit da APK efetivamente distribuída. A build `cfcce980-2e7f-418d-89e7-9d235633ab80` foi solicitada a partir de `6219642`, mas o sucesso **não está confirmado**.
- [ ] Confirmar que `https://desporto24-preview-api.onrender.com` e o site `d24sports.com` usam a **mesma base de dados/ambiente** pretendido, sem confundir preview/staging com produção.
- [ ] Confirmar que o login na web identifica os mesmos utilizadores e sessões no mobile.
- [ ] Confirmar Maps SDK for Android: chave no EAS Preview, restrições Android package `com.jynlo.app` + SHA-1 real da APK, sem crashes ao abrir Explorar → Mapa.
- [ ] Confirmar domínio HTTPS, disponibilidade de API e recuperação após queda de rede; nenhum token/API key exposto nos logs ou link partilhado.

## Autenticação e conta
- [ ] Registo nativo, validação de email, Google Sign-In e regresso da autenticação à app (sem depender de fluxo web para criar conta).
- [ ] Login/password, MFA (se aplicável), recuperação/alteração de password, logout e reentrada.
- [ ] Trocar entre duas contas no mesmo dispositivo não mostra dados ou mensagens da outra.
- [ ] Editar perfil, foto, modalidades favoritas; permissões de câmara/galeria e cancelamentos sem crash.
- [ ] Acesso a política de privacidade/termos, reporte e bloqueio de utilizadores.

## Navegação e descoberta
- [ ] Todos os separadores (Feed, Explorar, Comunidades, Mensagens, Torneios, Perfil) abrem e regressam corretamente.
- [ ] Feed, posts, comentários, stories de foto/vídeo, preview, publicar, eliminar/cancelar e refresh sem duplicados.
- [ ] Pesquisa de pessoas, recintos, modalidades, comunidades e sessões; estados vazios e erros de rede visíveis.
- [ ] Mapas: abrir, mover, filtrar área, escolher marcador, chegar ao detalhe e abrir navegação externa.
- [ ] Deep links de convite, notificações e links do site abrem no ecrã certo, mesmo com login necessário.

## Sessões — cenário real multiutilizador
- [ ] Criar sessão pública e de comunidade com local/data/desporto/limites corretos.
- [ ] O organizador consegue ver e editar TODOS os detalhes e cancelar sessão.
- [ ] Partilhar convite WhatsApp; utilizador já registado e novo utilizador confirmam sem perder o contexto.
- [ ] Confirmar/cancelar presença, lista de espera, número máximo/mínimo, convidados externos e remover participante.
- [ ] Duas contas em aparelhos diferentes veem a mesma lista e atualizações após refresh.
- [ ] Chat da sessão só para participantes autorizados, sem acesso depois de permissões removidas.
- [ ] Equilibrar equipas com classificação, criar aleatórias sem classificação e registar presenças no fim.
- [ ] Confirmar as alterações no site com o mesmo utilizador.

## Comunidades, torneios e campeonatos
- [ ] Criar/entrar/sair de comunidade; convites, membros e permissões; chat da comunidade.
- [ ] Criar torneio **dentro** da comunidade já selecionada sem pedir escolha redundante.
- [ ] Torneios individuais/equipas e modalidades específicas; inscrições, equipas, jogos e classificações corretos.
- [ ] Campeonatos: distinguir campeonato (agrupa liga/taça independentes) de torneio simples; apenas aprovar paridade com a web após validação da implementação real.
- [ ] Testar organizador vs membro vs não membro: operações proibidas devolvem erro claro, sem alterar dados.

## Mensagens, chamadas, media e notificações
- [ ] Mensagens privadas e comunitárias em duas contas: enviar, receber, histórico, não lidas, atualização, logout/login.
- [ ] Imagens, GIF, PDF e áudio: envio, visualização/reprodução, falhas e permissões.
- [ ] Chamadas LiveKit entre dois dispositivos: voz bidirecional, câmara local/remota, recusa, término e retorno ao chat.
- [ ] Notificações (foreground/background/app fechada), permissões opcionais, tocar e abrir conversa ou sessão correta.

## Robustez, privacidade e Android
- [ ] Sem crashes ao navegar rapidamente, bloquear/desbloquear o ecrã, mudar de rede, perder internet, negar permissões e abrir links.
- [ ] Testar Android com pouco espaço, app em background e app reinstalada.
- [ ] Sem exposição de sessões privadas, contactos, coordenadas ou anexos sem autorização.
- [ ] Performance aceitável ao abrir Feed/Comunidades e listas extensas; erros explicativos com recuperação.
- [ ] Atualização de APK mantém sessão/dados apenas quando adequado; versão e assinatura verificadas.

## Validação automática
- [ ] Instalar dependências em CI com lockfile e correr `npm run test:all`, `npm run typecheck` e `npm run doctor` numa versão exata do commit distribuído.
- [ ] Testes de regressão adicionais para Stories, ecrãs principais/tab navigation, People, Legal, permissões e error boundaries.
- [ ] Testes E2E Android mínimos para os fluxos fundamentais, com backend de teste isolado para mutações destrutivas.
- [ ] Verificar logs de Android ao abrir mapa e chamadas; a presença de testes de contrato não substitui runtime.

## Aprovação para partilha
- **BLOQUEAR** se falhar login, instalação, navegação principal, sessão/criação/adesão, sincronização com backend pretendido ou houver crashes/risco de privacidade.
- **IDENTIFICAR** funcionalidades ainda experimentais (ex.: chamadas ou Stories) e ocultar/desativar experiências perigosas em vez de as anunciar como prontas.
- Realizar primeiro teste interno com 2 contas/2 aparelhos; depois piloto com grupo pequeno, recolhendo feedback e falhas verificáveis.
- Não confundir o facto de a APK estar compilada com validação de produção ou aprovação na Google Play.

## Evidências
Para cada linha assinalada, guardar: data, APK/build ID/commit, aparelho e Android, conta/role, resultado, reprodução e issue/commit da correção. Nunca guardar passwords, tokens nem chaves de API.
