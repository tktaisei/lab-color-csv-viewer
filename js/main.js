// ===== 色空間変換 =====
function rgbToXyz(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  function invGamma(u) {
    return (u > 0.04045) ? Math.pow((u + 0.055) / 1.055, 2.4) : (u / 12.92);
  }
  r = invGamma(r);
  g = invGamma(g);
  b = invGamma(b);
  let X = r*0.4124 + g*0.3576 + b*0.1805;
  let Y = r*0.2126 + g*0.7152 + b*0.0722;
  let Z = r*0.0193 + g*0.1192 + b*0.9505;
  return { X: X * 100, Y: Y * 100, Z: Z * 100 };
}

function xyzToLab(X, Y, Z) {
  const Xn = 95.047, Yn = 100.0, Zn = 108.883;
  let x = X / Xn;
  let y = Y / Yn;
  let z = Z / Zn;
  function f(t) {
    return (t > 0.008856) ? Math.cbrt(t) : (7.787 * t + 16/116);
  }
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);
  return { L, a, b };
}

function rgbToLab(r, g, b) {
  const { X, Y, Z } = rgbToXyz(r, g, b);
  return xyzToLab(X, Y, Z);
}

function labToXyz(L, a, b) {
  const Xn = 95.047, Yn = 100.0, Zn = 108.883;
  let fy = (L + 16) / 116;
  let fx = a / 500 + fy;
  let fz = fy - b / 200;
  function finv(t) {
    const t3 = t * t * t;
    return (t3 > 0.008856) ? t3 : (t - 16/116) / 7.787;
  }
  let x = finv(fx);
  let y = finv(fy);
  let z = finv(fz);
  return {
    X: x * Xn,
    Y: y * Yn,
    Z: z * Zn
  };
}

function xyzToRgb(X, Y, Z) {
  X /= 100; Y /= 100; Z /= 100;
  let r =  3.2406*X - 1.5372*Y - 0.4986*Z;
  let g = -0.9689*X + 1.8758*Y + 0.0415*Z;
  let b =  0.0557*X - 0.2040*Y + 1.0570*Z;
  function gamma(u) {
    return (u <= 0.0031308) ? 12.92 * u : (1.055 * Math.pow(u, 1/2.4) - 0.055);
  }
  r = gamma(r);
  g = gamma(g);
  b = gamma(b);
  r = clamp(Math.round(r * 255), 0, 255);
  g = clamp(Math.round(g * 255), 0, 255);
  b = clamp(Math.round(b * 255), 0, 255);
  return { r, g, b };
}

function labToRgb(L, a, b) {
  const { X, Y, Z } = labToXyz(L, a, b);
  return xyzToRgb(X, Y, Z);
}

// ===== 上部：単色入力 UI =====
const modeRgbBtn = document.getElementById('mode-rgb');
const modeLabBtn = document.getElementById('mode-lab');
const rgbInputsDiv = document.getElementById('rgb-inputs');
const labInputsDiv = document.getElementById('lab-inputs');

const rInput = document.getElementById('r-input');
const gInput = document.getElementById('g-input');
const bInput = document.getElementById('b-input');

const lInput = document.getElementById('l-input');
const aInput = document.getElementById('a-input');
const bLInput = document.getElementById('bL-input');

const applyBtn = document.getElementById('apply-btn');
const resetViewBtn = document.getElementById('reset-view-btn');

const colorBox = document.getElementById('color-box');
const rgbInfo = document.getElementById('rgb-info');
const labInfo = document.getElementById('lab-info');

let currentMode = 'rgb';
let currentRgb = { r: 255, g: 0, b: 0 };
let currentLab = rgbToLab(currentRgb.r, currentRgb.g, currentRgb.b);

const plotDiv = document.getElementById('lab-plot');
const initialCamera = {
  up: { x: 0, y: 0, z: 1 },
  center: { x: 0, y: 0, z: 0 },
  eye: { x: 1.8, y: 1.8, z: 1.4 }
};

// Lab空間の背景点群
const labBackground = (function generateLabBackground() {
  const xs = [], ys = [], zs = [], colors = [];
  for (let L = 10; L <= 90; L += 10) {
    for (let a = -80; a <= 80; a += 20) {
      for (let b = -80; b <= 80; b += 20) {
        const rgb = labToRgb(L, a, b);
        xs.push(a);
        ys.push(b);
        zs.push(L);
        colors.push(`rgb(${rgb.r},${rgb.g},${rgb.b})`);
      }
    }
  }
  return { x: xs, y: ys, z: zs, colors: colors };
})();

