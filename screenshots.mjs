const colors = {'TEE 1 ROSA':'rosa','TEE 1 AMARILLO':'amarillo','TEE 1 VERDE':'verde'};
const names = {'TEE 1 ROSA':'Rosa','TEE 1 AMARILLO':'Amarillo','TEE 1 VERDE':'Verde'};

export function executionScreenshots(report) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(report?.executionId || '') || !Array.isArray(report.screenshots)) return [];
  const seen = new Set();
  return report.screenshots.filter(image => {
    if (!image || !Object.hasOwn(colors,image.course) || !['initial','recheck'].includes(image.stage)) return false;
    const holes = image.holes ?? 18;
    if (![9,18].includes(holes) || (holes === 9 && (report.requested != null || !report.availability?.some(snapshot => snapshot.course === image.course && snapshot.holes === 9)))) return false;
    const key = image.course+'|'+holes+'|'+image.stage;
    const path = 'data/executions/'+report.executionId+'/screenshots/'+colors[image.course]+(holes === 9 ? '-9' : '')+'-'+image.stage+'.png';
    if (seen.has(key) || image.path !== path || image.playDate !== report.playDate
        || !Number.isFinite(Date.parse(image.capturedAt)) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(image.capturedAt)
        || !Number.isInteger(image.optionCount) || image.optionCount < 0 || image.optionCount > 500
        || ![2,3,4].includes(image.players) || (report.players != null && image.players !== report.players)) return false;
    seen.add(key);
    return true;
  }).map(image => ({...image})).sort((first,second) =>
    (first.stage === second.stage ? Object.keys(colors).indexOf(first.course)-Object.keys(colors).indexOf(second.course)
      || (second.holes ?? 18)-(first.holes ?? 18) : first.stage === 'initial' ? -1 : 1));
}

export function fitZoom(imageWidth,imageHeight,viewportWidth,viewportHeight) {
  if (!(imageWidth > 0 && imageHeight > 0 && viewportWidth > 24 && viewportHeight > 24)) return 0;
  return Math.min((viewportWidth-24)/imageWidth,(viewportHeight-24)/imageHeight,1);
}

export function boundedZoom(value,minimum) { return Math.max(minimum,Math.min(4,value)); }

function captureTime(value) {
  return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Europe/Madrid',timeZoneName:'short'}).format(new Date(value));
}

export function screenshotViewer(dialog) {
  const image = dialog.querySelector('.screenshot-image');
  const viewport = dialog.querySelector('.screenshot-viewport');
  const plane = dialog.querySelector('.screenshot-plane');
  const status = dialog.querySelector('.screenshot-status');
  const minus = dialog.querySelector('[data-image-action="minus"]');
  const plus = dialog.querySelector('[data-image-action="plus"]');
  const fitButton = dialog.querySelector('[data-image-action="fit"]');
  let images = [], index = 0, zoom = 1, ready = false, fitted = true;
  const fitValue = () => fitZoom(image.naturalWidth,image.naturalHeight,viewport.clientWidth,viewport.clientHeight);
  function setZoom(value) {
    if (!ready) return;
    const centerX = (viewport.scrollLeft+viewport.clientWidth/2)/Math.max(plane.offsetWidth,1);
    const centerY = (viewport.scrollTop+viewport.clientHeight/2)/Math.max(plane.offsetHeight,1);
    const minimum = Math.min(fitValue(),.25);
    zoom = boundedZoom(value,minimum);
    const width = Math.max(1,Math.floor(image.naturalWidth*zoom));
    const height = Math.max(1,Math.floor(image.naturalHeight*zoom));
    image.style.width = width+'px'; image.style.height = height+'px';
    plane.style.width = Math.max(viewport.clientWidth-24,width)+'px';
    plane.style.height = Math.max(viewport.clientHeight-24,height)+'px';
    viewport.scrollLeft = plane.offsetWidth*centerX-viewport.clientWidth/2;
    viewport.scrollTop = plane.offsetHeight*centerY-viewport.clientHeight/2;
    dialog.querySelector('.screenshot-zoom').value = Math.round(zoom*100)+'%';
    minus.disabled = zoom <= minimum+.001;
    plus.disabled = zoom >= 4;
    fitButton.disabled = false;
  }
  function fit() {
    if (!ready || !dialog.open) return;
    fitted = true;
    setZoom(fitValue());
    viewport.scrollLeft = 0; viewport.scrollTop = 0;
  }
  function show() {
    const selected = images[index];
    ready = false;
    image.hidden = true; status.hidden = false; status.textContent = 'Loading image';
    minus.disabled = true; plus.disabled = true; fitButton.disabled = true;
    dialog.querySelector('.screenshot-zoom').value = '--';
    dialog.querySelector('.screenshot-title').textContent = names[selected.course]+' / '+(selected.holes ?? 18)+' holes / '+(selected.stage === 'initial' ? 'Initial' : 'Recheck');
    dialog.querySelector('.screenshot-meta').textContent = captureTime(selected.capturedAt)+' | '+selected.players+' players | '+selected.optionCount+' options | '+(selected.rendering === 'redacted-real-form-v1' ? 'Real website screenshot (redacted)' : 'Rendered snapshot');
    dialog.querySelector('.screenshot-position').textContent = (index+1)+' of '+images.length;
    dialog.querySelector('[data-image-action="previous"]').disabled = index === 0;
    dialog.querySelector('[data-image-action="next"]').disabled = index === images.length-1;
    image.alt = names[selected.course]+' '+(selected.holes ?? 18)+'-hole full-page availability snapshot';
    image.onload = () => { ready = true; image.hidden = false; status.hidden = true; fit(); };
    image.onerror = () => { ready = false; image.hidden = true; status.hidden = false; status.textContent = 'Image unavailable'; };
    image.src = selected.path;
  }
  minus.addEventListener('click',() => { fitted = false; setZoom(zoom-.25); });
  plus.addEventListener('click',() => { fitted = false; setZoom(zoom+.25); });
  fitButton.addEventListener('click',fit);
  dialog.querySelector('[data-image-action="close"]').addEventListener('click',() => dialog.close());
  dialog.querySelector('[data-image-action="previous"]').addEventListener('click',() => { if(index > 0) { index--; show(); } });
  dialog.querySelector('[data-image-action="next"]').addEventListener('click',() => { if(index < images.length-1) { index++; show(); } });
  window.addEventListener('resize',() => { if(dialog.open && ready) { if(fitted) fit(); else setZoom(zoom); } });
  return {
    open(values,position) {
      images = values; index = position;
      if (!images[index]) return;
      if (!dialog.open) dialog.showModal();
      show();
    }
  };
}

