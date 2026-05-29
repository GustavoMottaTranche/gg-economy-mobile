# Plano de Teste Manual — Payment Status Tracking & Weekly Recurring Expenses

## Pré-requisitos

- App instalado no celular via `expo run:android`
- Celular conectado ao mesmo Wi-Fi que o computador (para hot reload)

---

## Parte 1: Weekly Recurring Expenses (Gastos Semanais)

### Teste 1.1 — Criar um gasto semanal

1. Na **Home**, toque no link **"📅 Gastos semanais"** (aparece se já houver gastos semanais) OU navegue para a tela **"Novo"** (tab Manual)
2. Na tela Manual, ative o **modo Parcelamento** (switch)
3. Ative **"Parcela infinita"** (switch)
4. Preencha:
   - Título: `Internet`
   - Valor: `100`
   - Categoria: qualquer uma de despesa
   - Mês inicial: mês atual
5. Em **"Status de pagamento"**, selecione **"Todas pendentes"**
6. Toque em **Salvar**

**Resultado esperado:** Mensagem de sucesso. O gasto recorrente mensal foi criado.

### Teste 1.2 — Criar um gasto semanal (via tela dedicada)

1. Na **Home**, toque em **"📅 Gastos semanais"**
2. Toque no botão de **criar** (+ ou "Novo")
3. Preencha:
   - Nome: `Feira`
   - Valor: `50`
   - Dia da semana: **Sábado**
   - Categoria: qualquer uma
4. Em **"Status de pagamento"**, selecione **"Marcar primeira como paga"**
5. Toque em **Criar**

**Resultado esperado:** Grupo criado. Ao ver as ocorrências, a primeira deve estar marcada como paga (check verde).

### Teste 1.3 — Visualizar ocorrências

1. Na lista de gastos semanais, toque no grupo **"Feira"**
2. Verifique a lista de ocorrências com datas (sábados do mês)

**Resultado esperado:** Lista de ocorrências com datas de sábado, cada uma com um toggle de status (check/círculo vazio). A primeira deve estar com check verde.

---

## Parte 2: Payment Status Tracking

### Teste 2.1 — Marcar ocorrência como paga (Entry Screen)

1. Na tela de detalhe do grupo "Feira" (teste 1.3)
2. Toque no **toggle** (círculo vazio) de uma ocorrência pendente

**Resultado esperado:** O toggle muda para check verde. O resumo "X de Y pagas" atualiza.

### Teste 2.2 — Marcar todas como pagas (Bulk Mark)

1. Na tela de detalhe do grupo "Feira"
2. Verifique o texto **"X de Y pagas"** no topo
3. Toque no botão **"Marcar todas como pagas"**

**Resultado esperado:** Toast de confirmação com o número de ocorrências marcadas. Todos os toggles ficam verdes. O botão fica desabilitado (todas já pagas).

### Teste 2.3 — Seção "Contas pendentes" na Home

1. Volte para a **Home**
2. Procure a seção **"Contas pendentes"** entre o SummaryCard e os gráficos

**Resultado esperado:**
- Se houver ocorrências com `isPaid=false` no mês selecionado, a seção aparece com a lista de itens pendentes
- Cada item mostra: nome do grupo, valor formatado, data, e um toggle
- Se todas estiverem pagas, a seção NÃO aparece (está oculta)

### Teste 2.4 — Marcar como paga pela Home

1. Na seção "Contas pendentes" da Home
2. Toque no **toggle** de um item pendente

**Resultado esperado:** O item desaparece da lista (foi marcado como pago). Se era o último item, a seção inteira desaparece.

### Teste 2.5 — Navegar para detalhe pela Home

1. Na seção "Contas pendentes" da Home
2. Toque no **nome/área** de um item (não no toggle)

**Resultado esperado:** Navega para a tela de detalhe (Entry Screen) do grupo correspondente.

### Teste 2.6 — Previsto vs. Pago no SummaryCard

1. Na **Home**, olhe o **SummaryCard** (card principal com saldo)
2. Procure a seção **"Previsto vs. Pago"** na parte inferior do card

