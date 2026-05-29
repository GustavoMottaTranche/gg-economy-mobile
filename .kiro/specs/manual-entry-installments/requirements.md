# Requirements Document

## Introdução

Este documento define os requisitos para a reformulação da tela de entrada manual do GG Economy Mobile. A feature remove a funcionalidade de importação de arquivos, mantendo apenas a entrada manual, e adiciona duas novas capacidades: suporte a parcelamento (com visualização de meses futuros) e entrada em lote por categoria (permitindo adicionar múltiplos lançamentos sem re-selecionar a categoria a cada vez).

## Glossário

- **Sistema_Entrada_Manual**: Módulo responsável pela criação de lançamentos financeiros manuais no aplicativo GG Economy Mobile.
- **Lançamento**: Registro financeiro individual no banco de dados, contendo valor, data, descrição, categoria e mês de referência.
- **Parcela**: Uma fração de um valor total distribuída ao longo de meses consecutivos, onde cada parcela gera um Lançamento individual.
- **Entrada_em_Lote**: Modo de operação onde o usuário seleciona uma categoria uma única vez e adiciona múltiplos lançamentos sequencialmente.
- **Mês_de_Referência**: Mês no formato YYYY-MM ao qual um lançamento pertence para fins de agrupamento e visualização.
- **Categoria**: Classificação do lançamento (ex: Alimentação, Transporte, Salário) com tipo receita ou despesa.

## Requisitos

### Requisito 1: Remoção da Funcionalidade de Importação

**User Story:** Como usuário, eu quero que o app tenha apenas entrada manual, para que a interface seja mais simples e focada no meu fluxo de uso.

#### Critérios de Aceitação

1. THE Sistema_Entrada_Manual SHALL apresentar na barra de navegação inferior apenas as abas: Dashboard, Transações, Entrada Manual e Configurações.
2. THE Sistema_Entrada_Manual SHALL manter todas as funcionalidades existentes de entrada manual (valor, descrição, data, categoria, mês de referência, tipo receita/despesa).
3. IF o usuário tentar acessar uma rota de importação ou revisão de importação, THEN THE Sistema_Entrada_Manual SHALL redirecionar o usuário para a tela de entrada manual.
4. THE Sistema_Entrada_Manual SHALL preservar todos os lançamentos previamente importados no banco de dados, mantendo-os acessíveis na listagem de transações.

### Requisito 2: Definição de Quantidade de Parcelas

**User Story:** Como usuário, eu quero definir a quantidade de parcelas ao criar um lançamento, para que eu possa registrar compras parceladas de forma rápida.

#### Critérios de Aceitação

1. WHEN o usuário ativar o modo parcelamento, THE Sistema_Entrada_Manual SHALL exibir um campo para definir a quantidade de parcelas (mínimo 2, máximo 48).
2. WHEN o usuário definir a quantidade de parcelas, THE Sistema_Entrada_Manual SHALL exibir uma prévia mostrando em quais meses cada parcela será registrada, a partir do mês de referência selecionado.
3. WHEN o usuário definir a quantidade de parcelas e o valor total, THE Sistema_Entrada_Manual SHALL calcular o valor de cada parcela dividindo o valor total pela quantidade de parcelas, arredondando para baixo com precisão de 2 casas decimais (centavos).
4. IF o valor total não for divisível igualmente pela quantidade de parcelas, THEN THE Sistema_Entrada_Manual SHALL atribuir a diferença de centavos à primeira parcela.
5. WHEN o usuário definir a quantidade de parcelas e o valor total, THE Sistema_Entrada_Manual SHALL garantir que a soma de todas as parcelas seja exatamente igual ao valor total informado.

### Requisito 3: Criação de Lançamentos Parcelados

**User Story:** Como usuário, eu quero que cada parcela se torne um lançamento individual, para que eu possa visualizar e gerenciar cada parcela separadamente no mês correspondente.

#### Critérios de Aceitação

