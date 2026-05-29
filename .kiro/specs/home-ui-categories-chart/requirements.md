# Requirements Document

## Introduction

Redesign da tela Home (Dashboard) para separar categorias de despesas em seções colapsáveis "Fixo" e "Variável", permitir visualização de lançamentos por categoria com carregamento sob demanda (lazy loading), aprimorar o gráfico para comparar totais fixos vs variáveis com opções de filtro, permitir navegação para meses futuros no seletor de meses, e reorganizar a interface visual corrigindo erros de layout.

## Glossary

- **Dashboard**: A tela principal (home) do aplicativo que exibe o resumo financeiro, breakdown de categorias e gráficos de tendência.
- **Seção_Categorias**: Um grupo colapsável na interface que contém categorias classificadas pelo seu Grupo_Despesa (fixo ou variável).
- **Seção_Fixo**: A Seção_Categorias contendo categorias com `expenseGroup = 'fixed'`.
- **Seção_Variável**: A Seção_Categorias contendo categorias com `expenseGroup = 'variable'`.
- **Linha_Categoria**: Um item individual de categoria dentro de uma Seção_Categorias exibindo nome, cor, valor total e percentual.
- **Lista_Lançamentos**: A lista de transações individuais (lançamentos) pertencentes a uma categoria específica para o mês selecionado.
- **Gráfico_Despesas**: O componente de gráfico no Dashboard que visualiza a distribuição de despesas.
- **Filtro_Gráfico**: Um seletor que controla quais grupos de despesas são exibidos no Gráfico_Despesas.
- **Seletor_Mês**: O componente de navegação que permite alternar entre meses no Dashboard.
- **Layout_Dashboard**: A estrutura visual e organização dos componentes na tela principal.

## Requirements

### Requisito 1: Seções Colapsáveis por Grupo de Despesa

**User Story:** Como usuário, quero que minhas categorias de despesas sejam separadas em seções "Fixo" e "Variável" que posso colapsar e expandir, para que eu possa focar no grupo que me interessa.

#### Acceptance Criteria

1. THE Dashboard SHALL exibir categorias de despesas agrupadas em uma Seção_Fixo (categorias com `expenseGroup = 'fixed'`) e uma Seção_Variável (categorias com `expenseGroup = 'variable'`), excluindo categorias sem grupo de despesa definido (`expenseGroup = null`) de ambas as seções.
2. WHEN o Dashboard carrega, THE Seção_Fixo e Seção_Variável SHALL ser exibidas no estado expandido por padrão.
3. WHEN o usuário toca no cabeçalho da Seção_Fixo, THE Dashboard SHALL alternar a Seção_Fixo entre os estados colapsado e expandido com uma animação de transição de no máximo 300ms.
4. WHEN o usuário toca no cabeçalho da Seção_Variável, THE Dashboard SHALL alternar a Seção_Variável entre os estados colapsado e expandido com uma animação de transição de no máximo 300ms.
5. WHILE uma Seção_Categorias está colapsada, THE Dashboard SHALL ocultar todos os itens Linha_Categoria dentro daquela seção.
6. WHILE uma Seção_Categorias está expandida, THE Dashboard SHALL exibir todos os itens Linha_Categoria dentro daquela seção.
7. THE cabeçalho da Seção_Fixo SHALL exibir o valor total formatado na moeda do usuário de todas as categorias de despesas fixas para o mês selecionado.
8. THE cabeçalho da Seção_Variável SHALL exibir o valor total formatado na moeda do usuário de todas as categorias de despesas variáveis para o mês selecionado.
9. THE cabeçalho de cada Seção_Categorias SHALL exibir um indicador visual (ícone de seta/chevron) que reflete o estado atual da seção: apontando para baixo quando expandida e apontando para a direita quando colapsada.
10. IF uma Seção_Categorias não contém nenhuma Linha_Categoria para o mês selecionado, THEN THE Dashboard SHALL exibir a seção com o cabeçalho mostrando valor total zero e sem itens Linha_Categoria visíveis.