function drawPlot() {
  const data = [
    {
      x: labBackground.x,
      y: labBackground.y,
      z: labBackground.z,
      mode: 'markers',
      type: 'scatter3d',
      marker: { size: 3, opacity: 0.7, color: labBackground.colors },
      hoverinfo: 'skip',
      name: 'Lab space'
    },
    {
      x: [currentLab.a],
      y: [currentLab.b],
      z: [currentLab.L],
      mode: 'markers',
      type: 'scatter3d',
      marker: {
        size: 10,
        opacity: 1.0,
        color: `rgb(${currentRgb.r},${currentRgb.g},${currentRgb.b})`,
        line: { width: 1, color: '#000000' }
      },
      name: 'Selected color'
    }
  ];
  const layout = {
    margin: { l: 0, r: 0, t: 0, b: 0 },
    scene: {
      xaxis: { title: 'a*', range: [-100, 100], zeroline: true },
      yaxis: { title: 'b*', range: [-100, 100], zeroline: true },
      zaxis: { title: 'L*', range: [0, 100], zeroline: true },
      aspectmode: 'cube',
      camera: initialCamera
    }
  };
  Plotly.newPlot(plotDiv, data, layout, { responsive: true });
}

function updatePlotOnlyPoint() {
  const data = [
    {
      x: labBackground.x,
      y: labBackground.y,
      z: labBackground.z,
      mode: 'markers',
      type: 'scatter3d',
      marker: { size: 3, opacity: 0.7, color: labBackground.colors },
      hoverinfo: 'skip',
      name: 'Lab space'
    },
    {
      x: [currentLab.a],
      y: [currentLab.b],
      z: [currentLab.L],
      mode: 'markers',
      type: 'scatter3d',
      marker: {
        size: 10,
        opacity: 1.0,
        color: `rgb(${currentRgb.r},${currentRgb.g},${currentRgb.b})`,
        line: { width: 1, color: '#000000' }
      },
      name: 'Selected color'
    }
  ];
  Plotly.react(plotDiv, data, plotDiv.layout);
}

function resetCameraView() {
  Plotly.relayout(plotDiv, { 'scene.camera': initialCamera });
}

function updatePreview() {
  colorBox.style.backgroundColor = `rgb(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b})`;
  rgbInfo.textContent = `RGB: (${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b})`;
  labInfo.textContent = `Lab: (L*=${currentLab.L.toFixed(1)}, a*=${currentLab.a.toFixed(1)}, b*=${currentLab.b.toFixed(1)})`;
}

function applyFromRgbInputs() {
  let r = parseInt(rInput.value, 10);
  let g = parseInt(gInput.value, 10);
  let b = parseInt(bInput.value, 10);
  if (isNaN(r)) r = 0;
  if (isNaN(g)) g = 0;
  if (isNaN(b)) b = 0;
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  rInput.value = r;
  gInput.value = g;
  bInput.value = b;
  currentRgb = { r, g, b };
  currentLab = rgbToLab(r, g, b);
  lInput.value = currentLab.L.toFixed(2);
  aInput.value = currentLab.a.toFixed(2);
  bLInput.value = currentLab.b.toFixed(2);
  updatePreview();
  updatePlotOnlyPoint();
}

function applyFromLabInputs() {
  let L = parseFloat(lInput.value);
  let a = parseFloat(aInput.value);
  let b = parseFloat(bLInput.value);
  if (isNaN(L)) L = 0;
  if (isNaN(a)) a = 0;
  if (isNaN(b)) b = 0;
  L = clamp(L, 0, 100);
  a = clamp(a, -128, 128);
  b = clamp(b, -128, 128);
  lInput.value = L.toFixed(2);
  aInput.value = a.toFixed(2);
  bLInput.value = b.toFixed(2);
  currentLab = { L, a, b };
  currentRgb = labToRgb(L, a, b);
  rInput.value = currentRgb.r;
  gInput.value = currentRgb.g;
  bInput.value = currentRgb.b;
  updatePreview();
  updatePlotOnlyPoint();
}

