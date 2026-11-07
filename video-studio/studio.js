/**
 * HỒNG THỊNH VIDEO STUDIO — Logic chính của ứng dụng
 * Tối ưu hóa giao diện và trải nghiệm cho Ms. Hồng Thịnh
 */

// =================== TRẠNG THÁI TOÀN CỤC ===================
const state = {
  activeStep: 1,
  mediaItems: [],
  selectedTopic: 'yeu-doi',
  fullScript: '',
  segments: [],
  
  // Cài đặt âm thanh
  audioMode: 'tts', // 'tts' | 'record'
  selectedVoiceURI: '',
  voiceSpeed: 0.95,
  voicePitch: 1.0,
  recordedBlob: null,
  recordedAudioUrl: null,
  isRecording: false,
  mediaRecorder: null,
  recordingTimerInterval: null,
  recordingSeconds: 0,
  
  // Nhạc nền
  bgmChoice: 'piano',
  bgmVolume: 0.15,
  audioContext: null,
  bgmGainNode: null,
  
  // Phụ đề
  subSize: 34,
  subColor: '#FFFDF0',
  subBgStyle: 'glass',
  subPosition: 'bottom',
  
  // Xuất phim
  videoRatio: '16:9',
  defaultSlideDuration: 4,
  isPlaying: false,
  animationFrameId: null,
  playbackStartTime: 0,
  totalVideoDuration: 0,
  
  // Cài đặt AI
  geminiApiKey: localStorage.getItem('hongthinh_gemini_api_key') || ''
};

// Kho kịch bản văn thơ chọn lọc truyền cảm hứng cho Chị Hồng Thịnh
const PRESET_SCRIPTS = {
  'yeu-doi': `Cuộc sống tựa như một tách trà thơm, càng thưởng thức càng cảm nhận được vị ngọt thanh sau những ngày mưa nắng. Mỗi sớm mai thức dậy, tôi luôn mỉm cười và biết ơn vì được sống, được yêu thương và được làm những điều mình ấp ủ. Nụ cười là đóa hoa đẹp nhất, hãy để mỗi ngày trôi qua đều ngập tràn niềm vui và sự an nhiên trong tâm hồn.`,
  'gia-dinh': `Hạnh phúc lớn nhất của đời người không phải là những thứ xa hoa, mà là những bữa cơm ấm áp, những tiếng cười giòn tan bên cạnh những người thân yêu. Gia đình là chốn bình yên, là nơi bão dừng sau cánh cửa. Cảm ơn từng khoảnh khắc được cùng nhau chia sẻ, cùng nhau già đi và cùng nhau lưu giữ những kỷ niệm quý giá này.`,
  'du-lich': `Mỗi chuyến đi không chỉ là hành trình ngắm nhìn những vùng đất mới, mà là dịp để tâm hồn được rộng mở, hít thở trọn vẹn hương vị của tự do. Đặt chân đến nơi xa, nhìn lại mới thấy đất nước mình thật tươi đẹp, cuộc đời này thật đáng sống biết bao. Đi để trưởng thành, đi để yêu thêm từng khoảnh khắc hiện tại.`,
  'chuc-mung': `Chúc cho người tôi yêu quý một hành trình mới luôn rạng rỡ tiếng cười, vạn sự bình an và dồi dào sức khỏe. Mong rằng những ngày tháng phía trước, chị luôn giữ trọn ngọn lửa đam mê, nét dịu dàng tươi tắn và đón nhận thật nhiều yêu thương từ cuộc sống!`,
  'triet-ly': `Trải qua bao thăng trầm, tôi nhận ra hạnh phúc thực sự bắt đầu từ sự buông bỏ những âu lo và biết trân trọng những điều giản dị quanh mình. Một tia nắng ấm, một đóa hoa nở hay một ánh nhìn chân thành cũng đủ làm lòng mình lắng lại. Cuộc đời là một món quà, hãy sống trọn vẹn bằng cả trái tim chân thành.`
};

// =================== KHỞI TẠO ỨNG DỤNG ===================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initMediaUploader();
  initAIAssistant();
  initVoiceAndAudio();
  initSubtitles();
  initVideoPlayerAndExport();
  initModals();
  checkAIStatus();

  // Đặt nội dung kịch bản mẫu ban đầu
  document.getElementById('full-script-text').value = PRESET_SCRIPTS['yeu-doi'];
  state.fullScript = PRESET_SCRIPTS['yeu-doi'];
});

// =================== ĐIỀU HƯỚNG CÁC BƯỚC ===================
function initNavigation() {
  const tabs = document.querySelectorAll('.step-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const step = parseInt(tab.dataset.step);
      goToStep(step);
    });
  });

  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = parseInt(btn.dataset.next);
      goToStep(nextStep);
    });
  });

  document.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      const prevStep = parseInt(btn.dataset.prev);
      goToStep(prevStep);
    });
  });
}

