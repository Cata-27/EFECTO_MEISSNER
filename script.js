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
      disc.setAttribute('transform', `translate(210,${160 + y})`);
    }

    // Ajustar sombra
    if (shadow) {
      const liftRatio = (0 - y) / Math.abs(yLevitate);
      const shadowScale = 1 - liftRatio * 0.5;
      const rx = Math.max(18, 50 * shadowScale);
      const ry = Math.max(6, 12 * shadowScale);
      shadow.setAttribute('rx', rx.toString());
      shadow.setAttribute('ry', ry.toString());
      shadow.style.opacity = String(Math.max(0.08, 0.35 * (1 - liftRatio * 0.85)));
    }

    // Actualizar estado
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

  // Inicialización
  const initial = tempRange.value || 25;
  renderTemperatureDisplay(initial);
  updateVisuals(initial);

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

// --- Botón de sonido ambiental ---
(function initAmbientSound() {
  const btn = document.getElementById('playAudio');
  if (!btn) return;
  const audio = new Audio('Alone.mp3');
  audio.loop = true; // Para que siga sonando en bucle

  btn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().then(() => {
        btn.textContent = '🔇 Pausar sonido';
        btn.setAttribute('aria-pressed', 'true');
      }).catch(err => console.warn('Error al reproducir audio:', err));
    } else {
      audio.pause();
      btn.textContent = '🔊 Sonido ambiental';
      btn.setAttribute('aria-pressed', 'false');
    }
  });
})();
document.addEventListener("DOMContentLoaded", () => {
  const video = document.getElementById("tituloVideo");
  if (video) {
    video.volume = 0.1; // volumen entre 0 (silencio) y 1 (máximo)
  }
});
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      navMenu.classList.toggle('active');
    });

    // Cerrar menú al pulsar un enlace
    navMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // cerrar con Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
});
// --------------------------------------------------------
// --- Galería interactiva (imágenes y videos) ---
document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.getElementById('bookGallery');
  if (!gallery) return;
  
  const items = gallery.querySelectorAll('.page, video');
  if (items.length === 0) return;
  
  let currentIndex = 0;

  // Función para cambiar de imagen/video
  function showItem(index) {
    // Pausar video anterior si existe
    if (items[currentIndex].tagName === 'VIDEO') {
      items[currentIndex].pause();
    }
    
    // Remover active del actual
    items[currentIndex].classList.remove('active');
    
    // Actualizar índice
    currentIndex = index;
    
    // Activar nuevo item
    items[currentIndex].classList.add('active');
    
    // Si es video, reproducir
    if (items[currentIndex].tagName === 'VIDEO') {
      items[currentIndex].currentTime = 0;
      items[currentIndex].play();
    }
  }

  // Mostrar el primero
  showItem(0);

  // Cambiar con UN SOLO CLICK en la galería
  gallery.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextIndex = (currentIndex + 1) % items.length;
    showItem(nextIndex);
  });

  // También permitir navegación con teclado (opcional)
  gallery.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      showItem(nextIndex);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      showItem(prevIndex);
    }
  });

  // Hacer la galería focuseable para navegación por teclado
  gallery.setAttribute('tabindex', '0');
  gallery.style.cursor = 'pointer';
});
// --- Carrusel de imágenes apiladas en INTRODUCCIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  const introStack = document.querySelector('#intro .image-stack');
  if (!introStack) return;
  
  const cards = Array.from(introStack.querySelectorAll('.image-card'));
  if (cards.length === 0) return;
  
  let currentIndex = 0;

  function updateStack() {
    cards.forEach((card, index) => {
      card.style.zIndex = '';
      card.style.transform = '';
      card.style.opacity = '';
      
      if (index === currentIndex) {
        // Primera carta (activa)
        card.style.zIndex = '3';
        card.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        card.style.opacity = '1';
      } else if (index === (currentIndex + 1) % cards.length) {
        // Segunda carta
        card.style.zIndex = '2';
        card.style.transform = 'translateX(-50%) translateY(20px) scale(0.95)';
        card.style.opacity = '0.7';
      } else if (index === (currentIndex + 2) % cards.length) {
        // Tercera carta
        card.style.zIndex = '1';
        card.style.transform = 'translateX(-50%) translateY(40px) scale(0.9)';
        card.style.opacity = '0.4';
      } else {
        // Cartas ocultas
        card.style.zIndex = '0';
        card.style.transform = 'translateX(-50%) translateY(60px) scale(0.85)';
        card.style.opacity = '0';
      }
    });
  }

  function nextCard() {
    currentIndex = (currentIndex + 1) % cards.length;
    updateStack();
  }

  // Click en cualquier carta para avanzar
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      nextCard();
    });
  });

  // También click en el contenedor
  introStack.addEventListener('click', (e) => {
    // Solo si no clickeó una carta directamente
    if (!e.target.closest('.image-card')) {
      nextCard();
    }
  });

  // Estado inicial
  updateStack();
  
  // Hacer cursor pointer en toda el área
  introStack.style.cursor = 'pointer';
  cards.forEach(card => {
    card.style.cursor = 'pointer';
  });
});