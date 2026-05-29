# Requirements Document

## Introduction

O recurso de rastreamento de status de pagamento permite que o usuário marque gastos recorrentes (mensais fixos e semanais) como pagos ou não pagos. Cada ocorrência individual de um gasto recorrente pode ter seu status de pagamento controlado independentemente. O sistema oferece acesso rápido na tela Home às contas pendentes de pagamento e exibe a diferença entre o gasto previsto e o já pago no mês, permitindo monitoramento financeiro mais detalhado. O status pode ser gerenciado tanto pela Home quanto pela tela de detalhe do lançamento.

## Glossary

- **System**: O aplicativo GG-Economy Mobile.
- **Payment_Status**: Campo booleano que indica se uma ocorrência de gasto recorrente foi paga (true) ou está pendente (false).
- **Monthly_Recurring_Transaction**: Transação recorrente mensal existente na tabela `recurring_transactions`, que gera uma entrada por mês na tabela `transactions`.
- **Weekly_Occurrence**: Instância individual de um gasto semanal recorrente, armazenada na tabela `weekly_occurrences`.
- **Recurring_Occurrence**: Termo genérico que abrange tanto uma transação gerada por Monthly_Recurring_Transaction quanto uma Weekly_Occurrence.
- **Pending_Item**: Uma Recurring_Occurrence cujo Payment_Status é false (não paga) e cuja data pertence ao mês atual ou a um mês passado.
- **Predicted_Total**: Soma dos valores de todas as Recurring_Occurrences do mês selecionado, independentemente do Payment_Status.
- **Paid_Total**: Soma dos valores de todas as Recurring_Occurrences do mês selecionado cujo Payment_Status é true.
- **Pending_Total**: Diferença entre Predicted_Total e Paid_Total para o mês selecionado.
- **Bulk_Mark**: Operação que marca todas as ocorrências de um grupo recorrente como pagas de uma só vez.
- **Entry_Screen**: Tela de detalhe/criação de um lançamento recorrente (tela de edição do grupo ou da ocorrência individual).
- **Home_Screen**: Tela principal do aplicativo que exibe o resumo financeiro mensal.
- **Pending_Section**: Seção na Home_Screen que lista os Pending_Items do mês atual para acesso rápido.

## Requirements

### Requirement 1: Marcação Individual de Status de Pagamento

**User Story:** Como usuário, eu quero marcar cada ocorrência de gasto recorrente como paga ou não paga, para que eu saiba quais contas já foram quitadas no mês.

#### Acceptance Criteria

1. WHEN o usuário toca no controle de status de pagamento de uma Recurring_Occurrence, THE System SHALL alternar o Payment_Status daquela ocorrência entre pago (true) e não pago (false), persistindo a alteração no banco de dados em até 1 segundo.
2. WHILE uma Recurring_Occurrence possui Payment_Status igual a true, THE System SHALL exibir indicação visual de "pago" (ícone de check e estilo diferenciado) na listagem de ocorrências.
3. WHILE uma Recurring_Occurrence possui Payment_Status igual a false, THE System SHALL exibir indicação visual de "pendente" (sem ícone de check, estilo padrão) na listagem de ocorrências.
4. WHEN o Payment_Status de uma Recurring_Occurrence é alterado, THE System SHALL recalcular o Paid_Total e o Pending_Total do Reference_Month correspondente em até 1 segundo após a confirmação.
5. THE System SHALL permitir a alteração do Payment_Status de qualquer Recurring_Occurrence independentemente da sua data (passada, presente ou futura).
6. WHEN uma nova Weekly_Occurrence é gerada pelo Occurrence_Generator, THE System SHALL atribuir Payment_Status igual a false (não pago) como valor padrão.
7. WHEN uma nova transação é gerada a partir de uma Monthly_Recurring_Transaction, THE System SHALL atribuir Payment_Status igual a false (não pago) como valor padrão.

### Requirement 2: Opções de Status de Pagamento na Criação

**User Story:** Como usuário, eu quero escolher na hora de criar um gasto recorrente se as ocorrências já estão pagas ou não, para que eu registre corretamente tanto contas novas quanto compras parceladas que já foram cobradas.

#### Acceptance Criteria

