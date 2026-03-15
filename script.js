/* ============================================================
   CALCULADORA PREMIUM — script.js
   Lógica completa: operações encadeadas, teclado físico, ripple
   ============================================================ */

// ── Referências ao DOM ──────────────────────────────────────
const displayEl    = document.getElementById('display');
const expressionEl = document.getElementById('expression');
const keypad       = document.getElementById('calculator');

// ── Estado da calculadora ───────────────────────────────────
// Toda a lógica vive neste objeto para facilitar leitura.
const state = {
  current:            '0',   // Número sendo digitado / resultado exibido
  previous:           null,  // Número anterior (antes do operador)
  operator:           null,  // Operador pendente: '+' '−' '×' '÷'
  justCalculated:     false, // Indica que "=" foi pressionado
  waitingForOperand:  false  // Indica que um operador foi clicado e aguarda novo número
};

// ── Mapa de operadores para o símbolo real ──────────────────
const OP_SYMBOLS = { '+': '+', '−': '−', '×': '×', '÷': '÷' };

// ──────────────────────────────────────────────────────────────
// FUNÇÕES DE DISPLAY
// ──────────────────────────────────────────────────────────────

/**
 * Atualiza o número principal no display.
 * Ajusta o tamanho da fonte conforme o comprimento.
 */
function updateDisplay(value, animate = false) {
  displayEl.textContent = formatNumber(value);

  // Ajuste de fonte responsivo
  const len = String(value).replace('.', '').replace('-', '').length;
  displayEl.classList.remove('display__value--long', 'display__value--xlong');
  if (len > 9)       displayEl.classList.add('display__value--xlong');
  else if (len > 6)  displayEl.classList.add('display__value--long');

  // Animação de resultado
  if (animate) {
    displayEl.classList.remove('display__value--result');
    void displayEl.offsetWidth; // Força reflow para reiniciar animação
    displayEl.classList.add('display__value--result');
  }
}

/**
 * Atualiza a linha de expressão acima do número principal.
 * Ex: "5 + 3 ×"
 */
function updateExpression(text) {
  expressionEl.textContent = text;
}

/**
 * Formata o número para exibição:
 * - Remove zeros desnecessários à esquerda
 * - Usa separador de milhar (pt-BR)
 * - Limita casas decimais para evitar overflow
 */
function formatNumber(value) {
  const str = String(value);

  // Se termina em ponto (usuário digitando decimal), mantém como está
  if (str.endsWith('.')) return str;

  const num = parseFloat(str);
  if (isNaN(num)) return str;

  // Evita notação científica em resultados longos
  if (Math.abs(num) >= 1e12) return num.toExponential(4);

  // Remove excesso de casas decimais de resultados de divisão
  const parts = str.split('.');
  if (parts[1] && parts[1].length > 10) {
    return parseFloat(num.toPrecision(10)).toString();
  }

  return str;
}

// ──────────────────────────────────────────────────────────────
// LÓGICA DAS OPERAÇÕES
// ──────────────────────────────────────────────────────────────

/**
 * Retorna o resultado numérico de: previous OP current
 */
function calculate(prev, curr, op) {
  const a = parseFloat(prev);
  const b = parseFloat(curr);

  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? 'Erro' : a / b;
    default:  return b;
  }
}

/**
 * Processa o input de um dígito (0–9).
 */
function handleDigit(digit) {
  // Se acabou de calcular OU aguarda novo operando após operador, começa número novo
  if (state.justCalculated || state.waitingForOperand) {
    state.current = digit;
    state.justCalculated    = false;
    state.waitingForOperand = false;
  } else {
    // Evita múltiplos zeros no início
    if (state.current === '0' && digit !== '.') {
      state.current = digit;
    } else {
      // Limita a 12 dígitos para não estourar o display
      if (state.current.replace('.', '').replace('-', '').length >= 12) return;
      state.current += digit;
    }
  }
  updateDisplay(state.current);
}

/**
 * Processa ponto decimal.
 */
