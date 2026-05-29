# Requirements Document

## Introdução

Este documento define os requisitos para a reestruturação do formulário de entrada manual do GG Economy Mobile, introduzindo um campo de título separado da descrição, adicionando seleção de hora à data da compra, e formalizando os três conceitos distintos de data/hora no sistema: data da compra (com hora), mês de referência e data de criação.

## Glossário

- **Sistema_Entrada_Manual**: Módulo responsável pela criação e edição de lançamentos financeiros manuais no aplicativo GG Economy Mobile.
- **Título**: Campo obrigatório de texto curto (1-100 caracteres) que identifica o lançamento de forma concisa (ex: "Supermercado", "Uber", "Salário").
- **Descrição**: Campo opcional de texto longo (0-500 caracteres) para detalhes adicionais sobre o lançamento.
- **Data_da_Compra**: Data e hora em que a compra ou transação efetivamente ocorreu, selecionada pelo usuário.
- **Mês_de_Referência**: Mês no formato YYYY-MM ao qual o lançamento pertence para fins de orçamento e agrupamento (ex: uma compra em maio pode pertencer à fatura de junho).
- **Data_de_Criação**: Timestamp automático gerado pelo sistema no momento em que o registro é criado no banco de dados (campo `createdAt`).
- **Entrada_em_Lote**: Modo de operação onde o usuário seleciona uma categoria e um título uma única vez e adiciona múltiplos lançamentos sequencialmente.
- **Parcela_Infinita**: Lançamento recorrente sem data de término definida, que gera automaticamente uma entrada a cada mês até ser explicitamente excluído ou desativado pelo usuário.
- **Lançamento**: Registro financeiro individual no banco de dados, contendo título, valor, data/hora, descrição opcional, categoria e mês de referência.

## Requisitos

### Requisito 1: Campo de Título Obrigatório

**User Story:** Como usuário, eu quero ter um campo de título separado da descrição, para que eu possa identificar rapidamente cada lançamento com um nome curto e manter detalhes adicionais em um campo separado.

#### Critérios de Aceitação

1. THE Sistema_Entrada_Manual SHALL exibir um campo de texto "Título" como campo obrigatório no formulário de entrada manual.
2. WHEN o usuário tentar salvar um lançamento com o campo Título vazio ou contendo apenas espaços em branco, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação indicando que o título é obrigatório e impedir o salvamento.
3. WHEN o usuário tentar salvar um lançamento com o campo Título contendo mais de 100 caracteres, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação indicando o limite máximo de 100 caracteres e impedir o salvamento.
4. THE Sistema_Entrada_Manual SHALL armazenar o valor do campo Título na coluna `title` da tabela de transações no banco de dados.
5. THE Sistema_Entrada_Manual SHALL exibir o campo Título antes do campo Descrição na ordem visual do formulário.

### Requisito 2: Campo de Descrição Opcional

**User Story:** Como usuário, eu quero ter um campo de descrição opcional, para que eu possa adicionar detalhes extras sobre um lançamento quando necessário sem ser obrigado a preencher.

#### Critérios de Aceitação

1. THE Sistema_Entrada_Manual SHALL exibir um campo de texto "Descrição" como campo opcional no formulário de entrada manual.
2. WHEN o usuário salvar um lançamento com o campo Descrição vazio, THE Sistema_Entrada_Manual SHALL aceitar o salvamento e armazenar o valor como string vazia no banco de dados.
3. WHEN o usuário tentar salvar um lançamento com o campo Descrição contendo mais de 500 caracteres, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro de validação indicando o limite máximo de 500 caracteres e impedir o salvamento.
4. THE Sistema_Entrada_Manual SHALL armazenar o valor do campo Descrição na coluna `description` da tabela de transações no banco de dados.
5. THE Sistema_Entrada_Manual SHALL exibir o campo Descrição como um campo de texto multilinha com placeholder indicando que o preenchimento é opcional.

### Requisito 3: Seleção de Hora na Data da Compra

**User Story:** Como usuário, eu quero selecionar a hora da compra além da data, para que eu tenha um registro mais preciso de quando cada transação ocorreu.

#### Critérios de Aceitação

1. THE Sistema_Entrada_Manual SHALL exibir um seletor de data e hora combinado para o campo Data_da_Compra, permitindo ao usuário selecionar dia, mês, ano, hora e minuto.
2. WHEN o formulário for aberto pela primeira vez ou resetado, THE Sistema_Entrada_Manual SHALL preencher o campo Data_da_Compra com a data e hora atuais do dispositivo.
3. WHEN o usuário selecionar uma Data_da_Compra, THE Sistema_Entrada_Manual SHALL armazenar o valor completo (data + hora + minuto) na coluna `date` da tabela de transações no formato ISO 8601.
4. THE Sistema_Entrada_Manual SHALL exibir a data e hora selecionadas no formato localizado de acordo com o idioma configurado pelo usuário (pt-BR: "dd/MM/yyyy HH:mm", en: "MM/dd/yyyy hh:mm a").
5. WHEN o usuário alterar a Data_da_Compra e o Mês_de_Referência não tiver sido alterado manualmente pelo usuário, THE Sistema_Entrada_Manual SHALL atualizar automaticamente o Mês_de_Referência para corresponder ao mês da nova Data_da_Compra selecionada.