modeRgbBtn.addEventListener('click', () => {
  currentMode = 'rgb';
  modeRgbBtn.classList.add('active');
  modeLabBtn.classList.remove('active');
  rgbInputsDiv.style.display = 'block';
  labInputsDiv.style.display = 'none';
});

modeLabBtn.addEventListener('click', () => {
  currentMode = 'lab';
  modeLabBtn.classList.add('active');
  modeRgbBtn.classList.remove('active');
  rgbInputsDiv.style.display = 'none';
  labInputsDiv.style.display = 'block';
});

applyBtn.addEventListener('click', () => {
  if (currentMode === 'rgb') applyFromRgbInputs();
  else applyFromLabInputs();
});

[rInput, gInput, bInput, lInput, aInput, bLInput].forEach(el => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (currentMode === 'rgb') applyFromRgbInputs();
      else applyFromLabInputs();
    }
  });
});

resetViewBtn.addEventListener('click', resetCameraView);

// ===== 下部：CSV 可視化 =====
const csvFileInput = document.getElementById('csv-file-input');
const csvColorSetsWrapper = document.getElementById('csv-color-sets-wrapper');
const csvColumnRSelect = document.getElementById('csv-col-r');
const csvColumnGSelect = document.getElementById('csv-col-g');
const csvColumnBSelect = document.getElementById('csv-col-b');
const csvLabel1 = document.getElementById('csv-label-1');
const csvLabel2 = document.getElementById('csv-label-2');
const csvLabel3 = document.getElementById('csv-label-3');
const csvColorAddBtn = document.getElementById('csv-color-add-btn');
const csvColorRemoveBtn = document.getElementById('csv-color-remove-btn');

const csvLoadBtn = document.getElementById('csv-load-btn');
const csvTableContainer = document.getElementById('csv-table-container');
const csvSummary = document.getElementById('csv-summary');
const csvMaxRowsInput = document.getElementById('csv-max-rows');
const csvColorModeInputs = document.querySelectorAll('input[name="csv-color-mode"]');

const csvKeyColSelect = document.getElementById('csv-key-col');
const imgFolderInput = document.getElementById('img-folder');
const imgMatchBtn = document.getElementById('img-match-btn');

let csvColorMode = 'rgb';
let csvData = [];
let csvHeaders = [];
const MAX_COLOR_SETS = 5;
const MIN_COLOR_SETS = 1;
const csvColorSets = [
  {
    root: csvColorSetsWrapper.querySelector('.csv-color-set[data-set-index="0"]'),
    rSelect: csvColumnRSelect,
    gSelect: csvColumnGSelect,
    bSelect: csvColumnBSelect,
    label1: csvLabel1,
    label2: csvLabel2,
    label3: csvLabel3,
  },
];
let lastColorCols = [];

// 画像マッピング関連
let imageFileMap = {};        // base -> { f: {url}, r: {url} }
let csvImageKeyColumn = null; // キー列名
let csvImageEnabled = false;  // マッチング有効か

function updateCsvLabels() {
  csvColorSets.forEach((set) => {
    if (csvColorMode === 'rgb') {
      set.label1.textContent = 'R列';
      set.label2.textContent = 'G列';
      set.label3.textContent = 'B列';
    } else {
      set.label1.textContent = 'L列';
      set.label2.textContent = 'a列';
      set.label3.textContent = 'b列';
    }
  });
}

csvColorModeInputs.forEach((el) => {
  el.addEventListener('change', () => {
    csvColorMode = el.value;
    updateCsvLabels();
  });
});

function fillCsvSelectOptions(selectEl) {
  selectEl.innerHTML = '';
  csvHeaders.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = h;
    selectEl.appendChild(opt);
  });
}

