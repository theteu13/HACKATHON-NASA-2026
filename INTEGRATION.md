# Central de Comando CosmoMedic

## Organização

`theme.css` mantém a identidade visual compartilhável. `app.js` fornece dados fictícios, indicadores e check-in. `command.js` acrescenta modos, prontidão, cenários, pausa e cabine; `command.css` organiza essa camada. O painel pessoal fica recolhido inicialmente para reduzir a densidade de informação.

## O que funciona no protótipo

- Modos Astronauta e Terra, com limpeza do conteúdo pessoal renderizado ao entrar em Terra.
- Índice de rotina calculado a partir de sono e duas entradas fictícias, com pesos explícitos na interface. Não usa humor ou mensagens.
- Seleção de atividade para diferenciar planejamento comum de tarefas críticas, sem classificação de aptidão.
- Simulação de redução de sono e descanso extra em três dias. Rascunho preservado na sessão, sem despacho de alterações de agenda.
- Preferências de cabine mantidas na sessão. Perfil de descanso manual, sem inferência automática de estresse.
- Pausa de um minuto e mensagem de família de exemplo, apenas na visão pessoal.
- Semáforo roteirizado com três estados operacionais e tendência coletiva fictícia. Não deriva risco clínico dos registros.

## Ao integrar o repositório do programa

1. Obter identidade e papel da sessão autenticada. O seletor atual é exclusivo da demonstração.
2. Criar endpoints distintos: o astronauta recebe seus registros; o suporte recebe somente campos e alertas aprovados para seu papel. Não enviar dados psicológicos para depois escondê-los com CSS. Credenciais médicas e operacionais podem exigir permissões diferentes.
3. Substituir dados locais por serviços autenticados, com finalidade, consentimento, trilha de acesso e política de retenção definidos pela equipe responsável.
4. Conectar avaliações aprovadas de prontidão e fadiga. Não reutilizar os pesos ou o semáforo arbitrários para decisões reais. Foco cognitivo e estabilidade física não são inferidos dos sinais vitais deste protótipo.
5. Integrar a agenda com revisão humana, detecção de conflitos e confirmação antes de efetivar replanejamento.
6. Conectar um serviço de cabine com permissões, limites operacionais definidos pelo sistema real, confirmação de recebimento, telemetria e tratamento de falhas. A mensagem de sucesso atual confirma somente o estado da simulação.
7. Usar canais privados autenticados para mensagens familiares e protocolos de mobilidade definidos para cada astronauta. Nenhum exercício clínico foi prescrito neste protótipo.

## Referências de contexto

As referências sustentam o contexto de sono, ambiente e privacidade; não validam a fórmula nem os valores arbitrários do protótipo:

- [NASA — Habitability Functions: sleep accommodations and privacy](https://www.nasa.gov/reference/7-0-habit-ability-functions-vol-2/).
- [NASA — Behavioral Health & Performance](https://www.nasa.gov/reference/jsc-behavioral-health/).
- [NASA — riscos de perda de sono, dessincronização circadiana e sobrecarga](https://www.nasa.gov/directorates/esdmd/hhp/risk-of-performance-decrements-and-adverse-health-outcomes-resulting-from-sleep-loss-circadian-desynchronization-and-work-overload/).