### Requisito 4: Distinção dos Três Conceitos de Data

**User Story:** Como usuário, eu quero que o sistema diferencie claramente a data da compra, o mês de referência e a data de criação, para que eu possa registrar compras que pertencem a um mês de orçamento diferente do mês em que ocorreram.

#### Critérios de Aceitação

1. THE Sistema_Entrada_Manual SHALL manter os três campos de data como conceitos independentes: Data_da_Compra (coluna `date`), Mês_de_Referência (coluna `referenceMonth`) e Data_de_Criação (coluna `createdAt`).
2. THE Sistema_Entrada_Manual SHALL permitir que o usuário selecione um Mês_de_Referência diferente do mês da Data_da_Compra.
3. THE Sistema_Entrada_Manual SHALL gerar a Data_de_Criação automaticamente no momento do salvamento, sem intervenção do usuário.
4. THE Sistema_Entrada_Manual SHALL exibir os campos Data_da_Compra e Mês_de_Referência de forma visualmente distinta no formulário, com labels claros indicando o propósito de cada campo.
5. IF o usuário não alterar manualmente o Mês_de_Referência, THEN THE Sistema_Entrada_Manual SHALL derivar o Mês_de_Referência a partir do mês e ano da Data_da_Compra selecionada.

### Requisito 5: Título Fixo no Modo de Entrada em Lote

**User Story:** Como usuário, eu quero definir o título uma única vez ao iniciar o modo lote, para que eu não precise digitá-lo repetidamente ao adicionar múltiplos lançamentos da mesma natureza.

#### Critérios de Aceitação

1. WHEN o usuário ativar o modo de Entrada_em_Lote, THE Sistema_Entrada_Manual SHALL solicitar a seleção de uma Categoria e a definição de um Título antes de iniciar a adição de lançamentos.
2. WHILE o modo de Entrada_em_Lote estiver ativo, THE Sistema_Entrada_Manual SHALL manter o Título definido no início da sessão fixo e visível para todos os lançamentos, sem permitir alteração durante a sessão.
3. WHILE o modo de Entrada_em_Lote estiver ativo, THE Sistema_Entrada_Manual SHALL exibir o campo Descrição como opcional para cada lançamento individual, permitindo ao usuário adicionar detalhes específicos por entrada.
4. WHEN o usuário salvar um lançamento no modo de Entrada_em_Lote, THE Sistema_Entrada_Manual SHALL limpar os campos de valor, descrição e data/hora, mantendo o Título e a Categoria fixos da sessão.
5. WHEN o usuário salvar um lançamento no modo de Entrada_em_Lote, THE Sistema_Entrada_Manual SHALL armazenar o Título da sessão no campo `title` e a descrição individual (se preenchida) no campo `description` do lançamento criado.

### Requisito 6: Migração de Dados Existentes

**User Story:** Como usuário, eu quero que meus lançamentos existentes sejam preservados corretamente após a atualização, para que eu não perca dados históricos.

#### Critérios de Aceitação

1. WHEN o aplicativo for atualizado para a versão com o novo campo Título, THE Sistema_Entrada_Manual SHALL executar uma migração de banco de dados que adicione a coluna `title` (TEXT NOT NULL com default vazio) e renomeie ou mantenha a coluna `description` existente.
2. WHEN a migração for executada, THE Sistema_Entrada_Manual SHALL copiar o valor atual da coluna `description` de cada lançamento existente para a nova coluna `title`, preservando o conteúdo original.
3. WHEN a migração for executada, THE Sistema_Entrada_Manual SHALL definir a coluna `description` dos lançamentos existentes como string vazia, uma vez que o conteúdo original foi movido para `title`.
4. WHEN a migração for executada, THE Sistema_Entrada_Manual SHALL alterar a coluna `description` para permitir valores nulos ou strings vazias (campo opcional).
5. IF a migração falhar, THEN THE Sistema_Entrada_Manual SHALL reverter todas as alterações de schema e exibir uma mensagem de erro ao usuário indicando que a atualização do banco de dados falhou.

### Requisito 7: Validação Integrada do Formulário

**User Story:** Como usuário, eu quero que o sistema valide todos os campos obrigatórios antes de salvar, para que eu não crie lançamentos com dados incompletos.

#### Critérios de Aceitação

