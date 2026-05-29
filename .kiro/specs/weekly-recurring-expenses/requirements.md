# Requirements Document

## Introduction

Gastos semanais recorrentes são despesas que se repetem toda semana em um dia fixo (ex: toda quinta-feira), de forma infinita até que o usuário exclua o grupo. Na tela Home, o valor exibido é a soma mensal de todas as ocorrências dentro daquele mês. Cada ocorrência individual pode ser editada (valor e data) de forma independente. Alterações no grupo (nome, valor padrão, dia da semana) afetam apenas ocorrências futuras a partir da data atual. Ocorrências passadas são protegidas contra edição/exclusão via grupo.

## Glossary

- **Weekly_Recurring_Group**: Entidade que define um gasto semanal recorrente, contendo nome, valor padrão, dia da semana, categoria e origem. Gera ocorrências semanais infinitamente até ser excluído.
- **Weekly_Occurrence**: Uma instância individual de um gasto semanal, vinculada a um Weekly_Recurring_Group. Possui valor e data próprios que podem ser editados independentemente.
- **Reference_Month**: Mês de referência no formato YYYY-MM usado para agrupar transações na tela Home.
- **Day_Of_Week**: Dia da semana (0-6, onde 0=domingo) em que as ocorrências são geradas.
- **Monthly_Total**: Soma de todos os valores das Weekly_Occurrences cujas datas caem dentro de um determinado mês.
- **Past_Occurrence**: Uma Weekly_Occurrence cuja data é estritamente anterior à data atual do sistema no momento da operação de grupo.
- **Future_Occurrence**: Uma Weekly_Occurrence cuja data é igual ou posterior à data atual do sistema.
- **System**: O aplicativo GG-Economy Mobile.
- **Occurrence_Generator**: Componente responsável pela geração automática de Weekly_Occurrences.

## Requirements

### Requirement 1: Criação de Gasto Semanal Recorrente

**User Story:** Como usuário, eu quero criar um gasto semanal recorrente escolhendo um dia da semana, para que o sistema gere automaticamente uma ocorrência toda semana nesse dia.

#### Acceptance Criteria

1. WHEN o usuário submete o formulário de criação com nome (1 a 100 caracteres, excluindo strings contendo apenas espaços), valor (0.01 a 999999999.99, com até 2 casas decimais), dia da semana (0=Domingo a 6=Sábado) e categoria existente no sistema, THE System SHALL criar um Weekly_Recurring_Group com os dados informados e status ativo.
2. IF o usuário submete o formulário com nome vazio ou contendo apenas espaços, valor fora do intervalo 0.01–999999999.99, dia da semana fora do intervalo 0–6 ou categoria não selecionada, THEN THE System SHALL rejeitar a criação, manter o formulário preenchido e exibir mensagem de erro indicando cada campo inválido.
3. WHEN um Weekly_Recurring_Group é criado, THE System SHALL gerar Weekly_Occurrences para todas as datas correspondentes ao Day_Of_Week dentro do mês atualmente visualizado pelo usuário, cada uma com status não-pago e o valor padrão do grupo.
4. WHEN o usuário navega para um mês que ainda não possui Weekly_Occurrences geradas para um Weekly_Recurring_Group ativo, THE System SHALL gerar as Weekly_Occurrences correspondentes ao Day_Of_Week daquele mês antes de exibir os dados, sem duplicar ocorrências caso a navegação ocorra mais de uma vez para o mesmo mês.
5. THE System SHALL atribuir a cada Weekly_Occurrence o valor padrão definido no Weekly_Recurring_Group no momento da geração.
6. THE System SHALL atribuir a cada Weekly_Occurrence uma data correspondente a uma ocorrência do Day_Of_Week dentro do mês de referência, começando pela primeira ocorrência desse dia no mês (ou pela data de criação do grupo, se esta for posterior ao início do mês).

### Requirement 2: Exibição do Total Mensal na Home

