# Documento de Requisitos

## Introdução

Melhorias visuais e de estilo para o app GG-Economy Mobile. O objetivo é modernizar a aparência do aplicativo, criar consistência visual através de um sistema de design centralizado, implementar suporte a dark mode, melhorar a tipografia e hierarquia visual, e refinar espaçamentos e componentes para uma experiência mais polida e profissional.

## Glossário

- **Theme_Provider**: Módulo centralizado que fornece tokens de design (cores, tipografia, espaçamentos) para todos os componentes do aplicativo
- **Design_Token**: Valor atômico de design (cor, tamanho de fonte, espaçamento) definido no Theme_Provider e reutilizado consistentemente
- **Color_Palette**: Conjunto completo de cores do aplicativo, incluindo variantes para light mode e dark mode
- **Typography_Scale**: Escala tipográfica hierárquica com tamanhos, pesos e alturas de linha predefinidos
- **Spacing_Scale**: Escala de espaçamentos consistente baseada em múltiplos de uma unidade base (4px)
- **Dark_Mode**: Esquema de cores alternativo otimizado para ambientes com pouca luz
- **Component_Library**: Conjunto de componentes UI reutilizáveis que consomem Design_Tokens do Theme_Provider
- **Visual_Hierarchy**: Organização visual que guia o olhar do usuário através de contraste, tamanho e espaçamento
- **Shadow_System**: Sistema padronizado de elevação usando sombras para criar profundidade entre camadas de UI
- **Tab_Bar**: Barra de navegação inferior com ícones e labels para as seções principais do app

## Requisitos

### Requisito 1: Sistema de Tema Centralizado

**User Story:** Como desenvolvedor, eu quero um sistema de tema centralizado, para que todas as cores, tipografia e espaçamentos sejam consistentes e fáceis de manter.

#### Critérios de Aceitação

1. THE Theme_Provider SHALL exportar uma Color_Palette com variantes semânticas (primary, secondary, success, danger, warning, neutral), cada uma contendo no mínimo 3 tons (light, base, dark), para light mode e dark mode, totalizando no mínimo 36 valores de cor
2. THE Theme_Provider SHALL exportar uma Typography_Scale com pelo menos 6 níveis hierárquicos (display, heading, title, body, caption, overline), onde cada nível define fontSize em pixels (range: 10 a 48), fontWeight (range: 400 a 700) e lineHeight como multiplicador do fontSize (range: 1.2 a 1.8)
3. THE Theme_Provider SHALL exportar uma Spacing_Scale baseada em múltiplos de 4px com pelo menos 8 valores (4, 8, 12, 16, 20, 24, 32, 48)
4. THE Theme_Provider SHALL exportar um Shadow_System com pelo menos 3 níveis de elevação (sm, md, lg), onde cada nível define shadowOffset, shadowOpacity, shadowRadius e elevation para Android
5. THE Theme_Provider SHALL exportar constantes de borderRadius padronizadas (sm: 8, md: 12, lg: 16, xl: 24)
6. THE Theme_Provider SHALL exportar todos os tokens de tema como objetos TypeScript tipados e imutáveis (readonly), permitindo acesso direto via importação de módulo

### Requisito 2: Suporte a Dark Mode

**User Story:** Como usuário, eu quero usar o app em dark mode, para que a interface seja confortável em ambientes com pouca luz e reduza o cansaço visual.

#### Critérios de Aceitação