1. WHEN o usuário está no formulário de criação de um grupo recorrente (mensal ou semanal), THE System SHALL exibir uma seção de "Status de pagamento" com três opções mutuamente exclusivas: (a) "Todas pendentes" (padrão), (b) "Marcar primeira como paga", (c) "Marcar todas como pagas".
2. WHEN o usuário seleciona "Todas pendentes" e confirma a criação, THE System SHALL criar o grupo com todas as Recurring_Occurrences geradas com Payment_Status igual a false.
3. WHEN o usuário seleciona "Marcar primeira como paga" e confirma a criação, THE System SHALL criar o grupo e definir o Payment_Status da primeira Recurring_Occurrence gerada (menor data dentro do primeiro mês de referência) como true, mantendo as demais como false.
4. WHEN o usuário seleciona "Marcar todas como pagas" e confirma a criação, THE System SHALL criar o grupo e definir o Payment_Status como true para todas as Recurring_Occurrences geradas, independentemente do mês de referência.
5. WHEN a operação de "Marcar todas como pagas" é concluída com sucesso, THE System SHALL recalcular o Paid_Total e o Pending_Total de todos os Reference_Months afetados em até 2 segundos.
6. IF a criação do grupo com qualquer opção de status falhar (erro de banco de dados), THEN THE System SHALL reverter todas as alterações realizadas durante a operação e exibir mensagem de erro indicando que a criação não foi concluída.
7. THE System SHALL definir "primeira ocorrência" como a Recurring_Occurrence com a menor data dentro do primeiro mês de referência gerado para o grupo.

### Requirement 3: Marcação em Massa pela Entry_Screen (Bulk Mark)

**User Story:** Como usuário, eu quero marcar todas as ocorrências de um grupo recorrente como pagas de uma vez pela tela de detalhe, para que eu possa atualizar rapidamente o status quando uma conta é quitada integralmente.

#### Acceptance Criteria

1. WHEN o usuário acessa a Entry_Screen de um grupo recorrente, THE System SHALL exibir a opção de Bulk_Mark (marcar todas como pagas) como ação disponível na tela.
2. WHEN o usuário aciona a opção de Bulk_Mark na Entry_Screen, THE System SHALL definir o Payment_Status como true para todas as Recurring_Occurrences ativas daquele grupo que possuem Payment_Status false, independentemente do mês de referência.
3. WHEN a operação de Bulk_Mark é concluída, THE System SHALL exibir confirmação visual indicando o número de ocorrências marcadas como pagas.
4. WHEN a operação de Bulk_Mark é concluída, THE System SHALL recalcular o Paid_Total e o Pending_Total de todos os Reference_Months afetados em até 2 segundos.
5. IF a operação de Bulk_Mark falhar parcialmente (erro de banco de dados durante a atualização), THEN THE System SHALL reverter todas as alterações de Payment_Status realizadas durante a operação e exibir mensagem de erro indicando que a marcação não foi concluída.

### Requirement 4: Seção de Contas Pendentes na Home

**User Story:** Como usuário, eu quero ver na tela Home uma lista de acesso rápido às contas pendentes do mês, para que eu saiba rapidamente o que ainda precisa ser pago.

#### Acceptance Criteria

1. WHILE o usuário visualiza a Home_Screen para o mês atual, THE System SHALL exibir a Pending_Section contendo todos os Pending_Items (Recurring_Occurrences com Payment_Status false) cujas datas pertencem ao mês selecionado, ordenados por data em ordem cronológica crescente.
2. WHEN o usuário toca no controle de status de um Pending_Item na Pending_Section, THE System SHALL alternar o Payment_Status daquela ocorrência para true e remover o item da Pending_Section em até 1 segundo.
3. WHEN todos os Pending_Items do mês selecionado são marcados como pagos, THE System SHALL ocultar a Pending_Section da Home_Screen.
4. WHEN pelo menos um Pending_Item existe para o mês selecionado, THE System SHALL exibir a Pending_Section na Home_Screen entre o SummaryCard e a seção de gráficos.
5. THE System SHALL exibir para cada Pending_Item na Pending_Section: o nome do grupo recorrente, o valor da ocorrência formatado na moeda do locale do usuário, e a data da ocorrência.
6. WHEN o usuário toca no nome ou área de detalhe de um Pending_Item (exceto o controle de status), THE System SHALL navegar para a Entry_Screen do grupo recorrente correspondente.
7. WHILE o usuário visualiza a Home_Screen para um mês diferente do mês atual, THE System SHALL exibir a Pending_Section com os Pending_Items do mês selecionado, seguindo as mesmas regras de exibição e ordenação.