**User Story:** Como usuário, eu quero ver na tela Home o valor mensal total dos meus gastos semanais, para que eu tenha visibilidade do impacto mensal dessas despesas.

#### Acceptance Criteria

1. WHILE o usuário visualiza a tela Home para um determinado mês, THE System SHALL exibir o Monthly_Total calculado como a soma dos valores de todas as Weekly_Occurrences (de grupos ativos e inativos) cujas datas pertencem ao Reference_Month selecionado, formatado na moeda do locale do usuário com 2 casas decimais.
2. WHEN uma Weekly_Occurrence tem sua data alterada para um mês diferente, THE System SHALL recalcular o Monthly_Total do mês de origem e do mês de destino em até 1 segundo após a confirmação da edição.
3. WHEN uma Weekly_Occurrence tem seu valor alterado, THE System SHALL recalcular o Monthly_Total do mês correspondente em até 1 segundo após a confirmação da edição.
4. THE System SHALL incluir o Monthly_Total de todas as Weekly_Occurrences do Reference_Month selecionado como uma linha itemizada no SummaryCard da tela Home, somando-o ao cálculo de despesas totais do mês.
5. IF o Monthly_Total de Weekly_Occurrences para o Reference_Month selecionado for igual a zero, THEN THE System SHALL ocultar a linha de gastos semanais no SummaryCard da tela Home.
6. WHEN o Monthly_Total de Weekly_Occurrences para o Reference_Month selecionado transiciona de zero para um valor maior que zero (após criação, edição de valor ou movimentação de data de uma ocorrência para o mês), THEN THE System SHALL exibir a linha de gastos semanais no SummaryCard da tela Home em até 1 segundo após a confirmação da operação.

### Requirement 3: Edição Individual de Ocorrências

**User Story:** Como usuário, eu quero editar o valor e a data de cada ocorrência semanal individualmente, para que eu possa ajustar gastos que variaram em uma semana específica.

#### Acceptance Criteria

1. WHEN o usuário acessa os lançamentos de um Weekly_Recurring_Group, THE System SHALL exibir a lista de todas as Weekly_Occurrences ordenadas por data em ordem cronológica crescente, mostrando o valor (com até 2 casas decimais) e a data individual de cada ocorrência.
2. WHEN o usuário submete um novo valor para uma Weekly_Occurrence que esteja entre -999999999 e 999999999, possua no máximo 2 casas decimais, e seja diferente de zero, THE System SHALL persistir o novo valor apenas para aquela ocorrência específica, sem afetar outras ocorrências do mesmo grupo, e exibir confirmação visual da alteração em até 2 segundos.
3. IF o usuário submete um valor para uma Weekly_Occurrence que seja zero, menor que -999999999, maior que 999999999, ou possua mais de 2 casas decimais, THEN THE System SHALL rejeitar a alteração, manter o valor anterior inalterado, e exibir uma mensagem de erro indicando os limites permitidos.
4. WHEN o usuário altera a data de uma Weekly_Occurrence para uma data válida (no formato YYYY-MM-DD, existente no calendário, e dentro do intervalo de 5 anos no passado até 1 ano no futuro a partir da data atual), THE System SHALL atualizar o Reference_Month da ocorrência para o mês correspondente à nova data no formato YYYY-MM e manter o vínculo da ocorrência com o Weekly_Recurring_Group original.
5. IF o usuário submete uma data vazia, com formato diferente de YYYY-MM-DD, inexistente no calendário (ex: 2024-02-30), ou fora do intervalo permitido, THEN THE System SHALL rejeitar a alteração, manter a data anterior inalterada, e exibir uma mensagem de erro indicando que a data é obrigatória, deve ser válida e estar dentro do intervalo permitido.
6. WHEN o usuário altera a data de uma Weekly_Occurrence com sucesso, THE System SHALL exibir confirmação visual da alteração e reordenar a lista de ocorrências para refletir a nova posição cronológica da ocorrência editada.

### Requirement 4: Edição do Grupo (Afeta Apenas Futuro)