1. WHEN o usuário confirmar um lançamento parcelado, THE Sistema_Entrada_Manual SHALL criar um Lançamento individual para cada parcela no banco de dados.
2. WHEN o Sistema_Entrada_Manual criar os Lançamentos de parcela, THE Sistema_Entrada_Manual SHALL atribuir a cada Lançamento o Mês_de_Referência correspondente ao mês sequencial a partir do mês inicial selecionado (mês inicial, mês inicial + 1, mês inicial + 2, etc.), avançando o ano quando o mês ultrapassar dezembro.
3. WHEN o Sistema_Entrada_Manual criar os Lançamentos de parcela, THE Sistema_Entrada_Manual SHALL anexar ao final da descrição de cada Lançamento o indicador de parcela no formato " (X/N)", onde X é o número sequencial da parcela (iniciando em 1) e N é o total de parcelas.
4. WHEN o Sistema_Entrada_Manual criar os Lançamentos de parcela, THE Sistema_Entrada_Manual SHALL atribuir a mesma categoria, tipo (receita/despesa) e origem a todos os Lançamentos de um mesmo parcelamento.
5. IF ocorrer um erro durante a criação de parcelas, THEN THE Sistema_Entrada_Manual SHALL reverter todas as parcelas já criadas naquela operação e exibir uma mensagem de erro indicando que o parcelamento não foi criado.
6. WHEN o Sistema_Entrada_Manual concluir a criação de todas as parcelas com sucesso, THE Sistema_Entrada_Manual SHALL exibir uma confirmação ao usuário indicando a quantidade de parcelas criadas e o período abrangido (mês inicial até mês final).

### Requisito 4: Edição e Deleção de Lançamentos Parcelados

**User Story:** Como usuário, eu quero editar ou deletar parcelas de um parcelamento mantendo a consistência do grupo, para que eu não fique com dados inconsistentes.

#### Critérios de Aceitação

1. WHEN o usuário deletar um Lançamento que faz parte de um parcelamento, THE Sistema_Entrada_Manual SHALL perguntar se deseja deletar apenas aquela parcela ou todas as parcelas do mesmo parcelamento.
2. IF o usuário optar por deletar todas as parcelas, THEN THE Sistema_Entrada_Manual SHALL remover todos os Lançamentos pertencentes ao mesmo parcelamento do banco de dados em uma única operação atômica.
3. IF o usuário optar por deletar apenas uma parcela, THEN THE Sistema_Entrada_Manual SHALL remover somente o Lançamento selecionado e atualizar os indicadores (X/N) das parcelas restantes para refletir o novo total.
4. WHEN o usuário editar o valor de um Lançamento que faz parte de um parcelamento, THE Sistema_Entrada_Manual SHALL perguntar se deseja aplicar a alteração apenas àquela parcela ou recalcular todas as parcelas com base em um novo valor total.
5. IF o usuário optar por recalcular todas as parcelas, THEN THE Sistema_Entrada_Manual SHALL solicitar o novo valor total e redistribuir os valores entre todas as parcelas do parcelamento, aplicando a mesma regra de arredondamento (diferença de centavos na primeira parcela).
6. WHEN o usuário editar a descrição ou categoria de um Lançamento parcelado, THE Sistema_Entrada_Manual SHALL perguntar se deseja aplicar a alteração a todas as parcelas do mesmo parcelamento ou apenas à parcela selecionada.
7. IF ocorrer um erro durante a edição ou deleção em lote de parcelas, THEN THE Sistema_Entrada_Manual SHALL reverter todas as alterações da operação e exibir uma mensagem de erro, mantendo os dados originais intactos.

### Requisito 5: Entrada em Lote por Categoria

**User Story:** Como usuário, eu quero selecionar uma categoria uma vez e adicionar vários lançamentos seguidos, para que eu não precise re-selecionar a categoria a cada novo lançamento.

#### Critérios de Aceitação

1. WHEN o usuário ativar o modo de entrada em lote, THE Sistema_Entrada_Manual SHALL solicitar a seleção de uma Categoria antes de iniciar a adição de lançamentos.
2. WHILE o modo de entrada em lote estiver ativo, THE Sistema_Entrada_Manual SHALL manter a Categoria selecionada fixa para todos os lançamentos adicionados na sessão, derivando automaticamente o tipo (receita/despesa) a partir da Categoria selecionada.
3. WHILE o modo de entrada em lote estiver ativo, THE Sistema_Entrada_Manual SHALL exibir um formulário simplificado contendo apenas: valor, descrição, data e hora (omitindo os campos de categoria e tipo, pois são derivados da seleção inicial).
4. WHEN o usuário salvar um lançamento no modo de entrada em lote, THE Sistema_Entrada_Manual SHALL limpar os campos de valor e descrição, e redefinir o campo de data e hora para a data e hora atuais do dispositivo, mantendo a Categoria selecionada.
5. WHILE o modo de entrada em lote estiver ativo, THE Sistema_Entrada_Manual SHALL exibir um contador com a quantidade de lançamentos já adicionados na sessão atual, iniciando em 0.
6. WHILE o modo de entrada em lote estiver ativo, THE Sistema_Entrada_Manual SHALL permitir a adição de no máximo 50 lançamentos por sessão, exibindo uma mensagem informativa ao atingir o limite.