1. WHEN o dispositivo estiver configurado em dark mode, THE Theme_Provider SHALL fornecer automaticamente a Color_Palette de dark mode para todos os componentes da interface
2. WHILE o Dark_Mode estiver ativo, THE Theme_Provider SHALL aplicar cores de background escuras (luminância relativa ≤ 0.05) e cores de texto claras (luminância relativa ≥ 0.8) em todas as superfícies da aplicação
3. WHILE o Dark_Mode estiver ativo, THE Shadow_System SHALL reduzir a opacidade das sombras em pelo menos 50% em relação ao light mode, mantendo contraste mínimo de 3:1 entre superfícies adjacentes
4. WHEN o usuário alternar o tema do sistema operacional, THE Theme_Provider SHALL atualizar todas as cores do app em no máximo 500 milissegundos, sem necessidade de reiniciar o aplicativo e sem perda do estado atual da tela
5. THE Theme_Provider SHALL manter contraste mínimo de 4.5:1 entre texto e background em ambos os modos (WCAG AA) e contraste mínimo de 3:1 para elementos gráficos e componentes interativos
6. WHILE o Dark_Mode estiver ativo, THE Theme_Provider SHALL configurar a status bar com texto claro e background escuro compatível com a superfície principal da tela

### Requisito 3: Paleta de Cores Refinada

**User Story:** Como usuário, eu quero uma paleta de cores mais harmoniosa e moderna, para que o app transmita profissionalismo e confiança.

#### Critérios de Aceitação

1. THE Color_Palette SHALL definir uma cor primária com 9 variantes de intensidade (50, 100, 200, 300, 400, 500, 600, 700, 800, 900), onde cada variante possui um valor hexadecimal único e a luminosidade decresce progressivamente de 50 (mais claro) a 900 (mais escuro)
2. THE Color_Palette SHALL definir cores semânticas para sucesso (verde), perigo (vermelho), alerta (âmbar) e informação (azul), cada uma com no mínimo 3 variantes: uma variante clara para backgrounds, uma variante padrão para ícones e bordas, e uma variante escura para texto
3. THE Color_Palette SHALL definir uma escala de neutros com pelo menos 10 tons (de branco a preto) para backgrounds, bordas e textos, onde cada tom de texto sobre seu background correspondente atinge uma relação de contraste mínima de 4.5:1 conforme WCAG 2.1 nível AA
4. WHEN uma cor de receita for exibida, THE Component_Library SHALL usar a variante clara de sucesso para background e a variante escura de sucesso para texto
5. WHEN uma cor de despesa for exibida, THE Component_Library SHALL usar a variante clara de perigo para background e a variante escura de perigo para texto
6. THE Component_Library SHALL referenciar exclusivamente tokens da Color_Palette para todas as cores de interface, sem utilizar valores hexadecimais hardcoded nos componentes

### Requisito 4: Tipografia Melhorada

**User Story:** Como usuário, eu quero uma tipografia mais legível e com melhor hierarquia visual, para que eu identifique rapidamente as informações importantes.

#### Critérios de Aceitação

1. THE Typography_Scale SHALL usar a fonte do sistema (San Francisco no iOS, Roboto no Android) com pesos variados (400, 500, 600, 700) para criar hierarquia
2. THE Typography_Scale SHALL definir tamanhos de fonte entre 11px e 34px distribuídos em pelo menos 6 níveis, onde cada nível adjacente difere em no mínimo 2px
3. THE Typography_Scale SHALL definir alturas de linha proporcionais (1.2x a 1.6x o tamanho da fonte) para cada nível
4. WHEN um valor monetário for exibido, THE Component_Library SHALL usar peso 600 ou superior e tamanho mínimo de 16px para garantir destaque
5. WHEN um label secundário for exibido, THE Component_Library SHALL usar peso 400 ou 500, cor neutra atenuada (contraste mínimo de 4.5:1 com o background) e tamanho entre 11px e 13px
6. WHEN um texto exceder o espaço disponível, THE Component_Library SHALL truncar com reticências (numberOfLines) em vez de quebrar o layout

### Requisito 5: Sistema de Espaçamento Consistente

**User Story:** Como usuário, eu quero espaçamentos uniformes entre elementos, para que a interface pareça organizada e profissional.

#### Critérios de Aceitação