function handleDecimal() {
  // Não adiciona segundo ponto
  if (state.current.includes('.') && !state.waitingForOperand) return;

  if (state.justCalculated || state.waitingForOperand) {
    state.current = '0.';
    state.justCalculated    = false;
    state.waitingForOperand = false;
  } else {
    state.current += '.';
  }

  updateDisplay(state.current);
}

/**
 * Processa seleção de operador (+, −, ×, ÷).
 * Permite encadeamento: 5 + 3 = calcula 8, depois × 2 usa o 8.
 */
function handleOperator(op) {
  state.justCalculated = false;

  // Se já há operador pendente E o usuário já digitou um segundo número,
  // calcula o resultado parcial antes de armazenar o novo operador.
  if (state.operator && state.previous !== null && !state.waitingForOperand) {

    const result = calculate(state.previous, state.current, state.operator);
    state.previous = String(result);
    state.current  = String(result);
    updateDisplay(result);
  } else {
    state.previous = state.current;
  }

  state.operator          = op;
  state.waitingForOperand = true; // Próximo dígito digitado iniciará número novo

  // Atualiza linha de expressão: "8 ×"
  updateExpression(`${formatNumber(state.previous)} ${OP_SYMBOLS[op]}`);

  // Destaca visualmente o operador ativo
  highlightOperator(op);
}

/**
 * Processa "=" — calcula o resultado final.
 */
function handleEquals() {
  if (!state.operator || state.previous === null) return;

  const expr = `${formatNumber(state.previous)} ${OP_SYMBOLS[state.operator]} ${formatNumber(state.current)}`;
  const result = calculate(state.previous, state.current, state.operator);

  updateExpression(`${expr} =`);
  updateDisplay(String(result), true); // true = anima o resultado

  state.current            = String(result);
  state.previous           = null;
  state.operator           = null;
  state.justCalculated     = true;
  state.waitingForOperand  = false;

  clearOperatorHighlight();
}

/**
 * Processa "C" — limpa tudo.
 */
function handleClear() {
  state.current            = '0';
  state.previous           = null;
  state.operator           = null;
  state.justCalculated     = false;
  state.waitingForOperand  = false;

  updateDisplay('0');
  updateExpression('');
  clearOperatorHighlight();
}

/**
 * Processa "⌫" — apaga o último caractere digitado.
 */
function handleBackspace() {
  if (state.justCalculated) {
    handleClear();
    return;
  }
  if (state.current.length <= 1 || state.current === 'Erro') {
    state.current = '0';
  } else {
    state.current = state.current.slice(0, -1);
    // Se sobrou só o "-", reseta para "0"
    if (state.current === '-') state.current = '0';
  }
  updateDisplay(state.current);
}

/**
 * Processa "%" — converte o número atual para porcentagem.
 * Ex: 50 % → 0.5  |  operação pendente: 200 + 10% → 200 + 20
 */
function handlePercent() {
  let value = parseFloat(state.current);
  if (isNaN(value)) return;

  // Se há operação pendente, % é relativo ao valor anterior
  if (state.previous !== null && (state.operator === '+' || state.operator === '−')) {
    value = (parseFloat(state.previous) * value) / 100;
  } else {
    value = value / 100;
  }

  state.current = String(value);
  state.justCalculated = false;
  updateDisplay(state.current);
}

/**
 * Processa "+/−" — inverte o sinal do número atual.
 */
function handleToggleSign() {
  if (state.current === '0' || state.current === 'Erro') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
  updateDisplay(state.current);
}

// ──────────────────────────────────────────────────────────────
// VISUAL: DESTAQUE DO OPERADOR ATIVO
// ──────────────────────────────────────────────────────────────

function highlightOperator(op) {
  clearOperatorHighlight();
  document.querySelectorAll('.btn--op').forEach(btn => {
    if (btn.dataset.value === op) btn.classList.add('btn--op-active');
  });
}

function clearOperatorHighlight() {
  document.querySelectorAll('.btn--op').forEach(btn => {
    btn.classList.remove('btn--op-active');
  });
}