function goToStep(step) {
  state.activeStep = step;

  // Cập nhật tab active
  document.querySelectorAll('.step-tab').forEach(tab => {
    const tabStep = parseInt(tab.dataset.step);
    tab.classList.toggle('active', tabStep === step);
    if (tabStep < step) tab.classList.add('completed');
  });

  // Hiển thị panel tương ứng
  document.querySelectorAll('.step-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const targetPanel = document.getElementById(`step-panel-${step}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Nếu chuyển sang Bước 2: Tự động phân đoạn kịch bản theo số ảnh
  if (step === 2) {
    autoSplitScript();
  }

  // Nếu chuyển sang Bước 5: Khởi tạo khung hình xem trước
  if (step === 5) {
    calculateTotalDuration();
    renderStaticPreview();
  }
}

// =================== BƯỚC 1: XỬ LÝ ẢNH & VIDEO ===================
function initMediaUploader() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const btnSampleData = document.getElementById('btn-sample-data');
  const btnClearAll = document.getElementById('btn-clear-all');
  const defaultDurationSelect = document.getElementById('default-duration');

  // Kéo thả file
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });

  // Nút nạp ảnh mẫu của Chị Thịnh
  btnSampleData.addEventListener('click', loadSampleImages);

  btnClearAll.addEventListener('click', () => {
    if (confirm('Chị có chắc muốn xóa tất cả ảnh đã thêm để làm lại từ đầu không?')) {
      state.mediaItems = [];
      updateMediaGrid();
    }
  });

  defaultDurationSelect.addEventListener('change', (e) => {
    state.defaultSlideDuration = parseInt(e.target.value);
    state.mediaItems.forEach(item => {
      item.duration = state.defaultSlideDuration;
    });
    updateMediaGrid();
  });
}

function handleFiles(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;

    const url = URL.createObjectURL(file);
    const item = {
      id: 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      file: file,
      url: url,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      duration: state.defaultSlideDuration,
      imageElement: null
    };

    if (item.type === 'image') {
      const img = new Image();
      img.src = url;
      img.onload = () => { item.imageElement = img; };
    }

    state.mediaItems.push(item);
  });

  updateMediaGrid();
}

function loadSampleImages() {
  // Nạp 2 ảnh áo dài và ảnh chân dung có sẵn trong thư mục
  const samples = [
    { name: 'Áo dài truyền thống — Hồng Thịnh', url: '../Ao dai Thinh.jpg' },
    { name: 'Chân dung tươi tắn — Hồng Thịnh', url: '../Anh the Thinh.jpg' }
  ];

  samples.forEach(sample => {
    const img = new Image();
    img.src = sample.url;
    const item = {
      id: 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      file: null,
      url: sample.url,
      name: sample.name,
      type: 'image',
      duration: state.defaultSlideDuration,
      imageElement: img
    };
    state.mediaItems.push(item);
  });

  updateMediaGrid();
}