1. WHEN o usuário tentar salvar um lançamento, THE Sistema_Entrada_Manual SHALL validar que o campo Título contém entre 1 e 100 caracteres visíveis (excluindo espaços iniciais e finais).
2. WHEN o usuário tentar salvar um lançamento com campo Descrição preenchido, THE Sistema_Entrada_Manual SHALL validar que a descrição não excede 500 caracteres.
3. WHEN o usuário tentar salvar um lançamento sem Data_da_Compra selecionada, THE Sistema_Entrada_Manual SHALL exibir uma mensagem de erro indicando que a data e hora da compra são obrigatórias.
4. IF a validação de qualquer campo falhar, THEN THE Sistema_Entrada_Manual SHALL manter todos os dados já preenchidos no formulário para que o usuário possa corrigir apenas o campo inválido.
5. THE Sistema_Entrada_Manual SHALL exibir mensagens de erro de validação diretamente abaixo do campo correspondente, em cor vermelha, imediatamente após a tentativa de salvamento.

### Requisito 8: Exibição do Título nas Listagens

**User Story:** Como usuário, eu quero ver o título dos lançamentos nas listagens de transações, para que eu possa identificar rapidamente cada registro.

#### Critérios de Aceitação

1. THE Sistema_Entrada_Manual SHALL exibir o campo Título como texto principal de cada lançamento nas telas de listagem de transações.
2. WHERE o lançamento possuir uma Descrição preenchida, THE Sistema_Entrada_Manual SHALL exibir a Descrição como texto secundário abaixo do Título na listagem.
3. WHERE o lançamento não possuir Descrição (string vazia), THE Sistema_Entrada_Manual SHALL exibir apenas o Título sem espaço reservado para a Descrição na listagem.
4. THE Sistema_Entrada_Manual SHALL exibir a Data_da_Compra (incluindo hora e minuto) no formato localizado na listagem de transações.

### Requisito 9: Parcela Infinita (Custo Recorrente)

**User Story:** Como usuário, eu quero criar um lançamento recorrente sem data de término, para que custos fixos mensais (como assinaturas e aluguéis) apareçam automaticamente a cada mês até eu decidir cancelá-los.

#### Critérios de Aceitação

1. WHEN o usuário ativar o modo parcelamento, THE Sistema_Entrada_Manual SHALL oferecer a opção "Parcela infinita" como alternativa à definição de quantidade fixa de parcelas.
2. WHEN o usuário selecionar a opção Parcela_Infinita, THE Sistema_Entrada_Manual SHALL criar um registro de recorrência no banco de dados contendo: título, valor, categoria, mês inicial e frequência mensal.
3. WHILE uma Parcela_Infinita estiver ativa, THE Sistema_Entrada_Manual SHALL gerar automaticamente um Lançamento individual para cada novo mês a partir do mês inicial, com o valor, título e categoria definidos na recorrência.
4. WHEN o usuário visualizar a listagem de transações de um mês futuro que contenha uma Parcela_Infinita ativa, THE Sistema_Entrada_Manual SHALL exibir o lançamento recorrente com indicador visual de que é uma parcela infinita (ex: "∞" ou ícone de recorrência).
5. WHEN o usuário desejar encerrar uma Parcela_Infinita, THE Sistema_Entrada_Manual SHALL permitir a desativação da recorrência, cessando a geração de novos lançamentos a partir do mês seguinte ao da desativação.
6. WHEN o usuário desativar uma Parcela_Infinita, THE Sistema_Entrada_Manual SHALL preservar todos os lançamentos já gerados anteriormente, sem removê-los do histórico.
7. THE Sistema_Entrada_Manual SHALL permitir ao usuário reativar uma Parcela_Infinita previamente desativada, retomando a geração de lançamentos a partir do mês atual.

### Requisito 10: Edição Individual de Valores de Parcelas

**User Story:** Como usuário, eu quero editar o valor de parcelas individuais de um parcelamento, para que eu possa ajustar valores específicos sem afetar as demais parcelas do grupo.

#### Critérios de Aceitação

1. WHEN o usuário editar o valor de um Lançamento que faz parte de um parcelamento (finito ou infinito), THE Sistema_Entrada_Manual SHALL permitir a alteração do valor apenas daquela parcela individual, sem afetar as demais parcelas do grupo.
2. WHEN o usuário editar o valor de uma parcela individual, THE Sistema_Entrada_Manual SHALL salvar o novo valor diretamente no Lançamento correspondente no banco de dados.
3. WHEN o usuário editar o valor de uma parcela de uma Parcela_Infinita, THE Sistema_Entrada_Manual SHALL perguntar se a alteração deve ser aplicada apenas àquela ocorrência ou a todas as ocorrências futuras.
4. IF o usuário optar por aplicar a alteração a todas as ocorrências futuras de uma Parcela_Infinita, THEN THE Sistema_Entrada_Manual SHALL atualizar o valor base da recorrência e aplicar o novo valor a todos os lançamentos futuros gerados a partir daquele mês.
5. IF o usuário optar por aplicar a alteração apenas àquela ocorrência, THEN THE Sistema_Entrada_Manual SHALL salvar o valor alterado apenas no Lançamento daquele mês específico, mantendo o valor base da recorrência inalterado para os meses seguintes.
