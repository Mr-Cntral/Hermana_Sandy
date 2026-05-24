const STORAGE_KEY = 'hermana_sandy_catequistas_v2';

let registros = cargarRegistros();
let selectedId = null;
let currentStep = 1;

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

const fields = {
  editId: $('#editId'),
  nombre: $('#nombre'),
  dni: $('#dni'),
  telefono: $('#telefono'),
  direccion: $('#direccion'),
  sector: $('#sector'),
  estado: $('#estado'),
  cursoFormacion: $('#cursoFormacion'),
  cursosLlevados: $('#cursosLlevados'),
  cursoSector: $('#cursoSector'),
  fechaRegistro: $('#fechaRegistro'),
  observaciones: $('#observaciones')
};

function cargarRegistros() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function guardarRegistros() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2100);
}

function goTo(viewId) {
  $$('.view').forEach(view => view.classList.remove('active'));
  const nextView = document.getElementById(viewId);
  if (nextView) nextView.classList.add('active');

  $$('.bottom-nav button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  if (viewId === 'vistaLista') renderLista();
  if (viewId === 'vistaPeriodo') renderPeriodo();
  if (viewId === 'vistaEstadisticas') renderEstadisticas();
  if (viewId === 'vistaRegistrar' && !fields.editId.value) prepararNuevo();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStep(step) {
  currentStep = Number(step);
  $$('.form-step').forEach(panel => {
    panel.classList.toggle('active', Number(panel.dataset.stepPanel) === currentStep);
  });
  $$('.step-pill').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.step) === currentStep);
  });
}

function prepararNuevo() {
  $('#formTitle').textContent = 'Registrar catequista';
  fields.editId.value = '';
  $('#catequistaForm').reset();
  fields.estado.value = 'Activo';
  fields.fechaRegistro.value = today();
  setStep(1);
}

function validarPasoUno() {
  if (!fields.nombre.value.trim()) {
    showToast('Primero escriba el nombre completo.');
    fields.nombre.focus();
    return false;
  }
  return true;
}

function crearRegistroDesdeFormulario() {
  return {
    id: fields.editId.value || crypto.randomUUID(),
    nombre: fields.nombre.value.trim(),
    dni: fields.dni.value.trim(),
    telefono: fields.telefono.value.trim(),
    direccion: fields.direccion.value.trim(),
    sector: fields.sector.value.trim(),
    estado: fields.estado.value,
    cursoFormacion: fields.cursoFormacion.value.trim(),
    cursosLlevados: fields.cursosLlevados.value.trim(),
    cursoSector: fields.cursoSector.value.trim(),
    fechaRegistro: fields.fechaRegistro.value || today(),
    observaciones: fields.observaciones.value.trim(),
    actualizado: new Date().toISOString()
  };
}

function guardarFormulario(event) {
  event.preventDefault();
  if (!validarPasoUno()) return;

  const registro = crearRegistroDesdeFormulario();

  if (fields.editId.value) {
    registros = registros.map(item => item.id === registro.id ? registro : item);
    showToast('Registro actualizado.');
  } else {
    registros.unshift(registro);
    showToast('Catequista registrado.');
  }

  guardarRegistros();
  prepararNuevo();
  renderLista();
  renderEstadisticas();
  goTo('vistaLista');
}

function badgeEstado(estado) {
  const value = estado || 'Activo';
  let extra = 'success';
  if (value === 'En formación') extra = 'warn';
  if (value === 'Inactivo') extra = 'danger';
  return `<span class="badge ${extra}">${escapeHtml(value)}</span>`;
}