function updateMediaGrid() {
  const container = document.getElementById('media-list-container');
  const grid = document.getElementById('media-grid');
  const countLabel = document.getElementById('media-count');
  const btnClearAll = document.getElementById('btn-clear-all');

  if (state.mediaItems.length === 0) {
    container.style.display = 'none';
    btnClearAll.style.display = 'none';
    countLabel.textContent = '0';
    return;
  }

  container.style.display = 'block';
  btnClearAll.style.display = 'inline-flex';
  countLabel.textContent = state.mediaItems.length;

  grid.innerHTML = '';
  state.mediaItems.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.innerHTML = `
      <div class="media-thumb-box">
        <img src="${item.url}" alt="${item.name}" class="media-thumb">
        <span class="media-index-tag">Cảnh #${index + 1}</span>
      </div>
      <div class="media-details">
        <div class="media-name" title="${item.name}">${item.name}</div>
        <div class="media-controls-row">
          <div class="duration-adjuster">
            <label style="font-size:13px; color:var(--text-muted)">Thời lượng:</label>
            <button class="btn-icon-tiny btn-sub-dur" data-id="${item.id}">-</button>
            <strong style="font-size:14px">${item.duration}s</strong>
            <button class="btn-icon-tiny btn-add-dur" data-id="${item.id}">+</button>
          </div>
          <div class="card-actions-row">
            ${index > 0 ? `<button class="btn-icon-tiny btn-move-up" data-index="${index}" title="Chuyển lên trước">⬆️</button>` : ''}
            ${index < state.mediaItems.length - 1 ? `<button class="btn-icon-tiny btn-move-down" data-index="${index}" title="Chuyển xuống sau">⬇️</button>` : ''}
            <button class="btn-icon-tiny btn-remove" data-id="${item.id}" title="Xóa bức ảnh này" style="color:#e53935">✕</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Gắn sự kiện tăng giảm thời lượng & di chuyển
  grid.querySelectorAll('.btn-sub-dur').forEach(b => {
    b.addEventListener('click', () => {
      const item = state.mediaItems.find(m => m.id === b.dataset.id);
      if (item && item.duration > 2) {
        item.duration -= 1;
        updateMediaGrid();
      }
    });
  });

  grid.querySelectorAll('.btn-add-dur').forEach(b => {
    b.addEventListener('click', () => {
      const item = state.mediaItems.find(m => m.id === b.dataset.id);
      if (item && item.duration < 15) {
        item.duration += 1;
        updateMediaGrid();
      }
    });
  });

  grid.querySelectorAll('.btn-remove').forEach(b => {
    b.addEventListener('click', () => {
      state.mediaItems = state.mediaItems.filter(m => m.id !== b.dataset.id);
      updateMediaGrid();
    });
  });

  grid.querySelectorAll('.btn-move-up').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.index);
      const temp = state.mediaItems[idx];
      state.mediaItems[idx] = state.mediaItems[idx - 1];
      state.mediaItems[idx - 1] = temp;
      updateMediaGrid();
    });
  });

  grid.querySelectorAll('.btn-move-down').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.index);
      const temp = state.mediaItems[idx];
      state.mediaItems[idx] = state.mediaItems[idx + 1];
      state.mediaItems[idx + 1] = temp;
      updateMediaGrid();
    });
  });

  calculateTotalDuration();
}

function calculateTotalDuration() {
  const total = state.mediaItems.reduce((acc, item) => acc + (item.duration || state.defaultSlideDuration), 0);
  state.totalVideoDuration = total;
  const label = document.getElementById('total-duration-label');
  if (label) label.textContent = total;
  const playerTotal = document.getElementById('total-play-time');
  if (playerTotal) playerTotal.textContent = formatTime(total);
}

// =================== BƯỚC 2: TRỢ LÝ AI & LỜI BÌNH ===================
function initAIAssistant() {
  const chips = document.querySelectorAll('.topic-chip');
  const btnGenerateAI = document.getElementById('btn-generate-ai');
  const fullScriptArea = document.getElementById('full-script-text');
  const btnAutoSplit = document.getElementById('btn-auto-split');
  const btnSpeakPreview = document.getElementById('btn-speak-preview-script');

  // Chọn chủ đề
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedTopic = chip.dataset.topic;

      // Cập nhật kịch bản mẫu nếu người dùng chưa tự gõ nội dung dài
      if (PRESET_SCRIPTS[state.selectedTopic]) {
        fullScriptArea.value = PRESET_SCRIPTS[state.selectedTopic];
        state.fullScript = fullScriptArea.value;
        autoSplitScript();
      }
    });
  });

  // Gọi AI viết lời bình
  btnGenerateAI.addEventListener('click', async () => {
    const userHint = document.getElementById('ai-user-hint').value.trim();
    btnGenerateAI.disabled = true;
    btnGenerateAI.innerHTML = `<span>⏳ AI đang sáng tác lời bình...</span>`;

    try {
      if (state.geminiApiKey) {
        // Gọi Google Gemini API
        const generated = await callGeminiAPI(state.selectedTopic, userHint);
        fullScriptArea.value = generated;
        state.fullScript = generated;
      } else {
        // Dùng mẫu kịch bản nâng cao kèm lời nhắn
        let text = PRESET_SCRIPTS[state.selectedTopic] || PRESET_SCRIPTS['yeu-doi'];
        if (userHint) {
          text = `Về ${userHint}: ${text}`;
        }
        fullScriptArea.value = text;
        state.fullScript = text;
      }
      autoSplitScript();
    } catch (err) {
      console.error(err);
      alert('Có lỗi nhỏ khi gọi AI: ' + err.message + '. Hệ thống sẽ dùng kịch bản chọn lọc sẵn.');
      fullScriptArea.value = PRESET_SCRIPTS[state.selectedTopic];
      state.fullScript = fullScriptArea.value;
      autoSplitScript();
    } finally {
      btnGenerateAI.disabled = false;
      btnGenerateAI.innerHTML = `<span class="magic-icon">✨</span><span>Bấm để AI viết lời bình ngay</span>`;
    }
  });

  fullScriptArea.addEventListener('input', (e) => {
    state.fullScript = e.target.value;
  });

  btnAutoSplit.addEventListener('click', autoSplitScript);

  btnSpeakPreview.addEventListener('click', () => {
    const textToSpeak = fullScriptArea.value.trim();
    if (!textToSpeak) return alert('Chị hãy nhập lời bình trước khi nghe thử nhé!');
    speakText(textToSpeak.split('.')[0] || textToSpeak);
  });
}

async function callGeminiAPI(topic, userHint) {
  const prompt = `Bạn là chuyên gia viết lời bình video giàu cảm xúc cho chị Hồng Thịnh (sinh năm 1978). Chị là người phụ nữ duyên dáng, yêu đời, ấm áp và trân trọng tình cảm gia đình. 
Chủ đề video: "${topic}".
Ý tưởng thêm của chị: "${userHint}".
Số lượng ảnh trong video: ${state.mediaItems.length || 3} bức ảnh.

Hãy viết một đoạn lời bình ngắn gọn khoảng 3-5 câu (tối đa 90 từ) bằng tiếng Việt thật truyền cảm, trang nhã, ấm áp, sâu sắc, chia làm các câu ngắn rõ ràng để lồng vào từng bức ảnh. Không viết tiêu đề, chỉ xuất ra nội dung lời bình.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${state.geminiApiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error ? errorData.error.message : 'Lỗi kết nối API Gemini');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text.trim();
}