**Resultado esperado:**
- **Previsto:** soma de todos os gastos recorrentes do mês (valor total)
- **Pago:** soma dos que estão marcados como pagos (cor verde)
- **Pendente:** diferença (cor laranja)
- Se não houver gastos recorrentes, essa seção NÃO aparece

### Teste 2.7 — Navegação entre meses

1. Na **Home**, navegue para o mês anterior (seta ←)
2. Verifique se a seção "Contas pendentes" e "Previsto vs. Pago" atualizam

**Resultado esperado:** Os dados mudam conforme o mês selecionado. Meses sem gastos recorrentes não mostram essas seções.

---

## Parte 3: Opções de Status na Criação

### Teste 3.1 — "Todas pendentes" (padrão)

1. Crie um novo gasto semanal com opção **"Todas pendentes"**
2. Abra o detalhe do grupo

**Resultado esperado:** Todas as ocorrências estão com toggle vazio (pendentes).

### Teste 3.2 — "Marcar primeira como paga"

1. Crie um novo gasto semanal com opção **"Marcar primeira como paga"**
2. Abra o detalhe do grupo

**Resultado esperado:** Apenas a primeira ocorrência (data mais antiga) está com check verde. As demais estão pendentes.

### Teste 3.3 — "Marcar todas como pagas"

1. Crie um novo gasto semanal com opção **"Marcar todas como pagas"**
2. Abra o detalhe do grupo

**Resultado esperado:** Todas as ocorrências estão com check verde (pagas).

---

## Parte 4: Persistência

### Teste 4.1 — Status sobrevive ao fechar o app

1. Marque algumas ocorrências como pagas
2. Feche o app completamente (remova dos recentes)
3. Reabra o app

**Resultado esperado:** Os status de pagamento estão exatamente como antes de fechar.

### Teste 4.2 — Edição de grupo preserva status

1. Tenha um grupo com algumas ocorrências pagas e outras pendentes
2. Edite o grupo (mude o nome ou valor)
3. Volte para o detalhe

**Resultado esperado:** Os status de pagamento de todas as ocorrências permanecem inalterados.

---

## Parte 5: Parcelas (fix do valor)

### Teste 5.1 — Valor por parcela correto

1. Na tela **"Novo"** (Manual), ative **Parcelamento**
2. Digite valor: `100`
3. Número de parcelas: `5`
4. Verifique o preview das parcelas

**Resultado esperado:** 5 parcelas de R$ 100,00 cada (total R$ 500,00). NÃO deve mostrar R$ 20,00 por parcela.

---

## Checklist Rápido

| # | Teste | Status |
|---|-------|--------|
| 1.1 | Criar gasto recorrente mensal (infinito) | ☐ |
| 1.2 | Criar gasto semanal com "primeira paga" | ☐ |
| 1.3 | Visualizar ocorrências do grupo | ☐ |
| 2.1 | Toggle individual na Entry Screen | ☐ |
| 2.2 | Bulk Mark (marcar todas) | ☐ |
| 2.3 | Seção "Contas pendentes" na Home | ☐ |
| 2.4 | Marcar como paga pela Home | ☐ |
| 2.5 | Navegar para detalhe pela Home | ☐ |
| 2.6 | Previsto vs. Pago no SummaryCard | ☐ |
| 2.7 | Navegação entre meses atualiza dados | ☐ |
| 3.1 | Opção "Todas pendentes" | ☐ |
| 3.2 | Opção "Marcar primeira como paga" | ☐ |
| 3.3 | Opção "Marcar todas como pagas" | ☐ |
| 4.1 | Persistência após fechar app | ☐ |
| 4.2 | Edição preserva status | ☐ |
| 5.1 | Valor por parcela correto (não divide) | ☐ |

---

## Notas

- A seção **"Contas pendentes"** e **"Previsto vs. Pago"** só aparecem quando existem gastos recorrentes cadastrados para o mês
- O link **"📅 Gastos semanais"** na Home só aparece quando há gastos semanais com total > 0 no mês
- Para acessar a criação de gastos semanais diretamente: Home → "📅 Gastos semanais" → botão de criar
- Para criar gastos recorrentes mensais: tab "Novo" → ativar Parcelamento → ativar "Parcela infinita"