// ──────────────────────────────────────────────────────────────
// ANIMAÇÃO DE RIPPLE / PRESS
// ──────────────────────────────────────────────────────────────

/**
 * Anima o botão ao clique: centraliza o ripple no ponto tocado.
 */
function animateButton(btn, event) {
  const rect = btn.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width)  * 100;
  const y = ((event.clientY - rect.top)  / rect.height) * 100;

  btn.style.setProperty('--rx', `${x}%`);
  btn.style.setProperty('--ry', `${y}%`);

  btn.classList.remove('btn--pressed');
  void btn.offsetWidth; // Força reflow
  btn.classList.add('btn--pressed');
}

// ──────────────────────────────────────────────────────────────
// ROTEADOR DE EVENTOS (clique nos botões)
// ──────────────────────────────────────────────────────────────

keypad.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  animateButton(btn, e);

  const { action, value } = btn.dataset;

  switch (action) {
    case 'digit':       handleDigit(value);      break;
    case 'decimal':     handleDecimal();          break;
    case 'operator':    handleOperator(value);    break;
    case 'equals':      handleEquals();           break;
    case 'clear':       handleClear();            break;
    case 'backspace':   handleBackspace();        break;
    case 'percent':     handlePercent();          break;
    case 'toggle-sign': handleToggleSign();       break;
  }
});

// ──────────────────────────────────────────────────────────────
// SUPORTE AO TECLADO FÍSICO
// ──────────────────────────────────────────────────────────────

/**
 * Mapeia teclas do teclado físico para ações da calculadora.
 */
const KEY_MAP = {
  '0': () => handleDigit('0'),
  '1': () => handleDigit('1'),
  '2': () => handleDigit('2'),
  '3': () => handleDigit('3'),
  '4': () => handleDigit('4'),
  '5': () => handleDigit('5'),
  '6': () => handleDigit('6'),
  '7': () => handleDigit('7'),
  '8': () => handleDigit('8'),
  '9': () => handleDigit('9'),
  '.': () => handleDecimal(),
  ',': () => handleDecimal(),       // Teclado ABNT
  '+': () => handleOperator('+'),
  '-': () => handleOperator('−'),
  '*': () => handleOperator('×'),
  '/': () => handleOperator('÷'),
  'Enter':     () => handleEquals(),
  '=':         () => handleEquals(),
  'Backspace': () => handleBackspace(),
  'Delete':    () => handleClear(),
  'Escape':    () => handleClear(),
  '%':         () => handlePercent(),
};

document.addEventListener('keydown', (e) => {
  // Não captura atalhos como Ctrl+R, Ctrl+C etc.
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const handler = KEY_MAP[e.key];
  if (handler) {
    e.preventDefault();
    handler();

    // Anima visualmente o botão correspondente no teclado
    const btnMap = {
      'Enter': '[data-action="equals"]',
      '=':     '[data-action="equals"]',
      'Backspace': '[data-action="backspace"]',
      'Delete':    '[data-action="clear"]',
      'Escape':    '[data-action="clear"]',
      '%':         '[data-action="percent"]',
      '+': `[data-value="+"]`,
      '-': `[data-value="−"]`,
      '*': `[data-value="×"]`,
      '/': `[data-value="÷"]`,
    };

    const selector = btnMap[e.key]
      || (e.key >= '0' && e.key <= '9' ? `[data-value="${e.key}"]` : null)
      || (e.key === '.' || e.key === ',' ? '[data-action="decimal"]' : null);

    if (selector) {
      const btn = document.querySelector(selector);
      if (btn) {
        // Simula ripple centralizado para teclas físicas
        const rect = btn.getBoundingClientRect();
        animateButton(btn, {
          clientX: rect.left + rect.width  / 2,
          clientY: rect.top  + rect.height / 2
        });
      }
    }
  }
});

// ── Inicialização ───────────────────────────────────────────
updateDisplay('0');
