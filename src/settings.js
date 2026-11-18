const GROUPS = [
  ['Rolagem', [
    ['rollSpeed', 'Velocidade', 'Controla o ritmo dos dados em movimento.', 50, 200],
    ['duration', 'Duração da rolagem', 'Tempo do lançamento até os dados pararem. Zero usa a duração automática.', 0, 500, 0, 25],
    ['spin', 'Giro dos dados', 'Rotação durante a trajetória dos replays.', 25, 200],
  ]],
  ['Som', [
    ['volume', 'Volume geral', 'Todos os sons da cena.', 0, 100],
    ['impacts', 'Volume das batidas', 'Contatos com o piso, o aro e o outro dado.', 0, 100],
    ['density', 'Frequência das batidas', 'Quantidade de toques adicionais no piso.', 0, 200],
  ]],
  ['Bandeja', [
    ['floor', 'Opacidade do piso', 'Quanto do fundo aparece através da bandeja.', 0, 100],
    ['glow', 'Clarão dos rebotes', 'Intensidade da luz no ponto de impacto.', 0, 200],
  ]],
];
const STORAGE_KEY = 'arcane-dice-settings';
const seconds = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export function createSettings(panel, onChange) {
  const fields = GROUPS.flatMap(([, rows]) => rows);
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    // The offline HTML also works when the browser blocks storage.
  }

  const values = Object.fromEntries(fields.map(([key, , , min, max, initial = 100]) => {
    const value = saved?.[key];
    return [key, Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : initial];
  }));
  const controls = new Map();

  function publish() {
    onChange(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / 100])));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Settings remain available in memory.
    }
  }

  for (const [title, rows] of GROUPS) {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = title;
    group.append(legend);

    for (const [key, label, description, min, max, initial = 100, step = 5] of rows) {
      const row = document.createElement('div');
      row.className = 'bg3-setting-row';
      const id = 'setting-' + key;
      row.innerHTML = `
        <label for="${id}">${label}</label>
        <output for="${id}" aria-hidden="true"></output>
        <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" aria-describedby="${id}-hint">
        <small id="${id}-hint">${description}</small>
      `;
      const input = row.querySelector('input');
      const output = row.querySelector('output');
      function render() {
        input.value = values[key];
        const value = values[key];
        output.value = key === 'duration'
          ? (value === 0 ? 'Automática' : `${seconds.format(value / 100)} s`)
          : `${value}%`;
        input.setAttribute('aria-valuetext', output.value);
      }
      input.addEventListener('input', () => {
        values[key] = input.valueAsNumber;
        render();
        publish();
      });
      render();
      controls.set(key, { render, initial });
      group.append(row);
    }
    panel.querySelector('.bg3-settings-fields').append(group);
  }

  panel.querySelector('#btn-settings-reset').addEventListener('click', () => {
    for (const [key, { render, initial }] of controls) {
      values[key] = initial;
      render();
    }
    publish();
  });
  publish();
}