1. THE Spacing_Scale SHALL ser aplicada consistentemente em padding e margin de todos os componentes da Component_Library, sem valores numéricos de espaçamento hardcoded
2. THE Component_Library SHALL usar padding interno de cards entre 16px e 24px (valores da Spacing_Scale)
3. THE Component_Library SHALL usar gap entre cards e seções de 12px a 16px (valores da Spacing_Scale)
4. THE Component_Library SHALL usar margens horizontais de tela de 16px em todas as telas
5. WHEN um separador visual for necessário entre seções, THE Component_Library SHALL usar espaçamento vertical de pelo menos 24px ou um divisor sutil com cor neutra de 10-15% de opacidade

### Requisito 6: Cards e Superfícies Refinados

**User Story:** Como usuário, eu quero cards com visual mais moderno e polido, para que as informações fiquem bem organizadas e agradáveis visualmente.

#### Critérios de Aceitação

1. THE Component_Library SHALL aplicar borderRadius de 16px em cards principais (SummaryCard, cards de destaque de tela) e 12px em cards secundários (itens de lista, cards de categoria, cards de configuração)
2. WHILE o light mode estiver ativo, THE Component_Library SHALL aplicar sombras nos cards com shadowOpacity entre 0.04 e 0.08, shadowRadius entre 3px e 6px, e elevation entre 2 e 3
3. WHILE o Dark_Mode estiver ativo, THE Component_Library SHALL usar bordas de 1px com cor neutra em 10-15% de opacidade em vez de sombras nos cards
4. WHEN um card for pressionado, THE Component_Library SHALL aplicar uma transição de opacidade no background com duração entre 100ms e 200ms e activeOpacity entre 0.7 e 0.85
5. THE SummaryCard SHALL usar uma cor de destaque derivada da cor primária do tema (com opacidade entre 0.05 e 0.12) como background para diferenciá-lo visualmente dos demais cards, tanto em light mode quanto em Dark_Mode

### Requisito 7: Navegação e Tab Bar Modernizada

**User Story:** Como usuário, eu quero uma barra de navegação mais elegante e com ícones profissionais, para que a navegação seja intuitiva e visualmente agradável.

#### Critérios de Aceitação