// 色成分セットを追加
csvColorAddBtn.addEventListener('click', () => {
  if (csvColorSets.length >= MAX_COLOR_SETS) {
    alert('色成分セットは最大5個までです。');
    return;
  }
  const template = csvColorSets[0].root;
  const clone = template.cloneNode(true);
  clone.removeAttribute('data-set-index');
  clone.dataset.setIndex = String(csvColorSets.length);
  // 重複IDを削除
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

  const labels = clone.querySelectorAll('label');
  const selects = clone.querySelectorAll('select');
  const set = {
    root: clone,
    label1: labels[0],
    label2: labels[1],
    label3: labels[2],
    rSelect: selects[0],
    gSelect: selects[1],
    bSelect: selects[2],
  };

  if (csvHeaders.length) {
    fillCsvSelectOptions(set.rSelect);
    fillCsvSelectOptions(set.gSelect);
    fillCsvSelectOptions(set.bSelect);
    set.rSelect.disabled = false;
    set.gSelect.disabled = false;
    set.bSelect.disabled = false;

    // 初期値は 2,3,4 列目を使用（存在すれば）
    if (csvHeaders.length >= 4) {
      set.rSelect.value = csvHeaders[1];
      set.gSelect.value = csvHeaders[2];
      set.bSelect.value = csvHeaders[3];
    }
  } else {
    set.rSelect.disabled = true;
    set.gSelect.disabled = true;
    set.bSelect.disabled = true;
  }

  csvColorSetsWrapper.appendChild(clone);
  csvColorSets.push(set);
  updateCsvLabels();
});

// 色成分セットを削除（常に1つは残す）
csvColorRemoveBtn.addEventListener('click', () => {
  if (csvColorSets.length <= MIN_COLOR_SETS) return;
  const removed = csvColorSets.pop();
  csvColorSetsWrapper.removeChild(removed.root);
});

csvFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      csvData = results.data;
      csvHeaders = results.meta.fields || [];

      if (!csvHeaders.length) {
        csvColumnRSelect.disabled = true;
        csvColumnGSelect.disabled = true;
        csvColumnBSelect.disabled = true;
        csvKeyColSelect.disabled = true;
        csvLoadBtn.disabled = true;
        imgMatchBtn.disabled = true;
        csvTableContainer.innerHTML = '<p>列が検出できませんでした。</p>';
        csvSummary.textContent = '';
        return;
      }

      csvColorSets.forEach((set) => {
        fillCsvSelectOptions(set.rSelect);
        fillCsvSelectOptions(set.gSelect);
        fillCsvSelectOptions(set.bSelect);
        set.rSelect.disabled = false;
        set.gSelect.disabled = false;
        set.bSelect.disabled = false;
      });
      fillCsvSelectOptions(csvKeyColSelect);

      csvKeyColSelect.disabled = false;
      csvLoadBtn.disabled = false;
      imgMatchBtn.disabled = false;
      csvSummary.textContent = `全 ${csvData.length} 行（「CSVを表示」で最大行数までプレビュー）`;

      // 初期値: 2列目,3列目,4列目を R/G/B or L/a/b に設定（不足時はある範囲で）
      csvColorSets.forEach((set) => {
        if (csvHeaders.length >= 4) {
          set.rSelect.value = csvHeaders[1];
          set.gSelect.value = csvHeaders[2];
          set.bSelect.value = csvHeaders[3];
        } else {
          if (csvHeaders[0]) set.rSelect.value = csvHeaders[0];
          if (csvHeaders[1]) set.gSelect.value = csvHeaders[1];
          if (csvHeaders[2]) set.bSelect.value = csvHeaders[2];
        }
      });

      // 画像マッチング情報はCSVが変わったらリセット
      csvImageEnabled = false;
      csvImageKeyColumn = null;
    },
    error: (err) => {
      alert('CSVの読み込みに失敗しました: ' + err.message);
    }
  });
});

csvLoadBtn.addEventListener('click', () => {
  if (!csvData.length) return;

  const selectedSets = csvColorSets
    .map((set) => ({
      r: set.rSelect.value,
      g: set.gSelect.value,
      b: set.bSelect.value,
    }))
    .filter((cols) => cols.r && cols.g && cols.b);

  if (!selectedSets.length) {
    alert('少なくとも1つの色成分セットで R/L, G/a, B/b の3列すべてを選択してください。');
    return;
  }

  lastColorCols = selectedSets;
  renderCsvTable(lastColorCols);
});