function cursosBadges(cursos) {
  const list = String(cursos || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  if (!list.length) return '<span class="muted">Sin cursos registrados</span>';
  return list.map(curso => `<span class="badge">${escapeHtml(curso)}</span>`).join(' ');
}

function filtrarRegistros(query) {
  const q = normalize(query);
  if (!q) return [...registros];
  return registros.filter(item => normalize([
    item.nombre,
    item.dni,
    item.telefono,
    item.direccion,
    item.sector,
    item.estado,
    item.cursoFormacion,
    item.cursosLlevados,
    item.cursoSector,
    item.observaciones
  ].join(' ')).includes(q));
}

function renderLista() {
  const container = $('#listContainer');
  const data = filtrarRegistros($('#searchInput').value);

  if (!data.length) {
    container.innerHTML = '<div class="empty-state">No hay registros para mostrar. Toque “Agregar nuevo” para empezar.</div>';
    return;
  }

  container.innerHTML = data.map(item => `
    <article class="person-card">
      <div class="person-top">
        <div>
          <h3>${escapeHtml(item.nombre)}</h3>
          <div class="person-meta">
            ${item.sector ? `Sector: ${escapeHtml(item.sector)}<br>` : ''}
            ${item.cursoSector ? `Asignación: ${escapeHtml(item.cursoSector)}<br>` : ''}
            ${item.fechaRegistro ? `Registrado: ${escapeHtml(item.fechaRegistro)}` : ''}
          </div>
        </div>
        ${badgeEstado(item.estado)}
      </div>
      <div>${cursosBadges(item.cursosLlevados)}</div>
      <div class="card-actions">
        <button class="btn primary" onclick="verFicha('${item.id}')">Ver ficha</button>
        <button class="btn light" onclick="editarRegistro('${item.id}')">Editar</button>
        <button class="btn danger" onclick="eliminarRegistro('${item.id}')">Eliminar</button>
      </div>
    </article>
  `).join('');
}

function verFicha(id) {
  const item = registros.find(x => x.id === id);
  if (!item) return;
  selectedId = id;

  $('#detailContainer').innerHTML = `
    <article class="detail-card">
      <div class="detail-title">
        <div>
          <h2>${escapeHtml(item.nombre)}</h2>
          <p class="muted">Ficha completa del catequista</p>
        </div>
        ${badgeEstado(item.estado)}
      </div>

      <div class="detail-grid">
        <div class="info-box"><small>DNI</small><strong>${escapeHtml(item.dni) || 'No registrado'}</strong></div>
        <div class="info-box"><small>Celular</small><strong>${escapeHtml(item.telefono) || 'No registrado'}</strong></div>
        <div class="info-box"><small>Dirección</small><strong>${escapeHtml(item.direccion) || 'No registrado'}</strong></div>
        <div class="info-box"><small>Sector</small><strong>${escapeHtml(item.sector) || 'No registrado'}</strong></div>
        <div class="info-box"><small>Curso formación</small><strong>${escapeHtml(item.cursoFormacion) || 'No registrado'}</strong></div>
        <div class="info-box"><small>Curso o sector asignado</small><strong>${escapeHtml(item.cursoSector) || 'No registrado'}</strong></div>
        <div class="info-box"><small>Fecha de registro</small><strong>${escapeHtml(item.fechaRegistro) || 'No registrado'}</strong></div>
        <div class="info-box"><small>Cursos llevados</small><strong>${cursosBadges(item.cursosLlevados)}</strong></div>
      </div>

      <div class="info-box" style="margin-top:12px"><small>Observaciones</small><strong>${escapeHtml(item.observaciones) || 'Sin observaciones'}</strong></div>

      <div class="button-row">
        <button class="btn light" onclick="editarRegistro('${item.id}')">Editar</button>
        <button class="btn danger" onclick="eliminarRegistro('${item.id}')">Eliminar</button>
      </div>
    </article>
  `;

  goTo('vistaFicha');
}

function editarRegistro(id) {
  const item = registros.find(x => x.id === id);
  if (!item) return;

  fields.editId.value = item.id;
  fields.nombre.value = item.nombre || '';
  fields.dni.value = item.dni || '';
  fields.telefono.value = item.telefono || '';
  fields.direccion.value = item.direccion || '';
  fields.sector.value = item.sector || '';
  fields.estado.value = item.estado || 'Activo';
  fields.cursoFormacion.value = item.cursoFormacion || '';
  fields.cursosLlevados.value = item.cursosLlevados || '';
  fields.cursoSector.value = item.cursoSector || '';
  fields.fechaRegistro.value = item.fechaRegistro || today();
  fields.observaciones.value = item.observaciones || '';

  $('#formTitle').textContent = 'Editar catequista';
  setStep(1);
  goTo('vistaRegistrar');
}

function eliminarRegistro(id) {
  const item = registros.find(x => x.id === id);
  if (!item) return;

  const ok = confirm(`¿Eliminar el registro de ${item.nombre}?`);
  if (!ok) return;

  registros = registros.filter(x => x.id !== id);
  guardarRegistros();
  showToast('Registro eliminado.');
  renderLista();
  renderPeriodo();
  renderEstadisticas();
  if (selectedId === id) goTo('vistaLista');
}

function renderPeriodo() {
  const from = $('#dateFrom').value;
  const to = $('#dateTo').value;
  const container = $('#periodContainer');

  const data = registros.filter(item => {
    const date = item.fechaRegistro || '';
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });

  if (!data.length) {
    container.innerHTML = '<div class="empty-state">No hay registros en ese periodo.</div>';
    return;
  }

  container.innerHTML = `
    <div class="card"><strong>Total en el periodo: ${data.length}</strong></div>
    ${data.map(item => `
      <article class="person-card">
        <div class="person-top">
          <div>
            <h3>${escapeHtml(item.nombre)}</h3>
            <div class="person-meta">Fecha: ${escapeHtml(item.fechaRegistro)}<br>Sector: ${escapeHtml(item.sector || 'No registrado')}</div>
          </div>
          ${badgeEstado(item.estado)}
        </div>
        <button class="btn primary full" onclick="verFicha('${item.id}')">Ver ficha</button>
      </article>
    `).join('')}
  `;
}

function countBy(key) {
  return registros.reduce((acc, item) => {
    const value = item[key] || 'No registrado';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function countCourses() {
  const acc = {};
  registros.forEach(item => {
    String(item.cursosLlevados || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
      .forEach(course => { acc[course] = (acc[course] || 0) + 1; });
  });
  return acc;
}

function progressList(title, data) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return `<div class="card"><h3>${title}</h3><p class="muted">Sin datos registrados.</p></div>`;
  const max = Math.max(...entries.map(x => x[1]));
  return `
    <div class="card">
      <h3>${title}</h3>
      <div class="progress-list">
        ${entries.map(([name, count]) => `
          <div class="progress-item">
            <strong>${escapeHtml(name)}</strong>
            <span class="muted">${count} registro(s)</span>
            <div class="progress-line"><div class="progress-fill" style="width:${(count / max) * 100}%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderEstadisticas() {
  const total = registros.length;
  const activos = registros.filter(x => x.estado === 'Activo').length;
  const formacion = registros.filter(x => x.estado === 'En formación').length;
  const inactivos = registros.filter(x => x.estado === 'Inactivo').length;

  $('#statsContainer').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-number">${total}</div><strong>Total registrados</strong></div>
      <div class="stat-card"><div class="stat-number">${activos}</div><strong>Activos</strong></div>
      <div class="stat-card"><div class="stat-number">${formacion}</div><strong>En formación</strong></div>
      <div class="stat-card"><div class="stat-number">${inactivos}</div><strong>Inactivos</strong></div>
    </div>
    ${progressList('Por sector', countBy('sector'))}
    ${progressList('Por curso o asignación', countBy('cursoSector'))}
    ${progressList('Cursos llevados', countCourses())}
  `;
}

function exportar() {
  const blob = new Blob([JSON.stringify(registros, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo-catequistas-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Respaldo exportado.');
}

function importar(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      const ok = confirm('Esto reemplazará los datos guardados en este dispositivo. ¿Continuar?');
      if (!ok) return;
      registros = data;
      guardarRegistros();
      renderLista();
      renderPeriodo();
      renderEstadisticas();
      showToast('Respaldo importado.');
      goTo('vistaLista');
    } catch {
      alert('No se pudo importar. Verifique que sea un archivo de respaldo válido.');
    }
  };
  reader.readAsText(file);
}

$$('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => goTo(btn.dataset.view));
});

$$('.step-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    if (Number(btn.dataset.step) > 1 && !validarPasoUno()) return;
    setStep(btn.dataset.step);
  });
});

$$('.next-step').forEach(btn => {
  btn.addEventListener('click', () => {
    if (Number(btn.dataset.next) > 1 && !validarPasoUno()) return;
    setStep(btn.dataset.next);
  });
});

$('#catequistaForm').addEventListener('submit', guardarFormulario);
$('#cancelEdit').addEventListener('click', prepararNuevo);
$('#searchInput').addEventListener('input', renderLista);
$('#exportBtn').addEventListener('click', exportar);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', event => {
  const file = event.target.files[0];
  if (file) importar(file);
  event.target.value = '';
});

$('#clearAllBtn').addEventListener('click', () => {
  const ok = confirm('¿Está seguro de borrar todos los registros de este dispositivo?');
  if (!ok) return;
  registros = [];
  guardarRegistros();
  renderLista();
  renderPeriodo();
  renderEstadisticas();
  showToast('Todos los registros fueron borrados.');
});

$('#dateFrom').addEventListener('change', renderPeriodo);
$('#dateTo').addEventListener('change', renderPeriodo);

$('#btnThisMonth').addEventListener('click', () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, now.getMonth() + 1, 0).getDate();
  $('#dateFrom').value = `${y}-${m}-01`;
  $('#dateTo').value = `${y}-${m}-${String(last).padStart(2, '0')}`;
  renderPeriodo();
});

$('#btnThisYear').addEventListener('click', () => {
  const y = new Date().getFullYear();
  $('#dateFrom').value = `${y}-01-01`;
  $('#dateTo').value = `${y}-12-31`;
  renderPeriodo();
});

window.verFicha = verFicha;
window.editarRegistro = editarRegistro;
window.eliminarRegistro = eliminarRegistro;

fields.fechaRegistro.value = today();
renderLista();
renderPeriodo();
renderEstadisticas();