1. THE Tab_Bar SHALL usar ícones vetoriais (SVG ou icon font) em vez de emojis para representar as seções, com cada tab exibindo um ícone distinto que represente sua função (Dashboard, Transações, Entrada Manual, Configurações)
2. WHEN uma tab estiver selecionada, THE Tab_Bar SHALL destacar o ícone com a cor primária e usar a variante preenchida (filled) do ícone
3. WHEN uma tab estiver inativa, THE Tab_Bar SHALL exibir o ícone na variante contorno (outline) em cor neutra com opacidade entre 0.5 e 0.7
4. THE Tab_Bar SHALL ter altura mínima de 49px (excluindo safe area) e cada área de toque de tab SHALL ter no mínimo 44px de altura e 44px de largura
5. WHILE o Dark_Mode estiver ativo, THE Tab_Bar SHALL usar background escuro (#1C1C1E) com borda superior de 0.5px na cor rgba(255, 255, 255, 0.15)
6. THE Tab_Bar SHALL manter o atributo tabBarAccessibilityLabel em cada tab com o nome da seção correspondente para leitores de tela

### Requisito 8: Hierarquia Visual nas Telas

**User Story:** Como usuário, eu quero que as informações mais importantes se destaquem visualmente, para que eu encontre rapidamente o que preciso.

#### Critérios de Aceitação

1. WHEN o Dashboard for exibido, THE SummaryCard SHALL ter elevação (shadow/elevation) pelo menos 1 nível acima dos demais componentes da tela e padding interno mínimo de 20dp, garantindo destaque visual em relação a CategoryBreakdown e TrendChart
2. WHEN uma lista de transações for exibida, THE Component_Library SHALL diferenciar visualmente receitas e despesas utilizando pelo menos dois indicadores simultâneos entre: cor de texto distinta, ícone indicador de tipo e borda lateral colorida
3. THE Component_Library SHALL aplicar uma escala tipográfica com no mínimo 4 níveis hierárquicos onde cada nível inferior tem tamanho de fonte pelo menos 2dp menor que o anterior, seguindo a ordem: título > valor > categoria > data
4. WHEN um formulário for exibido, THE Component_Library SHALL agrupar campos relacionados com espaçamento interno entre campos do mesmo grupo no máximo 50% do espaçamento entre grupos distintos
5. THE Component_Library SHALL aplicar a cor primária do tema exclusivamente em botões de ação principal (submit/save), links de navegação e elementos interativos de seleção, não a utilizando em textos informativos ou rótulos estáticos
6. IF um componente do Dashboard não for o SummaryCard, THEN THE Component_Library SHALL renderizá-lo com elevação e padding menores que os do SummaryCard, de modo que a diferença de hierarquia seja visualmente perceptível sem necessidade de comparação lado a lado

### Requisito 9: Estados Visuais de Componentes

**User Story:** Como usuário, eu quero feedback visual claro ao interagir com elementos, para que eu saiba que minhas ações estão sendo reconhecidas.

#### Critérios de Aceitação

1. WHEN um botão for pressionado, THE Component_Library SHALL reduzir a opacidade do elemento para 0.7 durante o toque
2. WHEN um campo de input estiver focado, THE Component_Library SHALL destacar a borda com a cor primária do tema e aumentar a largura da borda de 1px para 2px
3. WHEN um campo de input contiver erro de validação, THE Component_Library SHALL exibir borda com a cor de perigo do tema, e exibir texto de erro com no máximo 120 caracteres abaixo do campo com espaçamento de 4px
4. IF o erro de validação de um campo for corrigido pelo usuário, THEN THE Component_Library SHALL remover a borda de erro e o texto de erro, retornando ao estado visual padrão (borda 1px com cor neutra)
5. WHEN um card for pressionável, THE Component_Library SHALL reduzir a opacidade para 0.7 durante o toque para indicar interatividade
6. IF um componente estiver em estado desabilitado, THEN THE Component_Library SHALL reduzir a opacidade para 0.5 e impedir todas as interações de toque (onPress não deve ser disparado)

### Requisito 10: Migração de Estilos Inline

**User Story:** Como desenvolvedor, eu quero que todos os estilos hardcoded sejam substituídos por Design_Tokens, para que mudanças de tema se propaguem automaticamente por todo o app.

#### Critérios de Aceitação

1. THE Component_Library SHALL conter zero valores de cor hexadecimal hardcoded (ex: #F2F2F7, #FFFFFF, #3b82f6, #111827) em arquivos de componente dentro de src/components/ e app/, substituindo cada ocorrência por uma referência a um Design_Token do Theme_Provider
2. THE Component_Library SHALL conter zero valores numéricos de fontSize hardcoded em arquivos de componente dentro de src/components/ e app/, substituindo cada ocorrência por uma referência à Typography_Scale do Theme_Provider
3. THE Component_Library SHALL conter zero valores numéricos de margin, padding e gap hardcoded em arquivos de componente dentro de src/components/ e app/, substituindo cada ocorrência por uma referência à Spacing_Scale do Theme_Provider
4. THE Component_Library SHALL conter zero valores numéricos de borderRadius hardcoded em arquivos de componente dentro de src/components/ e app/, substituindo cada ocorrência por uma referência às constantes de borderRadius do Theme_Provider
5. WHEN o Theme_Provider alterar o valor de um Design_Token em tempo de execução, THE Component_Library SHALL renderizar novamente todos os componentes que utilizam aquele token com o novo valor, sem necessidade de reiniciar o aplicativo ou alterar código de componente
6. IF um componente referenciar um Design_Token que não existe no Theme_Provider, THEN THE Component_Library SHALL utilizar um valor fallback definido na escala padrão e registrar um aviso em modo de desenvolvimento
7. THE Component_Library SHALL manter os valores de cor definidos em src/constants/theme.ts (TRANSACTION_COLORS) como Design_Tokens válidos, preservando a compatibilidade com componentes que já os consomem