function parseColorFromRow(row, mode, colR, colG, colB) {
  const v0 = Number(row[colR]);
  const v1 = Number(row[colG]);
  const v2 = Number(row[colB]);
  if (Number.isNaN(v0) || Number.isNaN(v1) || Number.isNaN(v2)) return null;

  if (mode === 'rgb') {
    const r = clamp(Math.round(v0), 0, 255);
    const g = clamp(Math.round(v1), 0, 255);
    const b = clamp(Math.round(v2), 0, 255);
    return { r, g, b };
  } else {
    const L = clamp(v0, 0, 100);
    const a = clamp(v1, -128, 128);
    const b = clamp(v2, -128, 128);
    return labToRgb(L, a, b);
  }
}

function renderCsvTable(colorColsList) {
  if (!csvData.length) return;

  const maxRows = (() => {
    const n = parseInt(csvMaxRowsInput.value, 10);
    return Number.isNaN(n) ? 300 : Math.max(10, n);
  })();

  const total = csvData.length;
  const rowsToShow = Math.min(total, maxRows);

  let html = '<table class="csv-table"><thead><tr>';
  csvHeaders.forEach(h => {
    html += '<th>' + escapeHtml(h) + '</th>';
  });
  colorColsList.forEach((_, idx) => {
    html += '<th>Color' + (idx + 1) + '</th>';
  });
  if (csvImageEnabled) {
    html += '<th>_f</th><th>_r</th>';
  }
  html += '</tr></thead><tbody>';

  for (let i = 0; i < rowsToShow; i++) {
    const row = csvData[i];
    html += '<tr>';
    csvHeaders.forEach(h => {
      const cell = row[h] ?? '';
      html += '<td>' + escapeHtml(String(cell)) + '</td>';
    });

    // 複数の色成分セットを順番に描画
    colorColsList.forEach((cols) => {
      const rgb = parseColorFromRow(row, csvColorMode, cols.r, cols.g, cols.b);
      const cssColor = rgb ? `rgb(${rgb.r},${rgb.g},${rgb.b})` : 'transparent';
      html += '<td><div class="csv-color-swatch" style="background:' + cssColor + ';"></div></td>';
    });

    if (csvImageEnabled && csvImageKeyColumn) {
      const keyVal = row[csvImageKeyColumn];
      const entry = keyVal != null ? imageFileMap[String(keyVal)] : undefined;

      ['f', 'r'].forEach(side => {
        if (entry && entry[side] && entry[side].url) {
          const url = entry[side].url;
          const title = escapeHtml(entry[side].file.name);
          html += '<td><img src="' + url + '" class="preview-img" title="' + title + '"></td>';
        } else {
          html += '<td></td>';
        }
      });
    }

    html += '</tr>';
  }

  html += '</tbody></table>';
  csvTableContainer.innerHTML = html;

  if (rowsToShow < total) {
    csvSummary.textContent = `全 ${total} 行中 ${rowsToShow} 行を表示中（最大表示行数を変更可能）`;
  } else {
    csvSummary.textContent = `全 ${total} 行を表示中`;
  }
}

// ===== 画像フォルダ読み込み & マッチング =====
imgFolderInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  imageFileMap = {};

  files.forEach(file => {
    const name = file.name;
    // 例: 249900XF1021_f.png / 249900XF1021_r.png
    const m = name.match(/^(.*)_([frFR])\.[^.]+$/);
    if (!m) return;
    const base = m[1];
    const side = m[2].toLowerCase(); // 'f' or 'r'
    if (!imageFileMap[base]) imageFileMap[base] = {};
    const url = URL.createObjectURL(file);
    imageFileMap[base][side] = { file, url };
  });

  if (Object.keys(imageFileMap).length === 0) {
    csvImageEnabled = false;
  }
});

imgMatchBtn.addEventListener('click', () => {
  if (!csvData.length) {
    alert('先にCSVを読み込んでください。');
    return;
  }
  const keyCol = csvKeyColSelect.value;
  if (!keyCol) {
    alert('キーとなる列を選択してください。');
    return;
  }
  if (!Object.keys(imageFileMap).length) {
    alert('画像フォルダを選択してください。');
    return;
  }

  csvImageKeyColumn = keyCol;
  csvImageEnabled = true;

  if (lastColorCols.length) {
    renderCsvTable(lastColorCols);
  } else {
    alert('先に「CSVを表示」で色列を設定してください。');
  }
});

// 初期描画
window.addEventListener('load', () => {
  updatePreview();
  updateCsvLabels();
  drawPlot();
});