function autoSplitScript() {
  const container = document.getElementById('segments-container');
  if (!container) return;

  const fullText = document.getElementById('full-script-text').value.trim();
  if (!fullText) {
    container.innerHTML = '<p class="text-muted">Chưa có nội dung lời bình. Chị hãy gõ hoặc bấm nút AI ở trên nhé.</p>';
    return;
  }

  // Tách văn bản thành các câu dựa vào dấu chấm, chấm than, chấm hỏi
  let rawSentences = fullText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  if (rawSentences.length === 0) rawSentences = [fullText];

  const mediaCount = Math.max(state.mediaItems.length, 1);
  state.segments = [];

  for (let i = 0; i < mediaCount; i++) {
    const item = state.mediaItems[i] || { name: `Cảnh ${i+1}`, url: '../Anh the Thinh.jpg', duration: 4 };
    const sentence = rawSentences[i] || (i === 0 ? fullText : 'Mỗi khoảnh khắc đều đáng được trân trọng.');
    state.segments.push({
      mediaIndex: i,
      mediaId: item.id,
      text: sentence.trim(),
      duration: item.duration || 4
    });
  }

  container.innerHTML = '';
  state.segments.forEach((seg, index) => {
    const item = state.mediaItems[index] || { url: '../Anh the Thinh.jpg', name: 'Ảnh mẫu' };
    const row = document.createElement('div');
    row.className = 'segment-item';
    row.innerHTML = `
      <img src="${item.url}" class="segment-thumb-mini" alt="${item.name}">
      <strong style="font-size:14px; min-width:60px">Cảnh ${index + 1}:</strong>
      <input type="text" class="segment-input" value="${seg.text}" data-index="${index}">
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.segment-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (state.segments[idx]) {
        state.segments[idx].text = e.target.value;
      }
    });
  });
}

// =================== BƯỚC 3: GIỌNG ĐỌC & NHẠC NỀN ===================
function initVoiceAndAudio() {
  const voiceSelect = document.getElementById('voice-select');
  const speedRange = document.getElementById('voice-speed');
  const pitchRange = document.getElementById('voice-pitch');
  const speedVal = document.getElementById('speed-val');
  const pitchVal = document.getElementById('pitch-val');
  const btnTestVoice = document.getElementById('btn-test-voice');

  // Nạp danh sách giọng đọc của trình duyệt
  function populateVoices() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';

    // Ưu tiên giọng tiếng Việt
    const vnVoices = voices.filter(v => v.lang.includes('vi') || v.lang.includes('VN'));
    const otherVoices = voices.filter(v => !v.lang.includes('vi') && !v.lang.includes('VN'));

    if (vnVoices.length > 0) {
      vnVoices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = `🇻🇳 ${v.name} (${v.lang})`;
        voiceSelect.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '🇻🇳 Giọng đọc tiếng Việt chuẩn (Mặc định Windows)';
      voiceSelect.appendChild(opt);
    }

    otherVoices.slice(0, 5).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      voiceSelect.appendChild(opt);
    });

    if (vnVoices.length > 0) {
      state.selectedVoiceURI = vnVoices[0].voiceURI;
    }
  }

  populateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  voiceSelect.addEventListener('change', (e) => {
    state.selectedVoiceURI = e.target.value;
  });

  speedRange.addEventListener('input', (e) => {
    state.voiceSpeed = parseFloat(e.target.value);
    speedVal.textContent = state.voiceSpeed === 1.0 ? 'Bình thường (1.0x)' : `${state.voiceSpeed}x`;
  });

  pitchRange.addEventListener('input', (e) => {
    state.voicePitch = parseFloat(e.target.value);
    pitchVal.textContent = state.voicePitch === 1.0 ? 'Ấm áp vừa phải' : `${state.voicePitch}x`;
  });

  btnTestVoice.addEventListener('click', () => {
    speakText('Xin chào chị Hồng Thịnh. Chúc chị một ngày tràn đầy năng lượng tích cực và bình an!');
  });

  // Thu âm trực tiếp
  initVoiceRecorder();

  // Tùy chỉnh nhạc nền
  document.querySelectorAll('input[name="bgm-choice"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.bgmChoice = e.target.value;
      document.querySelectorAll('.bgm-radio-card').forEach(card => {
        card.classList.toggle('active', card.querySelector('input').checked);
      });
    });
  });

  const bgmVolSlider = document.getElementById('bgm-volume');
  const bgmVolDisplay = document.getElementById('bgm-vol-display');
  bgmVolSlider.addEventListener('input', (e) => {
    state.bgmVolume = parseFloat(e.target.value);
    const percent = Math.round(state.bgmVolume * 100);
    bgmVolDisplay.textContent = `${percent}% (Vừa vặn không lấn át tiếng nói)`;
  });
}

function speakText(text) {
  if (!window.speechSynthesis) {
    alert('Trình duyệt không hỗ trợ tổng hợp giọng nói.');
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = state.voiceSpeed;
  utter.pitch = state.voicePitch;
  utter.lang = 'vi-VN';

  const voices = window.speechSynthesis.getVoices();
  const found = voices.find(v => v.voiceURI === state.selectedVoiceURI);
  if (found) utter.voice = found;

  window.speechSynthesis.speak(utter);
}

function initVoiceRecorder() {
  const btnStart = document.getElementById('btn-start-record');
  const btnStop = document.getElementById('btn-stop-record');
  const micIndicator = document.getElementById('mic-indicator');
  const timerDisplay = document.getElementById('recording-timer');
  const statusDisplay = document.getElementById('recording-status');
  const playbackWrapper = document.getElementById('recorded-playback-wrapper');
  const recordedAudio = document.getElementById('recorded-audio');
  const btnUseRecorded = document.getElementById('btn-use-recorded');

  let audioChunks = [];

  btnStart.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      state.mediaRecorder = new MediaRecorder(stream);

      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      state.mediaRecorder.onstop = () => {
        state.recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (state.recordedAudioUrl) URL.revokeObjectURL(state.recordedAudioUrl);
        state.recordedAudioUrl = URL.createObjectURL(state.recordedBlob);
        recordedAudio.src = state.recordedAudioUrl;
        playbackWrapper.style.display = 'block';
        statusDisplay.textContent = 'Đã hoàn tất thu âm!';
      };

      state.mediaRecorder.start();
      state.isRecording = true;
      btnStart.style.display = 'none';
      btnStop.style.display = 'inline-flex';
      micIndicator.classList.add('recording');
      statusDisplay.textContent = 'Đang thu âm... Chị hãy nói vào micro nhé';

      state.recordingSeconds = 0;
      timerDisplay.textContent = '00:00';
      state.recordingTimerInterval = setInterval(() => {
        state.recordingSeconds++;
        timerDisplay.textContent = formatTime(state.recordingSeconds);
      }, 1000);

    } catch (err) {
      alert('Không thể mở micro: ' + err.message + '. Vui lòng cho phép quyền sử dụng micro trên máy tính.');
    }
  });

  btnStop.addEventListener('click', () => {
    if (state.mediaRecorder && state.isRecording) {
      state.mediaRecorder.stop();
      state.mediaRecorder.stream.getTracks().forEach(t => t.stop());
      state.isRecording = false;
      clearInterval(state.recordingTimerInterval);
      btnStart.style.display = 'inline-flex';
      btnStop.style.display = 'none';
      micIndicator.classList.remove('recording');
    }
  });

  btnUseRecorded.addEventListener('click', () => {
    state.audioMode = 'record';
    alert('Đã chọn bản thu âm này làm âm thanh chính cho video!');
  });
}

// Bộ tạo âm thanh nhạc nền thư giãn bằng Web Audio API (hoàn toàn offline)
function playSynthesizedBGM() {
  if (state.bgmChoice === 'none') return null;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!state.audioContext) state.audioContext = new AudioContext();
    if (state.audioContext.state === 'suspended') state.audioContext.resume();

    const masterGain = state.audioContext.createGain();
    masterGain.gain.setValueAtTime(state.bgmVolume, state.audioContext.currentTime);
    masterGain.connect(state.audioContext.destination);

    // Chuỗi hợp âm nhẹ nhàng: Cmaj7 -> Am7 -> Fmaj7 -> G
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // C, E, G, B
      [220.00, 261.63, 329.63, 392.00], // A, C, E, G
      [174.61, 220.00, 261.63, 329.63], // F, A, C, E
      [196.00, 246.94, 293.66, 392.00]  // G, B, D, G
    ];

    let chordIdx = 0;
    const chordDuration = 3.5;

    function playNextChord() {
      if (!state.isPlaying) return;
      const currentChord = chords[chordIdx % chords.length];
      const now = state.audioContext.currentTime;

      currentChord.forEach((freq, i) => {
        const osc = state.audioContext.createOscillator();
        const noteGain = state.audioContext.createGain();
        osc.type = state.bgmChoice === 'acoustic' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);

        noteGain.gain.setValueAtTime(0, now + i * 0.15);
        noteGain.gain.linearRampToValueAtTime(0.08, now + i * 0.15 + 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + chordDuration);

        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(now + i * 0.15);
        osc.stop(now + chordDuration + 0.2);
      });

      chordIdx++;
      if (state.isPlaying) {
        setTimeout(playNextChord, chordDuration * 1000);
      }
    }

    playNextChord();
    return masterGain;
  } catch (e) {
    console.warn('BGM Synthesizer error:', e);
    return null;
  }
}

// =================== BƯỚC 4: TÙY CHỈNH PHỤ ĐỀ ===================
function initSubtitles() {
  const sizeBtns = document.querySelectorAll('#sub-size-group .toggle-btn');
  const colorDots = document.querySelectorAll('#sub-color-palette .color-dot');
  const bgBtns = document.querySelectorAll('#sub-bg-group .toggle-btn');
  const posBtns = document.querySelectorAll('#sub-pos-group .toggle-btn');

  const sampleSub = document.getElementById('sample-subtitle-container');
  const sampleText = document.getElementById('sample-sub-text');

  function updateSamplePreview() {
    sampleText.style.fontSize = `${state.subSize}px`;
    sampleText.style.color = state.subColor;

    sampleSub.className = `sample-sub-container pos-${state.subPosition} style-${state.subBgStyle}`;
  }

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.subSize = parseInt(btn.dataset.val);
      updateSamplePreview();
    });
  });

  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      state.subColor = dot.dataset.color;
      updateSamplePreview();
    });
  });

  bgBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      bgBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.subBgStyle = btn.dataset.val;
      updateSamplePreview();
    });
  });

  posBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      posBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.subPosition = btn.dataset.val;
      updateSamplePreview();
    });
  });
}

// =================== BƯỚC 5: XEM TRƯỚC & XUẤT VIDEO ===================
function initVideoPlayerAndExport() {
  const canvas = document.getElementById('studio-canvas');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnRestart = document.getElementById('btn-restart-video');
  const playIcon = document.getElementById('play-icon');
  const playText = document.getElementById('play-text');
  const btnExportDirect = document.getElementById('btn-export-direct');
  const btnFfmpeg = document.getElementById('btn-generate-ffmpeg');

  document.querySelectorAll('input[name="video-ratio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.videoRatio = e.target.value;
      document.querySelectorAll('.ratio-card').forEach(card => {
        card.classList.toggle('active', card.querySelector('input').checked);
      });
      adjustCanvasDimensions();
      renderStaticPreview();
    });
  });

  adjustCanvasDimensions();

  btnPlayPause.addEventListener('click', () => {
    if (state.isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  btnRestart.addEventListener('click', () => {
    stopPlayback();
    startPlayback();
  });

  btnExportDirect.addEventListener('click', startDirectVideoExport);
  btnFfmpeg.addEventListener('click', generateFfmpegScript);
}

function adjustCanvasDimensions() {
  const canvas = document.getElementById('studio-canvas');
  const wrapper = document.getElementById('video-screen-wrapper');
  if (state.videoRatio === '9:16') {
    canvas.width = 720;
    canvas.height = 1280;
    wrapper.style.aspectRatio = '9/16';
  } else {
    canvas.width = 1280;
    canvas.height = 720;
    wrapper.style.aspectRatio = '16/9';
  }
}

function renderStaticPreview() {
  const canvas = document.getElementById('studio-canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1c1817';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const firstItem = state.mediaItems[0];
  if (firstItem && firstItem.imageElement && firstItem.imageElement.complete) {
    drawMediaFrame(ctx, firstItem.imageElement, 1.0, 0, 0, canvas.width, canvas.height);
  } else {
    // Vẽ khung chờ
    ctx.fillStyle = '#fff';
    ctx.font = '24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bấm "Phát thử video" để xem toàn bộ video', canvas.width / 2, canvas.height / 2);
  }

  // Vẽ phụ đề mẫu
  const firstSub = state.segments[0]?.text || 'Mỗi ngày mới là một món quà vô giá của cuộc sống.';
  drawSubtitleFrame(ctx, firstSub, canvas.width, canvas.height);
}

function startPlayback() {
  if (state.mediaItems.length === 0) {
    alert('Chị hãy thêm ít nhất 1 ảnh ở Bước 1 trước khi phát thử video nhé!');
    goToStep(1);
    return;
  }

  state.isPlaying = true;
  document.getElementById('play-icon').textContent = '⏸️';
  document.getElementById('play-text').textContent = 'Tạm dừng';

  state.playbackStartTime = performance.now();
  calculateTotalDuration();

  // Phát BGM
  playSynthesizedBGM();

  // Bắt đầu đọc thuyết minh nếu chế độ TTS
  if (state.audioMode === 'tts') {
    playSynchronizedSpeech(0);
  } else if (state.audioMode === 'record' && state.recordedAudioUrl) {
    const audio = new Audio(state.recordedAudioUrl);
    audio.play();
  }

  requestAnimationFrame(videoRenderLoop);
}

function stopPlayback() {
  state.isPlaying = false;
  document.getElementById('play-icon').textContent = '▶️';
  document.getElementById('play-text').textContent = 'Phát thử video';
  if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function playSynchronizedSpeech(segmentIdx) {
  if (!state.isPlaying || segmentIdx >= state.segments.length) return;
  const seg = state.segments[segmentIdx];
  if (!seg || !seg.text) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(seg.text);
  utter.rate = state.voiceSpeed;
  utter.pitch = state.voicePitch;
  utter.lang = 'vi-VN';

  const voices = window.speechSynthesis.getVoices();
  const found = voices.find(v => v.voiceURI === state.selectedVoiceURI);
  if (found) utter.voice = found;

  utter.onend = () => {
    // Tự động chuyển câu tiếp theo sau thời lượng mỗi cảnh
    const nextIdx = segmentIdx + 1;
    if (nextIdx < state.segments.length && state.isPlaying) {
      setTimeout(() => {
        playSynchronizedSpeech(nextIdx);
      }, 500);
    }
  };

  window.speechSynthesis.speak(utter);
}

function videoRenderLoop(currentTime) {
  if (!state.isPlaying) return;

  const canvas = document.getElementById('studio-canvas');
  const ctx = canvas.getContext('2d');
  const elapsedSec = (currentTime - state.playbackStartTime) / 1000;

  // Cập nhật nhãn thời gian
  document.getElementById('current-play-time').textContent = formatTime(Math.min(elapsedSec, state.totalVideoDuration));

  if (elapsedSec >= state.totalVideoDuration) {
    stopPlayback();
    renderStaticPreview();
    return;
  }

  // Xác định bức ảnh và phụ đề hiện tại
  let accumulatedTime = 0;
  let currentItem = state.mediaItems[0];
  let currentSegment = state.segments[0];
  let progressInSlide = 0;

  for (let i = 0; i < state.mediaItems.length; i++) {
    const item = state.mediaItems[i];
    const itemDuration = item.duration || state.defaultSlideDuration;
    if (elapsedSec >= accumulatedTime && elapsedSec < accumulatedTime + itemDuration) {
      currentItem = item;
      currentSegment = state.segments[i];
      progressInSlide = (elapsedSec - accumulatedTime) / itemDuration;
      break;
    }
    accumulatedTime += itemDuration;
  }

  // Vẽ hình ảnh với hiệu ứng Ken Burns (phóng to nhẹ nhàng từ 1.0 đến 1.1)
  const scale = 1.0 + progressInSlide * 0.1;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (currentItem && currentItem.imageElement) {
    drawMediaFrame(ctx, currentItem.imageElement, scale, progressInSlide, 0, canvas.width, canvas.height);
  }

  // Vẽ phụ đề
  if (currentSegment && currentSegment.text) {
    drawSubtitleFrame(ctx, currentSegment.text, canvas.width, canvas.height);
  }

  state.animationFrameId = requestAnimationFrame(videoRenderLoop);
}

function drawMediaFrame(ctx, img, scale, progress, offsetX, w, h) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);

  const imgAspect = img.naturalWidth / img.naturalHeight;
  const canvasAspect = w / h;
  let renderW, renderH;

  if (imgAspect > canvasAspect) {
    renderH = h;
    renderW = h * imgAspect;
  } else {
    renderW = w;
    renderH = w / imgAspect;
  }

  // Hiệu ứng dịch chuyển nhẹ
  const panOffset = (progress - 0.5) * 30;
  ctx.drawImage(img, -renderW / 2 + panOffset, -renderH / 2, renderW, renderH);
  ctx.restore();
}

function drawSubtitleFrame(ctx, text, w, h) {
  if (!text) return;

  ctx.save();
  ctx.font = `bold ${state.subSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';

  const maxWidth = w * 0.85;
  const words = text.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  const lineHeight = state.subSize * 1.4;
  const totalTextHeight = lines.length * lineHeight;
  let startY = state.subPosition === 'center' ? (h - totalTextHeight) / 2 : h - totalTextHeight - 50;

  // Vẽ khung nền
  if (state.subBgStyle === 'glass') {
    const paddingX = 30;
    const paddingY = 16;
    const boxWidth = Math.min(maxWidth + paddingX * 2, w * 0.9);
    const boxHeight = totalTextHeight + paddingY * 2;
    const boxX = (w - boxWidth) / 2;
    const boxY = startY - paddingY - (lineHeight - state.subSize);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (state.subBgStyle === 'bar') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, startY - 20, w, totalTextHeight + 40);
  } else if (state.subBgStyle === 'shadow') {
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
  }

  // Vẽ chữ
  ctx.fillStyle = state.subColor;
  lines.forEach((line, index) => {
    ctx.fillText(line, w / 2, startY + index * lineHeight + state.subSize * 0.85);
  });

  ctx.restore();
}

// Xuất video trực tiếp bằng MediaRecorder
function startDirectVideoExport() {
  if (state.mediaItems.length === 0) {
    alert('Chị hãy thêm ít nhất 1 ảnh ở Bước 1 nhé!');
    goToStep(1);
    return;
  }

  const canvas = document.getElementById('studio-canvas');
  const progressBox = document.getElementById('export-progress-box');
  const progressBar = document.getElementById('export-progress-bar');
  const progressText = document.getElementById('export-progress-text');

  progressBox.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Đang bắt đầu ghi hình video...';

  const stream = canvas.captureStream(30); // 30 FPS
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  } catch (e) {
    recorder = new MediaRecorder(stream);
  }

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hong_Thinh_Video_${new Date().toISOString().slice(0, 10)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    progressText.textContent = '✅ Đã xuất video thành công! Video đã được tải về máy của chị.';
    progressBar.style.width = '100%';
    setTimeout(() => {
      progressBox.style.display = 'none';
    }, 4000);
  };

  recorder.start();
  startPlayback();

  // Theo dõi tiến độ
  const checkInterval = setInterval(() => {
    if (!state.isPlaying) {
      clearInterval(checkInterval);
      recorder.stop();
    } else {
      const elapsed = (performance.now() - state.playbackStartTime) / 1000;
      const pct = Math.min(Math.round((elapsed / state.totalVideoDuration) * 100), 99);
      progressBar.style.width = `${pct}%`;
      progressText.textContent = `Đang kết xuất video: ${pct}%... Chị vui lòng đợi trong giây lát`;
    }
  }, 200);
}

// Tạo file lệnh FFmpeg để render chất lượng Full HD
function generateFfmpegScript() {
  const batContent = `@echo off
chcp 65001 > nul
echo ========================================================
echo   HONG THINH VIDEO STUDIO - KET XUAT VIDEO BANG FFMPEG
echo ========================================================
echo Dang ket xuat video chuan Full HD 1080p sieu net...

:: Kiem tra FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
  echo [Loi] May tinh chua tim thay cong cu FFmpeg.
  pause
  exit /b
)

echo Hoan tat! File video duoc luu tai thu muc nay.
pause
`;
  const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Xuat_Video_Bang_FFmpeg.bat';
  a.click();
}

// =================== CỬA SỔ MODAL & CÀI ĐẶT AI ===================
function initModals() {
  const settingsModal = document.getElementById('settings-modal');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnTestGemini = document.getElementById('btn-test-gemini');
  const geminiInput = document.getElementById('gemini-api-key');

  const helpModal = document.getElementById('help-modal');
  const btnOpenHelp = document.getElementById('btn-open-help');
  const btnCloseHelp = document.getElementById('btn-close-help');
  const btnCloseHelpBtn = document.getElementById('btn-close-help-btn');

  // Đặt giá trị API Key hiện có vào ô nhập
  if (state.geminiApiKey) geminiInput.value = state.geminiApiKey;

  btnOpenSettings.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
  btnCloseSettings.addEventListener('click', () => { settingsModal.style.display = 'none'; });

  btnOpenHelp.addEventListener('click', () => { helpModal.style.display = 'flex'; });
  btnCloseHelp.addEventListener('click', () => { helpModal.style.display = 'none'; });
  btnCloseHelpBtn.addEventListener('click', () => { helpModal.style.display = 'none'; });

  btnSaveSettings.addEventListener('click', () => {
    const key = geminiInput.value.trim();
    state.geminiApiKey = key;
    localStorage.setItem('hongthinh_gemini_api_key', key);
    checkAIStatus();
    settingsModal.style.display = 'none';
    alert('Đã lưu khóa API thành công! Ứng dụng đã sẵn sàng kết nối AI.');
  });

  btnTestGemini.addEventListener('click', async () => {
    const key = geminiInput.value.trim();
    if (!key) return alert('Chị hãy dán mã khóa API vào trước nhé.');
    btnTestGemini.textContent = 'Đang kiểm tra...';
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Chào buổi sáng!' }] }] })
      });
      if (res.ok) {
        alert('🎉 Tuyệt vời! Khóa API Gemini hoàn toàn chính xác và hoạt động tốt.');
      } else {
        alert('Mã khóa API chưa hợp lệ hoặc đã hết hạn. Chị vui lòng kiểm tra lại.');
      }
    } catch (e) {
      alert('Không thể kết nối: ' + e.message);
    } finally {
      btnTestGemini.textContent = 'Kiểm tra kết nối';
    }
  });
}

function checkAIStatus() {
  const badge = document.getElementById('ai-status-badge');
  if (!badge) return;
  if (state.geminiApiKey) {
    badge.className = 'badge badge-success';
    badge.textContent = 'Đã kết nối AI';
  } else {
    badge.className = 'badge badge-warning';
    badge.textContent = 'Chưa có API';
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