### Requirement 5: Exibição de Previsto vs. Pago na Home

**User Story:** Como usuário, eu quero ver na Home a diferença entre o gasto previsto e o já pago, para que eu monitore com mais detalhe meu progresso financeiro no mês.

#### Acceptance Criteria

1. WHILE o usuário visualiza a Home_Screen, THE System SHALL exibir no SummaryCard o Predicted_Total (soma de todas as Recurring_Occurrences do mês selecionado), o Paid_Total (soma das Recurring_Occurrences com Payment_Status true) e o Pending_Total (Predicted_Total menos Paid_Total), cada um formatado na moeda do locale do usuário com 2 casas decimais.
2. WHEN o Payment_Status de qualquer Recurring_Occurrence do mês selecionado é alterado, THE System SHALL atualizar os valores de Predicted_Total, Paid_Total e Pending_Total no SummaryCard em até 1 segundo.
3. IF o Predicted_Total do mês selecionado for igual a zero (nenhuma Recurring_Occurrence existe para o mês), THEN THE System SHALL ocultar a seção de previsto vs. pago no SummaryCard.
4. WHEN o Predicted_Total transiciona de zero para um valor maior que zero, THE System SHALL exibir a seção de previsto vs. pago no SummaryCard em até 1 segundo.
5. THE System SHALL calcular o Predicted_Total incluindo Recurring_Occurrences de grupos ativos e inativos cujas datas pertencem ao mês selecionado.
6. THE System SHALL diferenciar visualmente o Paid_Total e o Pending_Total utilizando cores distintas (verde para pago, laranja ou vermelho para pendente) para facilitar a leitura rápida.

### Requirement 6: Marcação de Status pela Entry_Screen

**User Story:** Como usuário, eu quero poder marcar ocorrências como pagas diretamente na tela de detalhe do lançamento, para que eu tenha flexibilidade de gerenciar o status por diferentes caminhos.

#### Acceptance Criteria

1. WHEN o usuário acessa a Entry_Screen de um grupo recorrente, THE System SHALL exibir a lista de Recurring_Occurrences com o Payment_Status atual de cada uma (indicação visual de pago ou pendente) e um controle para alternar o status individualmente.
2. WHEN o usuário alterna o Payment_Status de uma Recurring_Occurrence na Entry_Screen, THE System SHALL persistir a alteração no banco de dados e atualizar a indicação visual em até 1 segundo.
3. WHEN o usuário acessa a Entry_Screen de um grupo recorrente, THE System SHALL exibir um resumo com a contagem de ocorrências pagas e pendentes do grupo (ex: "3 de 5 pagas").

### Requirement 7: Persistência do Status de Pagamento

**User Story:** Como usuário, eu quero que o status de pagamento seja preservado mesmo quando o grupo é editado, para que meu histórico de pagamentos permaneça confiável.

#### Acceptance Criteria

1. WHEN o grupo recorrente é editado (nome, valor padrão, dia da semana ou categoria), THE System SHALL preservar o Payment_Status de todas as Recurring_Occurrences existentes sem alteração.
2. WHEN o valor padrão do grupo é alterado e ocorrências futuras não editadas são atualizadas com o novo valor, THE System SHALL manter o Payment_Status original dessas ocorrências inalterado.
3. WHEN o grupo recorrente é excluído (soft delete), THE System SHALL preservar o Payment_Status de todas as Past_Occurrences mantidas no histórico.
4. WHEN novas Recurring_Occurrences são geradas após uma edição de Day_Of_Week do grupo, THE System SHALL atribuir Payment_Status igual a false às novas ocorrências geradas.
5. IF o aplicativo é fechado e reaberto, THEN THE System SHALL restaurar o Payment_Status de todas as Recurring_Occurrences exatamente como estavam antes do fechamento.
