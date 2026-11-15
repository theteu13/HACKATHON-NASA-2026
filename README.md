# CosmoMedic · Saúde da tripulação

Dashboard demonstrativo de monitoramento de astronautas, com a paleta Nebula Glass das referências visuais. Feito em HTML, CSS e JavaScript, sem dependências de build.

## Executar

Abra `index.html` no navegador ou, para usar um servidor local, execute na pasta do projeto:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Acesse http://127.0.0.1:4173. As fontes Sora e Inter usam Google Fonts; sem internet, a interface utiliza fontes alternativas locais.

## Funcionalidades

- Central de Comando com modos Astronauta e Controle em Terra.
- Índice demonstrativo de prontidão, com fórmula visível e sem autorização de tarefas críticas.
- Simulador de descanso de três dias, guardando rascunhos sem alterar escalas.
- Controles simulados de iluminação, ruído branco e temperatura.
- Copiloto com pausa cronometrada, indicação para consultar mobilidade aprovada e mensagem familiar fictícia.
- Visão Terra com semáforo roteirizado e tendências coletivas; humor, diário e mensagens pessoais saem da interface.
- Indicadores pessoais organizados em seção expansível; ferramentas abertas sob demanda.

- Seleção de três astronautas fictícios.
- Pressão arterial, frequência cardíaca, glicemia, temperatura, sono e humor de 1 a 5.
- Informações complementares de densidade óssea, nutrição e sistema imunológico.
- Gráfico com períodos de 7 dias, 30 dias e missão, usando séries fictícias.
- Formulário obrigatório para os seis indicadores, com validação de campos.
- Registros salvos por astronauta no `localStorage` do navegador; os cartões mostram o último registro salvo.
- Layout adaptável para desktop e celular.

## Limites do protótipo

Todos os perfis e valores iniciais são fictícios. A ilustração corporal é conceitual e não apresenta diagnóstico ou classificação clínica. O histórico do gráfico é demonstrativo; registros locais atualizam os cartões e o último ponto do gráfico. Não há sensores, backend, autenticação ou sincronização entre dispositivos. Use apenas dados fictícios: o armazenamento local não é adequado para informações médicas reais.

A troca de modos é uma demonstração de interface, não uma barreira de segurança: dados locais continuam acessíveis ao navegador. Consulte `INTEGRATION.md` para os limites e pontos de conexão com o programa.

## Verificação

Verificados: resposta HTTP 200, sintaxe JavaScript, renderização com DOM simulado, troca de astronauta, seleção de período, salvamento e exibição de registros. A validação visual e a interação em navegador real ficaram pendentes porque a ferramenta de prévia não estava disponível na sessão.

Os testes da Central de Comando estão em `tests/command.test.cjs`: limites do índice, independência do humor, recuperação ilustrativa, mudança de modo, remoção de conteúdo pessoal e simulação sem modificar registros. Execute com `node --test tests/command.test.cjs` em um ambiente com Node.js. Nesta sessão, foram executados pelo runtime JavaScript disponível com DOM simulado.