**User Story:** Como usuário, eu quero editar as propriedades do grupo (nome, valor padrão, dia da semana), para que mudanças se apliquem a ocorrências futuras sem alterar o histórico.

#### Acceptance Criteria

1. WHEN o usuário altera o nome do Weekly_Recurring_Group, THE System SHALL atualizar o nome no registro do grupo e refletir o novo nome na exibição de todas as Weekly_Occurrences com data igual ou posterior à data atual (inclusive o dia de hoje).
2. WHEN o usuário altera o Base_Value do Weekly_Recurring_Group, THE System SHALL aplicar o novo valor apenas às Weekly_Occurrences com data igual ou posterior à data atual que possuem is_value_edited = false.
3. WHEN o usuário altera o Base_Value do Weekly_Recurring_Group, THE System SHALL preservar o valor existente de qualquer Weekly_Occurrence que possua is_value_edited = true, independentemente da sua data.
4. WHEN o usuário altera o Day_Of_Week do Weekly_Recurring_Group, THE System SHALL excluir as Weekly_Occurrences com data igual ou posterior à data atual que possuem is_value_edited = false, e regenerar novas ocorrências para todos os meses que já possuíam ocorrências geradas, utilizando o novo Day_Of_Week e atribuindo o Base_Value atual do grupo a cada nova ocorrência.
5. WHEN o usuário altera o Day_Of_Week do Weekly_Recurring_Group, THE System SHALL preservar Weekly_Occurrences com data igual ou posterior à data atual que possuem is_value_edited = true, mantendo suas datas e valores originais.
6. WHEN qualquer propriedade do Weekly_Recurring_Group é editada, THE System SHALL preservar inalteradas todas as Weekly_Occurrences com data estritamente anterior à data atual (Past_Occurrences), sem modificar valor, data, descrição ou categoria.
7. IF a edição do grupo falhar na validação (nome vazio ou com mais de 100 caracteres, valor fora do intervalo 0.01 a 999999999, ou Day_Of_Week fora do intervalo 0-6), THEN THE System SHALL exibir mensagem de erro indicando o campo inválido e reter os valores anteriores válidos no formulário.
8. WHEN o grupo é editado com sucesso, THE System SHALL atualizar o campo updated_at do Weekly_Recurring_Group com a data e hora da alteração.
9. IF a operação de edição do grupo falhar após início da execução (erro de persistência durante atualização de ocorrências), THEN THE System SHALL reverter todas as alterações realizadas durante a operação e exibir mensagem de erro indicando que a edição não foi concluída.

### Requirement 5: Exclusão do Grupo

**User Story:** Como usuário, eu quero excluir um grupo de gasto semanal recorrente, para que novas ocorrências deixem de ser geradas, mantendo o histórico intacto.

#### Acceptance Criteria

1. WHEN o usuário solicita a exclusão de um Weekly_Recurring_Group, THE System SHALL exibir um diálogo de confirmação informando o nome do grupo e indicando que a ação é irreversível, antes de executar a operação.
2. WHEN o usuário confirma a exclusão de um Weekly_Recurring_Group, THE System SHALL definir is_active = false no registro do grupo e interromper a geração de novas Weekly_Occurrences a partir da data atual (inclusive).
3. WHEN o usuário confirma a exclusão de um Weekly_Recurring_Group, THE System SHALL preservar todas as Past_Occurrences (ocorrências com data estritamente anterior à data atual) no histórico de transações, mantendo seus valores, descrições, datas e vínculo com o grupo inalterados.
4. WHEN o usuário confirma a exclusão de um Weekly_Recurring_Group, THE System SHALL remover todas as Future_Occurrences (ocorrências com data igual ou posterior à data atual) do banco de dados.
5. WHEN o usuário cancela o diálogo de confirmação, THE System SHALL manter o Weekly_Recurring_Group com is_active = true e todas as suas ocorrências inalterados.
6. IF a operação de exclusão falha após início da execução (erro de banco de dados durante remoção de ocorrências futuras ou atualização do grupo), THEN THE System SHALL reverter todas as alterações realizadas durante a operação e exibir uma mensagem de erro indicando que a exclusão não foi concluída.