export function renderScreenshots(container,report,viewer) {
  container.replaceChildren();
  const images = executionScreenshots(report);
  container.hidden = !images.length;
  if (!images.length) return;
  const heading = document.createElement('h3'); heading.textContent = 'Availability snapshots';
  const description = document.createElement('p'); description.className = 'snapshot-note';
  description.textContent = images.length+' full-page PNGs | Original capture times in Europe/Madrid';
  const stages = ['initial','recheck'].filter(stage => images.some(image => image.stage === stage));
  const controls = document.createElement('div'); controls.className = 'screenshot-stages'; controls.setAttribute('role','group'); controls.setAttribute('aria-label','Capture stage');
  const gallery = document.createElement('div'); gallery.className = 'screenshot-gallery';
  function render(stage) {
    controls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.stage === stage)));
    gallery.replaceChildren();
    const selected = images.filter(image => image.stage === stage);
    selected.forEach((snapshot,position) => {
      const figure = document.createElement('figure'); figure.className = 'screenshot-card';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'screenshot-thumbnail'; button.setAttribute('aria-haspopup','dialog');
      button.setAttribute('aria-label','View '+names[snapshot.course]+' '+(snapshot.holes ?? 18)+'-hole '+stage+' snapshot');
      button.title = 'Open full-page snapshot';
      const image = document.createElement('img'); image.src = snapshot.path; image.alt = names[snapshot.course]+' '+(snapshot.holes ?? 18)+'-hole availability snapshot'; image.loading = 'lazy';
      const error = document.createElement('span'); error.textContent = 'Image unavailable'; error.hidden = true;
      image.addEventListener('error',() => { image.hidden = true; error.hidden = false; });
      button.append(image,error); button.addEventListener('click',() => viewer.open(selected,position));
      const caption = document.createElement('figcaption');
      const title = document.createElement('strong'); title.className = 'screenshot-course '+colors[snapshot.course]; title.textContent = names[snapshot.course]+' / '+(snapshot.holes ?? 18)+' holes';
      const count = document.createElement('span'); count.className = 'sub'; count.textContent = snapshot.optionCount+' options | '+snapshot.players+' players';
      const time = document.createElement('span'); time.className = 'sub'; time.textContent = captureTime(snapshot.capturedAt);
      caption.append(title,count,time); figure.append(button,caption); gallery.append(figure);
    });
  }
  stages.forEach(stage => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.stage = stage;
    button.textContent = (stage === 'initial' ? 'Initial' : 'Recheck')+' / '+images.filter(image => image.stage === stage).length;
    button.addEventListener('click',() => render(stage)); controls.append(button);
  });
  container.append(heading,description,controls,gallery);
  render(stages[0]);
}