### Requisito 2: Carregamento Sob Demanda de Lançamentos por Categoria

**User Story:** Como usuário, quero expandir uma categoria específica para ver seus lançamentos individuais sem carregar todos os lançamentos na memória antecipadamente, para que o aplicativo permaneça performático.

#### Acceptance Criteria

1. WHEN o usuário toca em uma Linha_Categoria, THE Dashboard SHALL expandir a Linha_Categoria para revelar a Lista_Lançamentos daquela categoria no mês selecionado.
2. WHEN o usuário toca em uma Linha_Categoria expandida, THE Dashboard SHALL colapsar a Linha_Categoria e ocultar a Lista_Lançamentos.
3. WHEN uma Linha_Categoria é expandida, THE Dashboard SHALL carregar a Lista_Lançamentos do banco de dados somente naquele momento (lazy loading) e exibir um indicador de carregamento inline dentro da Linha_Categoria até que os dados sejam retornados ou a consulta falhe.
4. WHILE uma Linha_Categoria está colapsada, THE Dashboard SHALL NOT manter os dados da Lista_Lançamentos em memória para aquela categoria.
5. THE Lista_Lançamentos SHALL exibir cada lançamento com sua descrição, valor e data, ordenados por data decrescente (mais recente primeiro).
6. IF a consulta ao banco de dados para a Lista_Lançamentos falhar, THEN THE Dashboard SHALL exibir uma mensagem de erro indicando a falha no carregamento, inline dentro da Linha_Categoria expandida, acompanhada de uma opção para o usuário tentar novamente a consulta.
7. IF a Lista_Lançamentos retornada para a categoria no mês selecionado estiver vazia, THEN THE Dashboard SHALL exibir uma indicação de estado vazio inline dentro da Linha_Categoria expandida informando que não há lançamentos para aquela categoria no mês.

### Requisito 3: Comparação Fixo vs Variável no Gráfico

**User Story:** Como usuário, quero que o gráfico mostre a relação entre minhas despesas fixas e variáveis, para que eu possa entender minha estrutura de gastos.

#### Acceptance Criteria

1. THE Gráfico_Despesas SHALL suportar um modo de visualização que exibe o total de despesas fixas e o total de despesas variáveis como segmentos comparáveis.
2. WHEN o modo de visualização fixo-vs-variável está ativo, THE Gráfico_Despesas SHALL exibir o total fixo e o total variável como segmentos visuais distintos com seus respectivos valores monetários absolutos.
3. WHILE o modo de visualização fixo-vs-variável está ativo, THE Gráfico_Despesas SHALL exibir o percentual que cada grupo representa do total de despesas, arredondado para o inteiro mais próximo (sem casas decimais), de forma que a soma dos percentuais exibidos seja sempre 100%.
4. WHEN o usuário alterna entre modos de visualização do gráfico, THE Gráfico_Despesas SHALL animar a transição entre as visualizações com duração entre 200ms e 400ms.
5. IF o total de despesas para o mês selecionado é zero (nenhuma despesa fixa ou variável registrada), THEN THE Gráfico_Despesas SHALL exibir um estado vazio indicando ausência de dados para comparação, sem exibir segmentos ou percentuais.

### Requisito 4: Opções de Filtro do Gráfico

**User Story:** Como usuário, quero filtrar o gráfico para mostrar apenas despesas fixas, apenas despesas variáveis, ou ambas, para que eu possa analisar cada grupo independentemente.

#### Acceptance Criteria