### Requirement 6: Geração Automática de Ocorrências

**User Story:** Como usuário, eu quero que as ocorrências semanais sejam geradas automaticamente, para que eu não precise criar manualmente cada lançamento toda semana.

#### Acceptance Criteria

1. WHILE um Weekly_Expense_Group está ativo (is_active = true) e seu start_date é anterior ou igual ao último dia do mês alvo, THE Occurrence_Generator SHALL gerar uma Weekly_Occurrence para cada data correspondente ao Day_Of_Week do grupo dentro daquele mês, incluindo apenas as datas que sejam iguais ou posteriores ao start_date do grupo.
2. WHEN o usuário navega para qualquer mês (passado, atual ou futuro), THE Occurrence_Generator SHALL gerar todas as Weekly_Occurrences faltantes para os Weekly_Expense_Groups ativos dentro daquele mês antes de exibir os dados do mês ao usuário.
3. THE Occurrence_Generator SHALL garantir idempotência verificando, antes de inserir, se já existe uma Weekly_Occurrence com o mesmo weekly_group_id e a mesma data de ocorrência no banco de dados, e não inserindo caso já exista.
4. THE Occurrence_Generator SHALL calcular as datas de ocorrência iterando todos os dias do mês alvo que correspondem ao Day_Of_Week do grupo, resultando em 4 ou 5 ocorrências por mês conforme o calendário, excluindo datas anteriores ao start_date do grupo.
5. IF a geração de Weekly_Occurrences falhar para um grupo específico (erro de banco de dados ou constraint violation), THEN THE Occurrence_Generator SHALL reverter todas as inserções parciais do grupo que falhou, continuar a geração para os demais grupos ativos, e registrar o erro internamente sem interromper a experiência do usuário.
6. THE Occurrence_Generator SHALL completar a geração de todas as Weekly_Occurrences para um mês em no máximo 2 segundos, independentemente do número de Weekly_Expense_Groups ativos (até 50 grupos).
7. WHEN uma Weekly_Occurrence é gerada, THE Occurrence_Generator SHALL atribuir a ela o valor (amount) e a descrição definidos no Weekly_Expense_Group correspondente, mantendo-os como cópia independente que não se altera caso o grupo seja editado posteriormente.

### Requirement 7: Proteção de Ocorrências Passadas

**User Story:** Como usuário, eu quero que meus lançamentos passados estejam protegidos contra alterações em massa, para que meu histórico financeiro permaneça confiável.

#### Acceptance Criteria

1. WHEN o grupo é editado (nome, valor padrão ou dia da semana), THE System SHALL manter inalterados todos os campos (valor, data, descrição e categoria) de todas as Past_Occurrences (data estritamente anterior à data atual do sistema) associadas ao grupo.
2. WHEN o grupo é excluído, THE System SHALL preservar todas as Past_Occurrences no histórico de transações, retendo os dados originais do grupo (nome e categoria) como atributos da ocorrência, e THE System SHALL NOT excluir nenhuma Past_Occurrence como parte da operação de exclusão do grupo.
3. THE System SHALL permitir a edição individual de Past_Occurrences pelo usuário (edição direta, não via grupo), incluindo valor, data, descrição e categoria, seguindo as mesmas regras de validação definidas no Requirement 3.
4. THE System SHALL definir Past_Occurrence como qualquer Weekly_Occurrence cuja data é estritamente anterior à data atual do sistema (00:00:00 do dia corrente) no momento da operação de grupo.
5. IF uma operação de grupo (edição ou exclusão) for executada, THEN THE System SHALL aplicar as alterações somente às ocorrências cuja data é igual ou posterior à data atual do sistema, sem modificar ou remover nenhuma Past_Occurrence.
