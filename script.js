// ---- Tabs física: implementación robusta y accesible ----
(function initPhysTabsRobust() {
  const container = document.getElementById('phys');
  if (!container) return;

  const tabs = Array.from(container.querySelectorAll('.phys-tabs .tab'));
  const panes = Array.from(container.querySelectorAll('.phys-pane'));

  if (!tabs.length || !panes.length) {
    console.warn('initPhysTabsRobust: no se encontraron tabs o panes.');
    return;
  }

  function activateTab(tabBtn) {
    if (!tabBtn) return;
    const targetId = tabBtn.getAttribute('data-target');
    const targetPane = container.querySelector(`#${targetId}`);

    // Desactivar todos los botones y paneles
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    panes.forEach(p => {
      p.classList.remove('active');
      p.setAttribute('aria-hidden', 'true');
    });

    // Activar el botón clicado y su panel
    tabBtn.classList.add('active');
    tabBtn.setAttribute('aria-selected', 'true');
    if (targetPane) {
      targetPane.classList.add('active');
      targetPane.setAttribute('aria-hidden', 'false');
    } else {
      console.warn(`No se encontró el panel con id "${targetId}"`);
    }
  }

  // Escuchar clics
  tabs.forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      activateTab(btn);
    });
  });

  // Estado inicial: el que tenga .active, o el primero
  const initialTab = tabs.find(t => t.classList.contains('active')) || tabs[0];
  activateTab(initialTab);
})();
// --- Simulación del superconductor ---
(function initSuperconductorSim() {
  const tempRange = document.getElementById("tempRange");
  const tempValue = document.getElementById("tempValue");
  const disc = document.getElementById("discSim");
  const shadow = document.getElementById("discShadow");
  const stateTitle = document.getElementById("stateTitle");
  const stateDesc = document.getElementById("stateDesc");
  const stateCard = document.getElementById("stateCard");

  if (!tempRange) return; // nada que hacer si falta el control

  // Mostrar el valor tal cual del control (evita invertirlo)
  function renderTemperatureDisplay(val) {
    const t = Number(val);
    if (Number.isNaN(t)) return;
    if (tempValue) tempValue.textContent = `${t.toFixed(1)} °C`;
  }

  // Actualizar transformaciones visuales según temperatura
  function updateVisuals(temp) {
    const t = Number(temp);
    if (Number.isNaN(t)) return;

    // Mapeo temperatura [-200,25] -> y de levitación: yLevitate (-54) a yRest (0)
    const tMin = -200, tMax = 25;
    const clamped = Math.min(tMax, Math.max(tMin, t));
    const normalized = (clamped - tMin) / (tMax - tMin); // 0..1
    const yLevitate = -54, yRest = 0;
    // Para que cuando temp = 25 -> y = 0 ; temp = -200 -> y = -54
    const y = yLevitate + normalized * (yRest - yLevitate);

    // Aplicar transform al grupo SVG del disco
    if (disc) {
      // disc es <g transform="translate(210,160)">: actualizamos la traslación Y
      disc.setAttribute('transform', `translate(210,${160 + y})`);
    }

    // Ajustar sombra (rx, ry y opacidad) según altura
    if (shadow) {
      const liftRatio = (0 - y) / Math.abs(yLevitate); // 0..1 cuando y en [0,-54]
      const shadowScale = 1 - liftRatio * 0.5;
      const rx = Math.max(18, 50 * shadowScale);
      const ry = Math.max(6, 12 * shadowScale);
      shadow.setAttribute('rx', rx.toString());
      shadow.setAttribute('ry', ry.toString());
      shadow.style.opacity = String(Math.max(0.08, 0.35 * (1 - liftRatio * 0.85)));
    }

    // Actualizar textos de estado según umbrales
    if (stateTitle && stateDesc) {
      if (t > -150) {
        stateTitle.textContent = 'Estado: Normal';
        stateDesc.textContent = 'El material no es superconductor aún, la resistencia eléctrica está presente.';
      } else if (t <= -150 && t > -181) {
        stateTitle.textContent = 'Enfriamiento';
        stateDesc.textContent = 'Los electrones comienzan a formar pares de Cooper.';
      } else if (t <= -181 && t > -195.8) {
        stateTitle.textContent = 'Transición de fase';
        stateDesc.textContent = 'El material alcanza su temperatura crítica y se vuelve superconductor.';
      } else {
        stateTitle.textContent = 'Levitación cuántica';
        stateDesc.textContent = 'Se expulsa el campo magnético interno. El superconductor entra en levitación cuántica.';
      }
    }
  }

  // Inicialización: usar valor actual del input
  const initial = (typeof tempRange.value !== 'undefined') ? tempRange.value : tempRange.getAttribute('value') || 25;
  renderTemperatureDisplay(initial);
  updateVisuals(initial);

  // Eventos: siempre leer el valor numérico del control y actualizar
  tempRange.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    renderTemperatureDisplay(val);
    updateVisuals(val);
  });
  tempRange.addEventListener('change', (e) => {
    const val = Number(e.target.value);
    renderTemperatureDisplay(val);
    updateVisuals(val);
  });
})();