1. THE Dashboard SHALL exibir um Filtro_Gráfico com três opções: "Todos" (fixo e variável), "Somente Fixo" e "Somente Variável".
2. WHEN o usuário seleciona "Somente Fixo" no Filtro_Gráfico, THE Gráfico_Despesas SHALL exibir apenas as categorias pertencentes à Seção_Fixo como segmentos individuais com seus respectivos nomes, valores e percentuais relativos ao total fixo.
3. WHEN o usuário seleciona "Somente Variável" no Filtro_Gráfico, THE Gráfico_Despesas SHALL exibir apenas as categorias pertencentes à Seção_Variável como segmentos individuais com seus respectivos nomes, valores e percentuais relativos ao total variável.
4. WHEN o usuário seleciona "Todos" no Filtro_Gráfico, THE Gráfico_Despesas SHALL exibir a visualização de comparação fixo-vs-variável.
5. THE Filtro_Gráfico SHALL indicar visualmente a opção atualmente ativa por meio de um estilo diferenciado (cor de fundo ou destaque) distinguível das opções inativas.
6. WHEN o Dashboard carrega, THE Filtro_Gráfico SHALL ter a opção "Todos" selecionada por padrão.
7. IF o usuário seleciona um filtro cujo grupo não possui categorias com lançamentos no mês selecionado, THEN THE Gráfico_Despesas SHALL exibir um estado vazio indicando que não há despesas para o grupo selecionado.
8. WHEN o usuário alterna entre opções do Filtro_Gráfico, THE Gráfico_Despesas SHALL atualizar a visualização em no máximo 300 milissegundos.

### Requisito 5: Navegação para Meses Futuros

**User Story:** Como usuário, quero navegar para meses futuros no seletor de meses, para que eu possa visualizar transações planejadas ou recorrentes para meses que ainda não chegaram.

#### Acceptance Criteria

1. THE Seletor_Mês SHALL manter o botão de próximo mês habilitado e interativo independentemente do mês atualmente exibido, permitindo navegação para meses além do mês atual.
2. WHEN o usuário toca no botão de próximo mês, THE Seletor_Mês SHALL avançar para o próximo mês e atualizar o rótulo exibido para refletir o mês e ano de destino.
3. THE Seletor_Mês SHALL NOT impor um limite superior na navegação de meses baseado na data atual.
4. WHEN um mês futuro é selecionado, THE Dashboard SHALL exibir a Seção_Fixo e a Seção_Variável com seus respectivos totais calculados para aquele mês (exibindo valor zero quando não houver transações no grupo).
5. IF não existem dados para o mês futuro selecionado, THEN THE Dashboard SHALL exibir as seções de categorias com totais zerados e o Gráfico_Despesas sem segmentos de dados, mantendo a estrutura visual do Dashboard intacta.
6. WHEN um mês futuro é selecionado, THE Seletor_Mês SHALL exibir uma indicação visual de que o mês exibido é posterior ao mês atual.

### Requisito 6: Reorganização Visual do Dashboard

**User Story:** Como usuário, quero que a tela principal tenha uma organização visual correta e sem erros de layout, para que eu tenha uma experiência de uso agradável e consistente.

#### Acceptance Criteria

1. THE Layout_Dashboard SHALL organizar os componentes na seguinte ordem vertical: Seletor_Mês, SummaryCard, Gráfico_Despesas com Filtro_Gráfico, Seção_Fixo e Seção_Variável.
2. THE Layout_Dashboard SHALL aplicar espaçamento vertical de 16px (spacing.base) entre todos os componentes adjacentes do Dashboard.
3. THE Layout_Dashboard SHALL aplicar margens laterais (padding horizontal) de 16px (spacing.base) em todos os componentes do Dashboard.
4. THE Layout_Dashboard SHALL renderizar todos os componentes sem sobreposição de elementos em telas com largura entre 320px e 428px.
5. WHILE o Dashboard está em modo de rolagem, THE Layout_Dashboard SHALL manter a taxa de quadros em no mínimo 30fps, sem saltos ou congelamentos visíveis durante a rolagem.
6. THE Layout_Dashboard SHALL aplicar sombra de elevação alta (lg) ao SummaryCard e sombra de elevação baixa ou média (sm ou md) aos demais cards do Dashboard, estabelecendo hierarquia visual entre os níveis de componentes.
