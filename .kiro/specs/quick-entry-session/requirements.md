# Requirements Document

## Introduction

A "Sessão de Lançamento Rápido" (Quick Entry Session) é um modo de entrada rápida de transações no GG-Economy Mobile. O usuário configura apenas um título, descrição, mês de referência e data de compra no início da sessão, e depois digita apenas valores monetários em sequência até finalizar. A criação no banco de dados segue a mesma lógica existente (`createTransaction`), adaptando apenas o fluxo de preenchimento para acelerar o cadastro.

Diferente do modo batch atual (que fixa a categoria), a sessão rápida fixa título, descrição, mês de referência e data — permitindo lançar múltiplos valores com esses campos compartilhados.

## Glossary

- **Quick_Entry_Session**: Modo de entrada rápida onde título, descrição, mês de referência e data de compra são definidos uma vez e múltiplos valores são inseridos em sequência
- **Session_Setup_Form**: Formulário inicial exibido ao iniciar uma sessão rápida, onde o usuário preenche título, descrição, mês de referência e data de compra
- **Value_Input_Screen**: Tela de entrada de valores ativa durante a sessão, onde o usuário digita apenas o valor monetário de cada transação
- **Session_Summary**: Resumo exibido ao finalizar a sessão, contendo total de lançamentos e valor total acumulado
- **Transaction_Repository**: Camada de acesso a dados que persiste transações no SQLite usando a função `createTransaction`

## Requirements

### Requirement 1: Session Setup

**User Story:** As a user, I want to configure a title, description, reference month, and purchase date once at the start of a session, so that I can quickly enter multiple transactions without repeating this information.

#### Acceptance Criteria

1. WHEN the user initiates a quick entry session, THE Session_Setup_Form SHALL display fields for title, description, reference month, and purchase date
2. THE Session_Setup_Form SHALL validate that the title has between 1 and 100 characters after trimming
3. THE Session_Setup_Form SHALL validate that the description has at most 500 characters
4. THE Session_Setup_Form SHALL validate that the reference month follows the YYYY-MM format
5. THE Session_Setup_Form SHALL validate that the purchase date is a valid date
6. WHEN all fields pass validation and the user confirms, THE Quick_Entry_Session SHALL transition to the Value_Input_Screen with the configured fields locked

### Requirement 2: Value Input During Active Session

**User Story:** As a user, I want to type only monetary values during an active session, so that I can register expenses as fast as possible.

#### Acceptance Criteria

1. WHILE the Quick_Entry_Session is active, THE Value_Input_Screen SHALL display a numeric input field for entering the transaction amount
2. WHILE the Quick_Entry_Session is active, THE Value_Input_Screen SHALL display the locked title, description, reference month, and purchase date as read-only context
3. WHEN the user submits a value, THE Value_Input_Screen SHALL validate that the amount is between 1 and 99999999999 cents (R$ 0.01 to R$ 999,999,999.99)
4. WHEN a valid amount is submitted, THE Value_Input_Screen SHALL clear the amount input field and remain ready for the next entry
5. WHILE the Quick_Entry_Session is active, THE Value_Input_Screen SHALL display the running entry count and accumulated total value

### Requirement 3: Transaction Persistence

**User Story:** As a user, I want each value I enter to be immediately saved as a transaction in the database, so that my data is not lost if the app closes unexpectedly.

#### Acceptance Criteria

1. WHEN a valid amount is submitted during an active session, THE Transaction_Repository SHALL create a transaction with the session title, session description, session purchase date, session reference month, and the submitted amount
2. THE Transaction_Repository SHALL set `needsReview` to false for transactions created via quick entry session
3. THE Transaction_Repository SHALL set `batchId` to null for transactions created via quick entry session
4. THE Transaction_Repository SHALL use the existing `createTransaction` function without modifications to the database schema
5. IF a database error occurs during transaction creation, THEN THE Value_Input_Screen SHALL display an error message and retain the entered amount for retry

### Requirement 4: Session Limit Enforcement

**User Story:** As a user, I want the session to enforce a maximum entry limit, so that I am aware of the session boundaries.

#### Acceptance Criteria

1. THE Quick_Entry_Session SHALL enforce a maximum of 50 entries per session
2. WHEN the entry count reaches 50, THE Value_Input_Screen SHALL disable the amount input and prompt the user to end the session
3. WHILE the Quick_Entry_Session is active, THE Value_Input_Screen SHALL display the remaining entry count (e.g., "3/50")

### Requirement 5: Session Finalization

**User Story:** As a user, I want to end the session at any time and see a summary of what was registered, so that I have feedback on my entries.

#### Acceptance Criteria

1. WHILE the Quick_Entry_Session is active, THE Value_Input_Screen SHALL display a button to end the session
2. WHEN the user ends the session, THE Quick_Entry_Session SHALL display the Session_Summary with total entries created and total accumulated value
3. WHEN the user dismisses the Session_Summary, THE Quick_Entry_Session SHALL reset all session state and return to the session setup or previous navigation screen
4. IF the user navigates away or the app goes to background during an active session, THEN THE Quick_Entry_Session SHALL preserve the session state until the user explicitly ends the session or the app process is terminated

### Requirement 6: Session State Management

**User Story:** As a user, I want the session state to be managed in memory with no extra database tables, so that the feature is lightweight and consistent with existing patterns.

#### Acceptance Criteria

1. THE Quick_Entry_Session SHALL store session state (title, description, reference month, purchase date, entry count, total value) in a Zustand store
2. THE Quick_Entry_Session SHALL reset all in-memory state when the session ends
3. THE Quick_Entry_Session SHALL prevent starting a new session while another session is active

### Requirement 7: Category Selection

**User Story:** As a user, I want to select a category during session setup, so that all entries in the session are automatically categorized.

#### Acceptance Criteria

1. THE Session_Setup_Form SHALL display a category selector as a required field
2. THE Session_Setup_Form SHALL validate that a category is selected before allowing the session to start
3. WHEN the session starts, THE Transaction_Repository SHALL assign the selected category to all transactions created during the session