### Requisito 6: Criação de Lançamentos no Modo Lote

**User Story:** Como usuário, eu quero que cada entrada no modo lote se torne um lançamento individual, para que eu tenha controle granular sobre cada registro.

#### Critérios de Aceitação

1. WHEN o usuário salvar um lançamento no modo de entrada em lote, THE Sistema_Entrada_Manual SHALL criar um Lançamento individual no banco de dados com a Categoria da sessão, o tipo (receita/despesa) derivado da Categoria, o valor informado, a descrição informada e a data/hora informada.
2. WHEN o usuário salvar um lançamento no modo de entrada em lote, THE Sistema_Entrada_Manual SHALL derivar o Mês_de_Referência extraindo o ano e mês (formato YYYY-MM) da data informada pelo usuário.
3. WHEN o usuário finalizar o modo de entrada em lote, THE Sistema_Entrada_Manual SHALL exibir um resumo com a quantidade total de lançamentos criados e o valor total da sessão.
4. IF ocorrer um erro ao salvar um lançamento individual no modo lote, THEN THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro indicando falha no salvamento, manter o formulário preenchido para nova tentativa e preservar todos os lançamentos já salvos anteriormente na sessão.

### Requisito 7: Visualização de Parcelas Futuras

**User Story:** Como usuário, eu quero ver em quais meses as parcelas vão aparecer antes de confirmar, para que eu tenha clareza do impacto financeiro futuro.

#### Critérios de Aceitação

1. WHEN o usuário definir a quantidade de parcelas e o mês inicial, THE Sistema_Entrada_Manual SHALL exibir uma lista ordenada cronologicamente com cada parcela mostrando: número da parcela (X/N), mês de referência e valor da parcela.
2. WHEN o usuário alterar a quantidade de parcelas, o valor total ou o mês inicial, THE Sistema_Entrada_Manual SHALL atualizar a prévia de parcelas em no máximo 500 milissegundos após a alteração.
3. THE Sistema_Entrada_Manual SHALL formatar os meses na prévia usando o nome do mês e ano no idioma configurado pelo usuário (ex: "Janeiro 2025" ou "January 2025").
4. IF o usuário definir a quantidade de parcelas e o mês inicial mas não tiver informado o valor total, THEN THE Sistema_Entrada_Manual SHALL exibir a prévia com o número da parcela e o mês de referência de cada parcela, omitindo o valor até que o valor total seja informado.

### Requisito 8: Validação de Dados de Entrada

**User Story:** Como usuário, eu quero que o sistema valide meus dados antes de salvar, para que eu não crie lançamentos com informações incorretas.

#### Critérios de Aceitação

1. WHEN o usuário tentar salvar um lançamento com valor igual a zero, negativo ou superior a 999.999.999,99, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação indicando o intervalo permitido (R$ 0,01 a R$ 999.999.999,99) e impedir o salvamento.
2. WHEN o usuário tentar salvar um lançamento com descrição vazia, contendo apenas espaços em branco ou com mais de 100 caracteres, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação indicando que a descrição deve ter entre 1 e 100 caracteres visíveis e impedir o salvamento.
3. WHEN o usuário tentar criar um parcelamento com quantidade de parcelas menor que 2 ou maior que 48, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação e impedir o salvamento.
4. WHEN o usuário tentar salvar um lançamento parcelado com valor total que resulte em parcelas menores que R$ 0,01, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação e impedir o salvamento.
5. WHEN o usuário tentar salvar um lançamento sem data, sem categoria ou sem tipo (receita/despesa) selecionado, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação indicando o campo obrigatório não preenchido e impedir o salvamento.
6. IF a validação de um lançamento falhar, THEN THE Sistema_Entrada_Manual SHALL manter todos os dados já preenchidos no formulário para que o usuário possa corrigir apenas o campo inválido.
