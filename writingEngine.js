/**
 * writingEngine.js
 * 한자 마스터용 벡터 서체 마스킹 획순 애니메이션 & 쓰기 판정 엔진
 */
(function (global) {
  'use strict';

  // 표준 한자 10종 벡터 데이터 (1024x1024 표준 좌표계)
  // strokes: 각 획의 실제 붓글씨 외곽선 패스 (Outline)
  // medians: 각 획의 중심 궤적 좌표열 (Centerline Medians)
  const HANJA_DICT = {
    '永': {
      strokes: [
        'M512,140 C535,140 558,160 558,190 C558,230 525,270 488,290 C470,300 455,290 455,270 C455,225 485,140 512,140 Z',
        'M230,360 L780,360 C805,360 820,380 810,405 C795,430 760,440 710,440 L560,440 L560,780 C560,840 535,870 490,870 C450,870 440,840 440,800 L440,730 C440,680 480,440 480,440 L230,440 C205,440 190,415 200,390 C210,365 220,360 230,360 Z',
        'M460,460 C475,470 485,490 470,510 L300,640 C280,655 260,650 250,630 C240,610 250,590 270,575 L430,465 C440,455 450,455 460,460 Z',
        'M370,590 C385,600 390,620 375,640 L220,840 C205,860 185,865 175,845 C165,825 175,805 190,785 L340,595 C350,585 360,585 370,590 Z',
        'M540,510 C560,510 575,525 585,545 L820,820 C845,850 835,875 805,885 C775,895 745,880 725,855 L520,560 C510,545 515,525 530,515 C533,512 537,510 540,510 Z'
      ],
      medians: [
        [[512, 150], [490, 275]],
        [[210, 395], [780, 395], [512, 395], [512, 840], [450, 770]],
        [[460, 480], [265, 620]],
        [[365, 605], [185, 830]],
        [[535, 525], [800, 860]]
      ]
    },
    '水': {
      strokes: [
        'M520,130 L555,130 C570,130 580,145 580,165 L580,820 C580,875 550,900 500,900 C455,900 440,865 440,820 L440,750 C440,700 495,200 520,130 Z',
        'M420,320 C435,330 440,350 425,370 L240,540 C220,560 200,555 190,535 C180,515 190,495 210,475 L390,325 C400,315 410,315 420,320 Z',
        'M190,580 C205,580 220,590 230,605 L420,820 C435,840 430,860 410,875 C390,890 370,885 355,865 L170,630 C160,615 165,595 180,585 C183,582 187,580 190,580 Z',
        'M580,360 C600,360 615,375 625,395 L840,820 C865,850 855,875 825,885 C795,895 765,880 745,855 L560,410 C550,395 555,375 570,365 C573,362 577,360 580,360 Z'
      ],
      medians: [
        [[535, 145], [535, 865], [455, 780]],
        [[415, 335], [205, 525]],
        [[180, 595], [410, 855]],
        [[575, 375], [825, 865]]
      ]
    },
    '木': {
      strokes: [
        'M170,390 L850,390 C875,390 890,415 880,440 C865,465 840,470 810,470 L210,470 C180,470 155,465 145,440 C135,415 145,390 170,390 Z',
        'M530,130 L565,130 C580,130 590,145 590,165 L590,860 C590,895 570,910 540,910 C510,910 490,895 490,860 L490,165 C490,145 505,130 530,130 Z',
        'M500,430 C515,440 515,460 500,480 L230,840 C215,860 190,865 175,845 C160,825 170,800 190,780 L460,435 C470,425 485,425 500,430 Z',
        'M520,430 C540,430 555,445 565,465 L835,825 C855,850 850,875 825,885 C795,895 770,885 750,860 L500,480 C490,465 495,445 510,435 C513,432 517,430 520,430 Z'
      ],
      medians: [
        [[160, 430], [860, 430]],
        [[540, 145], [540, 890]],
        [[490, 445], [185, 835]],
        [[520, 445], [820, 865]]
      ]
    },
    '人': {
      strokes: [
        'M520,160 C545,160 560,180 550,205 L260,835 C245,865 220,870 200,855 C180,835 185,810 205,785 L480,185 C490,170 505,160 520,160 Z',
        'M430,450 C450,450 470,465 480,485 L795,835 C820,865 815,890 785,900 C755,910 730,895 710,870 L410,510 C395,490 405,465 425,455 C427,452 429,450 430,450 Z'
      ],
      medians: [
        [[525, 175], [210, 840]],
        [[420, 470], [785, 875]]
      ]
    },
    '大': {
      strokes: [
        'M170,370 L850,370 C875,370 890,395 880,420 C865,445 840,450 810,450 L210,450 C180,450 155,445 145,420 C135,395 145,370 170,370 Z',
        'M520,150 C545,150 560,170 550,195 L540,410 L250,845 C235,870 210,875 190,855 C175,835 180,810 200,785 L465,410 L465,195 C465,170 485,150 520,150 Z',
        'M470,420 C490,420 510,435 520,455 L810,835 C835,865 830,890 800,900 C770,910 745,895 725,870 L450,480 C435,460 445,435 465,425 C467,422 469,420 470,420 Z'
      ],
      medians: [
        [[160, 410], [860, 410]],
        [[525, 165], [512, 420], [200, 845]],
        [[465, 435], [795, 875]]
      ]
    },
    '中': {
      strokes: [
        'M270,270 L330,270 C345,270 355,285 355,305 L355,670 C355,700 335,715 305,715 C275,715 255,700 255,670 L255,305 C255,285 260,270 270,270 Z',
        'M290,270 L730,270 C760,270 780,290 770,320 L740,640 C735,670 710,690 680,685 C650,680 640,655 645,630 L675,350 L310,350 C280,350 270,330 275,305 C280,285 285,270 290,270 Z',
        'M290,620 L710,620 C735,620 750,640 745,665 C735,690 715,700 685,700 L290,700 C265,700 245,690 245,665 C245,640 265,620 290,620 Z',
        'M520,110 L555,110 C570,110 580,125 580,145 L580,890 C580,925 560,940 530,940 C500,940 480,925 480,890 L480,145 C480,125 495,110 520,110 Z'
      ],
      medians: [
        [[305, 285], [305, 690]],
        [[290, 310], [745, 310], [715, 665]],
        [[280, 660], [715, 660]],
        [[530, 125], [530, 915]]
      ]
    },
    '日': {
      strokes: [
        'M290,190 L350,190 C365,190 375,205 375,225 L375,810 C375,840 355,855 325,855 C295,855 275,840 275,810 L275,225 C275,205 280,190 290,190 Z',
        'M310,190 L710,190 C740,190 760,210 750,240 L720,800 C715,830 690,850 660,845 C630,840 620,815 625,790 L655,270 L330,270 C300,270 290,250 295,225 C300,205 305,190 310,190 Z',
        'M330,490 L670,490 C695,490 710,510 705,535 C695,560 675,570 645,570 L330,570 C305,570 285,560 285,535 C285,510 305,490 330,490 Z',
        'M320,770 L680,770 C705,770 720,790 715,815 C705,840 685,850 655,850 L320,850 C295,850 275,840 275,815 C275,790 295,770 320,770 Z'
      ],
      medians: [
        [[325, 205], [325, 830]],
        [[310, 230], [725, 230], [690, 820]],
        [[310, 530], [680, 530]],
        [[305, 810], [690, 810]]
      ]
    },
    '月': {
      strokes: [
        'M310,190 C335,190 350,210 340,235 L300,835 C295,865 270,880 240,875 C210,870 200,845 205,820 L270,235 C275,210 290,190 310,190 Z',
        'M310,190 L690,190 C720,190 740,210 740,240 L740,810 C740,865 710,890 660,890 C620,890 605,855 605,820 L605,760 C605,715 655,270 655,270 L330,270 C300,270 290,250 295,225 C300,205 305,190 310,190 Z',
        'M320,410 L640,410 C665,410 680,430 675,455 C665,480 645,490 615,490 L320,490 C295,490 275,480 275,455 C275,430 295,410 320,410 Z',
        'M310,590 L640,590 C665,590 680,610 675,635 C665,660 645,670 615,670 L310,670 C285,670 265,660 265,635 C265,610 285,590 310,590 Z'
      ],
      medians: [
        [[315, 205], [235, 850]],
        [[310, 230], [710, 230], [710, 855], [620, 790]],
        [[305, 450], [650, 450]],
        [[295, 630], [650, 630]]
      ]
    },
    '山': {
      strokes: [
        'M520,170 L555,170 C570,170 580,185 580,205 L580,810 C580,845 560,860 530,860 C500,860 480,845 480,810 L480,205 C480,185 495,170 520,170 Z',
        'M230,420 L290,420 C305,420 315,435 315,455 L315,770 L750,770 C780,770 795,790 790,815 C780,840 760,850 730,850 L250,850 C220,850 200,830 205,800 L215,455 C215,435 220,420 230,420 Z',
        'M760,420 L820,420 C835,420 845,435 845,455 L845,810 C845,845 825,860 795,860 C765,860 745,845 745,810 L745,455 C745,435 750,420 760,420 Z'
      ],
      medians: [
        [[530, 185], [530, 835]],
        [[260, 435], [260, 810], [765, 810]],
        [[795, 435], [795, 835]]
      ]
    },
    '天': {
      strokes: [
        'M300,250 L720,250 C745,250 760,270 755,295 C745,320 725,330 695,330 L300,330 C275,330 255,320 255,295 C255,270 275,250 300,250 Z',
        'M170,440 L850,440 C875,440 890,465 880,490 C865,515 840,520 810,520 L210,520 C180,520 155,515 145,490 C135,465 145,440 170,440 Z',
        'M520,260 C545,260 560,280 550,305 L540,490 L260,855 C245,880 220,885 200,865 C185,845 190,820 210,795 L465,490 L465,305 C465,280 485,260 520,260 Z',
        'M470,500 C490,500 510,515 520,535 L810,845 C835,875 830,900 800,910 C770,920 745,905 725,880 L450,560 C435,540 445,515 465,505 C467,502 469,500 470,500 Z'
      ],
      medians: [
        [[280, 290], [735, 290]],
        [[160, 480], [860, 480]],
        [[525, 275], [512, 500], [210, 855]],
        [[465, 515], [795, 885]]
      ]
    }
  };

  function WritingEngine(options) {
    if (!(this instanceof WritingEngine)) {
      return new WritingEngine(options);
    }

    const defaultOptions = {
      container: null,            // DOM 래퍼 엘리먼트
      char: '永',
      mode: 'demo',               // 'demo' (획순 시연) | 'practice' (쓰기 연습)
      fillColor: '#1e293b',       // 완성 획 잉크 색상
      watermarkColor: '#f1f5f9',  // 글리프 배경 음영
      activeColor: '#ef4444',     // 진행 중 획 강조 색상
      animSpeed: 1.0,
      onStrokeChange: null,       // (current, total)
      onStrokeSuccess: null,      // (strokeIndex, total)
      onStrokeError: null,        // (strokeIndex, reason)
      onComplete: null,
      onChange: null
    };

    this.options = Object.assign({}, defaultOptions, options);
    this.container = typeof this.options.container === 'string'
      ? document.querySelector(this.options.container)
      : this.options.container;

    if (!this.container) {
      console.error('[WritingEngine] 유효한 컨테이너 엘리먼트가 필요합니다.');
      return;
    }

    this.char = this.options.char || '永';
    this.mode = this.options.mode || 'demo';
    this.data = HANJA_DICT[this.char] || null;

    // 상태 관리
    this.currentStrokeIndex = 0;
    this.isAnimating = false;
    this.animRafId = null;

    // 사용자 필기 판정용
    this.userPoints = [];
    this.isDrawing = false;

    this._initDOM();
    this._bindEvents();
    this.setCharacter(this.char);
  }

  // Static API
  WritingEngine.getAvailablePresets = function () {
    return Object.keys(HANJA_DICT);
  };

  WritingEngine.prototype = {
    _initDOM: function () {
      this.container.innerHTML = '';
      this.container.style.position = 'relative';
      this.container.style.userSelect = 'none';
      this.container.style.touchAction = 'none';

      const width = this.container.clientWidth || 320;
      const height = this.container.clientHeight || 320;

      // 1. SVG 레이어 (격자 + 마스킹 서체 + 획순 렌더러)
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.setAttribute('viewBox', '0 0 1024 1024');
      this.svg.setAttribute('width', '100%');
      this.svg.setAttribute('height', '100%');
      this.svg.style.display = 'block';

      // SVG 내부 레이어 그룹
      this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.watermarkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.completedGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.animGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.hintGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      this.svg.appendChild(this.defs);
      this.svg.appendChild(this.gridGroup);
      this.svg.appendChild(this.watermarkGroup);
      this.svg.appendChild(this.completedGroup);
      this.svg.appendChild(this.animGroup);
      this.svg.appendChild(this.hintGroup);
      this.container.appendChild(this.svg);

      // 2. 터치 필기용 인터랙티브 Canvas
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'auto';
      this.ctx = this.canvas.getContext('2d');
      this.container.appendChild(this.canvas);

      this._drawTianGrid();
      this.resize();
    },

    resize: function () {
      const rect = this.container.getBoundingClientRect();
      const w = rect.width || 320;
      const h = rect.height || 320;
      this.dpr = window.devicePixelRatio || 1;

      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.width = w;
      this.height = h;
    },

    _drawTianGrid: function () {
      this.gridGroup.innerHTML = `
        <!-- 외곽선 -->
        <rect x="2" y="2" width="1020" height="1020" fill="#ffffff" stroke="#cbd5e1" stroke-width="4"/>
        <!-- 田자형 십자 점선 -->
        <line x1="512" y1="0" x2="512" y2="1024" stroke="#e2e8f0" stroke-width="3" stroke-dasharray="16 16"/>
        <line x1="0" y1="512" x2="1024" y2="512" stroke="#e2e8f0" stroke-width="3" stroke-dasharray="16 16"/>
      `;
    },

    _bindEvents: function () {
      this._onPointerDown = this._handlePointerDown.bind(this);
      this._onPointerMove = this._handlePointerMove.bind(this);
      this._onPointerUp = this._handlePointerUp.bind(this);
      this._onResize = this.resize.bind(this);

      this.canvas.addEventListener('pointerdown', this._onPointerDown);
      this.canvas.addEventListener('pointermove', this._onPointerMove);
      this.canvas.addEventListener('pointerup', this._onPointerUp);
      this.canvas.addEventListener('pointercancel', this._onPointerUp);
      window.addEventListener('resize', this._onResize);
    },

    setCharacter: function (char) {
      this.stopAnimation();
      this.char = char;
      this.data = HANJA_DICT[char] || null;
      this.currentStrokeIndex = 0;
      this._renderBaseGlyph();
      this._updateUIState();
    },

    setMode: function (mode) {
      this.stopAnimation();
      this.mode = mode; // 'demo' | 'practice'
      this.currentStrokeIndex = 0;
      this._renderBaseGlyph();
      this._updateUIState();
      this._clearCanvas();
    },

    // -----------------------------------------------------------------
    // SVG 마스크 및 서체 음영 렌더링 파이프라인
    // -----------------------------------------------------------------
    _renderBaseGlyph: function () {
      this.defs.innerHTML = '';
      this.watermarkGroup.innerHTML = '';
      this.completedGroup.innerHTML = '';
      this.animGroup.innerHTML = '';
      this.hintGroup.innerHTML = '';

      if (!this.data) return;

      // 1. 각 획에 대한 클립패스 및 워터마크(음영) 생성
      this.data.strokes.forEach((pathD, idx) => {
        // ClipPath 정의
        const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        clip.setAttribute('id', `clip-stroke-${idx}`);
        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        clipPath.setAttribute('d', pathD);
        clip.appendChild(clipPath);
        this.defs.appendChild(clip);

        // 연한 워터마크 서체
        const watermarkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        watermarkPath.setAttribute('d', pathD);
        watermarkPath.setAttribute('fill', '#e2e8f0');
        this.watermarkGroup.appendChild(watermarkPath);
      });

      this._renderCompletedStrokes();
      this._renderPracticeHint();
    },

    _renderCompletedStrokes: function () {
      this.completedGroup.innerHTML = '';
      if (!this.data) return;

      for (let i = 0; i < this.currentStrokeIndex && i < this.data.strokes.length; i++) {
        const completedPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        completedPath.setAttribute('d', this.data.strokes[i]);
        completedPath.setAttribute('fill', this.options.fillColor);
        this.completedGroup.appendChild(completedPath);
      }
    },

    _renderPracticeHint: function () {
      this.hintGroup.innerHTML = '';
      if (this.mode !== 'practice' || !this.data) return;
      if (this.currentStrokeIndex >= this.data.strokes.length) return;

      const medians = this.data.medians[this.currentStrokeIndex];
      if (!medians || medians.length === 0) return;

      const startPt = medians[0];

      // 시작점 안내 원형 펄스 배지
      const pulseCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      pulseCircle.setAttribute('cx', startPt[0]);
      pulseCircle.setAttribute('cy', startPt[1]);
      pulseCircle.setAttribute('r', '26');
      pulseCircle.setAttribute('fill', 'rgba(37, 99, 235, 0.18)');
      pulseCircle.setAttribute('stroke', '#2563eb');
      pulseCircle.setAttribute('stroke-width', '4');

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', startPt[0]);
      text.setAttribute('y', startPt[1] + 6);
      text.setAttribute('fill', '#1d4ed8');
      text.setAttribute('font-size', '24');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = String(this.currentStrokeIndex + 1);

      this.hintGroup.appendChild(pulseCircle);
      this.hintGroup.appendChild(text);
    },

    // -----------------------------------------------------------------
    // 획순 붓글씨 마스킹 애니메이션 (Stroke-Order Demo)
    // -----------------------------------------------------------------
    playAnimation: function () {
      if (!this.data || this.mode !== 'demo') return;

      this.stopAnimation();
      this.isAnimating = true;

      if (this.currentStrokeIndex >= this.data.strokes.length) {
        this.currentStrokeIndex = 0;
      }

      this._animateNextStroke();
    },

    _animateNextStroke: function () {
      if (!this.isAnimating) return;

      if (this.currentStrokeIndex >= this.data.strokes.length) {
        this.isAnimating = false;
        this.animGroup.innerHTML = '';
        this._renderCompletedStrokes();
        if (typeof this.options.onComplete === 'function') {
          this.options.onComplete();
        }
        return;
      }

      const idx = this.currentStrokeIndex;
      const medians = this.data.medians[idx];
      this._renderCompletedStrokes();

      // 마스크 내부를 채워나갈 궤적 브러시 패스 생성
      this.animGroup.innerHTML = '';
      const sweepPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let d = `M ${medians[0][0]} ${medians[0][1]}`;
      for (let i = 1; i < medians.length; i++) {
        d += ` L ${medians[i][0]} ${medians[i][1]}`;
      }

      sweepPath.setAttribute('d', d);
      sweepPath.setAttribute('fill', 'none');
      sweepPath.setAttribute('stroke', this.options.activeColor);
      sweepPath.setAttribute('stroke-width', '160'); // 글리프 외곽을 완벽히 덮을 충분한 굵기
      sweepPath.setAttribute('stroke-linecap', 'round');
      sweepPath.setAttribute('stroke-linejoin', 'round');
      sweepPath.setAttribute('clip-path', `url(#clip-stroke-${idx})`);
      this.animGroup.appendChild(sweepPath);

      const length = sweepPath.getTotalLength();
      sweepPath.style.strokeDasharray = `${length}`;
      sweepPath.style.strokeDashoffset = `${length}`;

      let start = null;
      const duration = (650 / (this.options.animSpeed || 1.0));

      const step = (timestamp) => {
        if (!this.isAnimating) return;
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1.0);

        sweepPath.style.strokeDashoffset = `${length * (1.0 - progress)}`;

        if (progress < 1.0) {
          this.animRafId = requestAnimationFrame(step);
        } else {
          // 한 획 완료 후 다음 획으로 진행
          this.currentStrokeIndex++;
          this._updateUIState();
          setTimeout(() => {
            this._animateNextStroke();
          }, 120);
        }
      };

      this.animRafId = requestAnimationFrame(step);
    },

    pauseAnimation: function () {
      this.isAnimating = false;
      if (this.animRafId) {
        cancelAnimationFrame(this.animRafId);
        this.animRafId = null;
      }
    },

    stopAnimation: function () {
      this.pauseAnimation();
      this.animGroup.innerHTML = '';
      this._renderCompletedStrokes();
      this._updateUIState();
    },

    stepNextStroke: function () {
      this.stopAnimation();
      if (!this.data) return;
      if (this.currentStrokeIndex < this.data.strokes.length) {
        this.currentStrokeIndex++;
        this._renderCompletedStrokes();
        this._renderPracticeHint();
        this._updateUIState();
      }
    },

    stepPrevStroke: function () {
      this.stopAnimation();
      if (!this.data) return;
      if (this.currentStrokeIndex > 0) {
        this.currentStrokeIndex--;
        this._renderCompletedStrokes();
        this._renderPracticeHint();
        this._updateUIState();
      }
    },

    reset: function () {
      this.stopAnimation();
      this.currentStrokeIndex = 0;
      this._renderBaseGlyph();
      this._updateUIState();
      this._clearCanvas();
    },

    _updateUIState: function () {
      const total = this.data ? this.data.strokes.length : 0;
      if (typeof this.options.onStrokeChange === 'function') {
        this.options.onStrokeChange(this.currentStrokeIndex, total);
      }
    },

    // -----------------------------------------------------------------
    // 관용적 획순·방향·궤적 실시간 판정 알고리즘 (Practice Mode)
    // -----------------------------------------------------------------
    _handlePointerDown: function (e) {
      if (this.mode !== 'practice' || !this.data) return;
      if (this.currentStrokeIndex >= this.data.strokes.length) return;

      this.isDrawing = true;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}

      const pt = this._toSvgPoint(e);
      this.userPoints = [pt];
      this._clearCanvas();
      this._drawUserPoint(pt.cx, pt.cy);
    },

    _handlePointerMove: function (e) {
      if (!this.isDrawing) return;
      const pt = this._toSvgPoint(e);
      const prev = this.userPoints[this.userPoints.length - 1];
      this.userPoints.push(pt);

      // 실시간 필기선 렌더링
      this.ctx.save();
      this.ctx.strokeStyle = '#2563eb';
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(prev.cx, prev.cy);
      this.ctx.lineTo(pt.cx, pt.cy);
      this.ctx.stroke();
      this.ctx.restore();
    },

    _handlePointerUp: function (e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}

      if (this.userPoints.length < 2) {
        this._clearCanvas();
        return;
      }

      // 획 판정 실행
      const result = this._gradeCurrentStroke(this.userPoints);
      if (result.success) {
        // 정답: 필기선 삭제 후 유려한 서체 획으로 착 감기듯 스냅(Snap)
        this._clearCanvas();
        this.currentStrokeIndex++;
        this._renderCompletedStrokes();
        this._renderPracticeHint();
        this._updateUIState();

        if (typeof this.options.onStrokeSuccess === 'function') {
          this.options.onStrokeSuccess(this.currentStrokeIndex, this.data.strokes.length);
        }

        if (this.currentStrokeIndex >= this.data.strokes.length) {
          if (typeof this.options.onComplete === 'function') {
            this.options.onComplete();
          }
        }
      } else {
        // 오답: 부드러운 페이드아웃 + 에러 피드백
        this._fadeCanvasError();
        if (typeof this.options.onStrokeError === 'function') {
          this.options.onStrokeError(this.currentStrokeIndex, result.reason);
        }
      }
    },

    _gradeCurrentStroke: function (userPts) {
      const medians = this.data.medians[this.currentStrokeIndex];
      if (!medians || medians.length < 2) return { success: false, reason: '데이터 오류' };

      const targetStart = medians[0];
      const targetEnd = medians[medians.length - 1];
      const userStart = [userPts[0].x, userPts[0].y];
      const userEnd = [userPts[userPts.length - 1].x, userPts[userPts.length - 1].y];

      // 1. 시작점 반경 검사 (허용 반경: 240 units / 1024)
      const startDist = Math.hypot(userStart[0] - targetStart[0], userStart[1] - targetStart[1]);
      if (startDist > 240) {
        return { success: false, reason: '시작 위치가 맞지 않습니다.' };
      }

      // 2. 방향 벡터 각도 검사
      const targetVec = [targetEnd[0] - targetStart[0], targetEnd[1] - targetStart[1]];
      const userVec = [userEnd[0] - userStart[0], userEnd[1] - userStart[1]];
      const targetAngle = Math.atan2(targetVec[1], targetVec[0]);
      const userAngle = Math.atan2(userVec[1], userVec[0]);

      let diffAngle = Math.abs(targetAngle - userAngle);
      if (diffAngle > Math.PI) diffAngle = Math.PI * 2 - diffAngle;

      // 60도 이상 차이나면 역방향 또는 잘못된 방향으로 판정
      if (diffAngle > (Math.PI / 3)) {
        return { success: false, reason: '획의 진행 방향이 다릅니다.' };
      }

      // 3. 궤적 평균 거리 검사 (Point to Medians Distance)
      let totalDist = 0;
      for (let i = 0; i < userPts.length; i++) {
        const u = [userPts[i].x, userPts[i].y];
        let minDist = Infinity;
        for (let j = 0; j < medians.length - 1; j++) {
          const d = this._distToSegment(u, medians[j], medians[j + 1]);
          if (d < minDist) minDist = d;
        }
        totalDist += minDist;
      }
      const avgDist = totalDist / userPts.length;

      if (avgDist > 190) {
        return { success: false, reason: '획의 궤적이 벗어났습니다.' };
      }

      return { success: true };
    },

    _distToSegment: function (p, v, w) {
      const l2 = (w[0] - v[0]) ** 2 + (w[1] - v[1]) ** 2;
      if (l2 === 0) return Math.hypot(p[0] - v[0], p[1] - v[1]);
      let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(p[0] - (v[0] + t * (w[0] - v[0])), p[1] - (v[1] + t * (w[1] - v[1])));
    },

    _toSvgPoint: function (e) {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      return {
        x: (clientX / rect.width) * 1024,
        y: (clientY / rect.height) * 1024,
        cx: clientX,
        cy: clientY
      };
    },

    _drawUserPoint: function (cx, cy) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#2563eb';
      this.ctx.fill();
    },

    _clearCanvas: function () {
      this.ctx.clearRect(0, 0, this.width, this.height);
    },

    _fadeCanvasError: function () {
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      setTimeout(() => {
        this._clearCanvas();
      }, 240);
    },

    destroy: function () {
      this.stopAnimation();
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
      this.canvas.removeEventListener('pointerup', this._onPointerUp);
      this.canvas.removeEventListener('pointercancel', this._onPointerUp);
      window.removeEventListener('resize', this._onResize);
    }
  };

  global.WritingEngine = WritingEngine;

})(typeof window !== 'undefined' ? window : this);