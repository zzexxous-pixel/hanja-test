/**
 * writingEngine.js
 * 한자 마스터용 붓글씨 서체 마스킹 획순 애니메이션 & 쓰기 판정 엔진 (Canvas 2D Path2D 기반)
 */
(function (global) {
  'use strict';

  // 표준 1024x1024 벡터 글리프 & 궤적 데이터 (10종)
  const HANJA_DICT = {
    '永': {
      strokes: [
        'M470,140 C520,130 560,160 560,200 C560,240 520,290 480,300 C450,305 440,270 445,240 C450,200 455,150 470,140 Z',
        'M200,360 L780,360 C810,360 825,380 815,405 C795,435 760,440 700,440 L560,440 L560,780 C560,840 530,880 480,880 C440,880 430,840 430,800 L430,730 C430,680 480,440 480,440 L200,440 C170,440 160,410 170,385 C180,365 190,360 200,360 Z',
        'M460,460 C480,470 490,490 470,515 L290,650 C270,665 250,655 240,635 C230,615 240,595 260,580 L430,465 C440,455 450,455 460,460 Z',
        'M370,590 C390,600 395,620 380,645 L210,850 C195,870 175,870 165,850 C155,830 165,805 180,785 L340,595 C350,585 360,585 370,590 Z',
        'M540,510 C565,510 580,525 590,550 L830,830 C855,860 845,885 815,895 C785,905 755,890 735,865 L520,565 C510,545 515,525 530,515 Z'
      ],
      medians: [
        [[480, 150], [510, 270]],
        [[200, 400], [780, 400], [520, 400], [520, 840], [450, 770]],
        [[460, 480], [250, 625]],
        [[370, 605], [175, 840]],
        [[535, 525], [820, 870]]
      ]
    },
    '水': {
      strokes: [
        'M520,130 L560,130 C580,130 590,150 590,175 L590,820 C590,880 555,910 500,910 C455,910 440,870 440,825 L440,750 C440,700 500,200 520,130 Z',
        'M420,320 C440,330 445,355 425,375 L230,550 C210,570 190,560 180,540 C170,520 180,495 200,475 L390,325 C400,315 410,315 420,320 Z',
        'M180,580 C200,580 215,595 225,615 L420,830 C435,850 430,875 410,890 C390,905 365,895 350,875 L160,635 C150,615 155,595 170,585 Z',
        'M580,360 C605,360 620,380 630,405 L850,830 C875,860 865,885 835,895 C805,905 775,890 755,865 L560,415 C550,395 555,375 570,365 Z'
      ],
      medians: [
        [[540, 140], [540, 870], [455, 780]],
        [[415, 335], [195, 535]],
        [[170, 595], [410, 865]],
        [[575, 375], [835, 875]]
      ]
    },
    '木': {
      strokes: [
        'M170,390 L850,390 C880,390 895,415 885,445 C870,470 840,475 810,475 L210,475 C180,475 150,470 140,445 C130,415 140,390 170,390 Z',
        'M530,130 L570,130 C590,130 600,150 600,175 L600,860 C600,900 575,915 540,915 C505,915 485,900 485,860 L485,175 C485,150 500,130 530,130 Z',
        'M500,430 C520,440 520,465 500,490 L220,850 C205,870 180,875 165,855 C150,835 160,805 180,785 L460,435 Z',
        'M520,430 C545,430 560,450 570,475 L845,835 C870,860 865,885 835,895 C805,905 780,895 760,870 L500,480 Z'
      ],
      medians: [
        [[160, 430], [860, 430]],
        [[540, 145], [540, 890]],
        [[490, 445], [175, 845]],
        [[520, 445], [830, 875]]
      ]
    },
    '人': {
      strokes: [
        'M520,150 C550,150 570,175 560,205 L250,845 C235,875 205,880 185,860 C165,840 170,810 190,785 L480,180 C490,165 505,150 520,150 Z',
        'M430,450 C455,450 475,470 485,495 L805,845 C835,875 825,900 795,910 C765,920 740,905 720,880 L410,510 C395,490 405,465 430,450 Z'
      ],
      medians: [
        [[530, 165], [195, 850]],
        [[420, 470], [795, 885]]
      ]
    },
    '大': {
      strokes: [
        'M170,370 L850,370 C880,370 895,395 885,425 C870,450 840,455 810,455 L210,455 C180,455 150,450 140,425 C130,395 140,370 170,370 Z',
        'M520,140 C550,140 565,165 555,195 L545,410 L240,855 C225,880 195,885 175,865 C160,845 165,815 185,790 L465,410 L465,195 C465,165 485,140 520,140 Z',
        'M470,420 C495,420 515,440 525,465 L820,845 C850,875 840,900 810,910 C780,920 755,905 735,880 L450,485 C435,465 445,435 470,420 Z'
      ],
      medians: [
        [[160, 410], [860, 410]],
        [[530, 155], [512, 420], [185, 855]],
        [[465, 435], [805, 885]]
      ]
    },
    '中': {
      strokes: [
        'M270,270 L340,270 C360,270 370,285 370,310 L370,670 C370,705 345,720 315,720 C285,720 260,705 260,670 L260,310 C260,285 265,270 270,270 Z',
        'M290,270 L730,270 C765,270 785,290 775,325 L745,640 C740,675 715,695 680,690 C650,685 640,655 645,630 L675,350 L310,350 C280,350 270,330 275,305 C280,285 285,270 290,270 Z',
        'M290,620 L710,620 C740,620 755,640 750,670 C740,695 720,705 685,705 L290,705 C260,705 240,695 240,670 C240,640 260,620 290,620 Z',
        'M520,110 L560,110 C580,110 590,130 590,155 L590,890 C590,930 565,945 530,945 C495,945 475,930 475,890 L475,155 C475,130 495,110 520,110 Z'
      ],
      medians: [
        [[310, 285], [310, 695]],
        [[290, 310], [745, 310], [710, 665]],
        [[280, 660], [715, 660]],
        [[530, 125], [530, 920]]
      ]
    },
    '日': {
      strokes: [
        'M280,190 L350,190 C370,190 380,205 380,230 L380,810 C380,845 355,860 325,860 C295,860 270,845 270,810 L270,230 C270,205 275,190 280,190 Z',
        'M310,190 L710,190 C745,190 765,210 755,245 L725,800 C720,835 695,855 660,850 C630,845 620,815 625,790 L655,270 L330,270 C300,270 290,250 295,225 C300,205 305,190 310,190 Z',
        'M330,490 L670,490 C700,490 715,510 710,540 C700,565 680,575 645,575 L330,575 C300,575 280,565 280,540 C280,510 300,490 330,490 Z',
        'M320,770 L680,770 C710,770 725,790 720,820 C710,845 690,855 655,855 L320,855 C290,855 270,845 270,820 C270,790 290,770 320,770 Z'
      ],
      medians: [
        [[325, 205], [325, 835]],
        [[310, 230], [725, 230], [690, 820]],
        [[310, 530], [680, 530]],
        [[305, 810], [690, 810]]
      ]
    },
    '月': {
      strokes: [
        'M310,190 C340,190 355,210 345,240 L305,835 C300,870 270,885 240,880 C205,875 195,845 200,820 L270,240 C275,210 290,190 310,190 Z',
        'M310,190 L690,190 C725,190 745,210 745,245 L745,810 C745,870 710,895 660,895 C620,895 605,860 605,820 L605,760 C605,715 655,270 655,270 L330,270 C300,270 290,250 295,225 C300,205 305,190 310,190 Z',
        'M320,410 L640,410 C670,410 685,430 680,460 C670,485 650,495 615,495 L320,495 C290,495 270,485 270,460 C270,430 290,410 320,410 Z',
        'M310,590 L640,590 C665,590 680,610 675,640 C665,665 645,675 615,675 L310,675 C280,675 260,665 260,640 C260,610 280,590 310,590 Z'
      ],
      medians: [
        [[315, 205], [235, 855]],
        [[310, 230], [710, 230], [710, 855], [620, 790]],
        [[305, 450], [650, 450]],
        [[295, 630], [650, 630]]
      ]
    },
    '山': {
      strokes: [
        'M520,160 L560,160 C580,160 590,180 590,205 L590,810 C590,850 565,865 530,865 C495,865 475,850 475,810 L475,205 C475,180 495,160 520,160 Z',
        'M230,420 L290,420 C310,420 320,435 320,460 L320,770 L750,770 C785,770 800,790 795,820 C785,845 765,855 730,855 L250,855 C215,855 195,835 200,800 L210,460 C210,435 215,420 230,420 Z',
        'M760,420 L820,420 C840,420 850,435 850,460 L850,810 C850,850 825,865 795,865 C760,865 740,850 740,810 L740,460 C740,435 745,420 760,420 Z'
      ],
      medians: [
        [[530, 175], [530, 835]],
        [[260, 435], [260, 810], [765, 810]],
        [[795, 435], [795, 835]]
      ]
    },
    '天': {
      strokes: [
        'M300,250 L720,250 C750,250 765,270 760,300 C750,325 730,335 695,335 L300,335 C270,335 250,325 250,300 C250,270 270,250 300,250 Z',
        'M170,440 L850,440 C880,440 895,465 885,495 C870,520 840,525 810,525 L210,525 C180,525 150,520 140,495 C130,465 140,440 170,440 Z',
        'M520,260 C550,260 565,280 555,310 L545,490 L255,855 C240,880 210,885 190,865 C175,845 180,815 200,790 L465,490 L465,310 C465,280 485,260 520,260 Z',
        'M470,500 C495,500 515,520 525,545 L815,845 C845,875 835,900 805,910 C775,920 750,905 730,880 L450,560 C435,540 445,515 470,500 Z'
      ],
      medians: [
        [[280, 290], [735, 290]],
        [[160, 480], [860, 480]],
        [[530, 275], [512, 500], [200, 855]],
        [[465, 515], [800, 885]]
      ]
    }
  };

  function WritingEngine(options) {
    if (!(this instanceof WritingEngine)) {
      return new WritingEngine(options);
    }

    const defaultOptions = {
      canvas: null,
      char: '永',
      mode: 'demo', // 'demo' | 'practice'
      animSpeed: 1.0,
      onStrokeChange: null,
      onStrokeSuccess: null,
      onStrokeError: null,
      onComplete: null
    };

    this.options = Object.assign({}, defaultOptions, options);
    this.canvas = typeof this.options.canvas === 'string'
      ? document.querySelector(this.options.canvas)
      : this.options.canvas;

    if (!this.canvas) {
      console.error('[WritingEngine] 유효한 캔버스 엘리먼트가 필요합니다.');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.char = this.options.char || '永';
    this.mode = this.options.mode || 'demo';
    this.data = HANJA_DICT[this.char] || null;

    this.currentStrokeIndex = 0;
    this.completedStrokeIndex = 0;
    this.isAnimating = false;
    this.animProgress = 0.0;
    this.animRafId = null;
    this._lastTimestamp = 0;

    this.isDrawing = false;
    this.userPoints = [];
    this._pathCache = [];

    this._boundHandlers = {
      pointerDown: this._handlePointerDown.bind(this),
      pointerMove: this._handlePointerMove.bind(this),
      pointerUp: this._handlePointerUp.bind(this),
      resize: this.resize.bind(this)
    };

    this._init();
  }

  WritingEngine.getAvailablePresets = function () {
    return Object.keys(HANJA_DICT);
  };

  WritingEngine.prototype = {
    _init: function () {
      this.canvas.style.touchAction = 'none';
      this.canvas.addEventListener('pointerdown', this._boundHandlers.pointerDown);
      this.canvas.addEventListener('pointermove', this._boundHandlers.pointerMove);
      this.canvas.addEventListener('pointerup', this._boundHandlers.pointerUp);
      this.canvas.addEventListener('pointercancel', this._boundHandlers.pointerUp);
      window.addEventListener('resize', this._boundHandlers.resize);

      this._buildPathCache();
      this.resize();
      this.setCharacter(this.char);
    },

    resize: function () {
      const rect = this.canvas.getBoundingClientRect();
      const w = rect.width || this.canvas.offsetWidth || 320;
      const h = rect.height || this.canvas.offsetHeight || 320;
      const dpr = window.devicePixelRatio || 1;

      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);

      this.dpr = dpr;
      this.width = w;
      this.height = h;
      this.scale = (w / 1024) * dpr;

      this.redraw();
    },

    setCharacter: function (char) {
      this.stopAnimation();
      this.char = char;
      this.data = HANJA_DICT[char] || null;
      this.currentStrokeIndex = 0;
      this.completedStrokeIndex = 0;
      this.userPoints = [];
      this._buildPathCache();
      this.redraw();
      this._notifyStrokeChange();
    },

    setMode: function (mode) {
      this.stopAnimation();
      this.mode = mode;
      this.currentStrokeIndex = 0;
      this.completedStrokeIndex = 0;
      this.userPoints = [];
      this.redraw();
      this._notifyStrokeChange();
    },

    _buildPathCache: function () {
      this._pathCache = [];
      if (!this.data || !this.data.strokes) return;
      for (let i = 0; i < this.data.strokes.length; i++) {
        this._pathCache.push(new Path2D(this.data.strokes[i]));
      }
    },

    _getPath2D: function (idx) {
      return this._pathCache[idx];
    },

    redraw: function () {
      const ctx = this.ctx;
      if (!ctx || !this.scale) return;

      ctx.save();
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      ctx.clearRect(0, 0, 1024, 1024);

      // 1. 田자형 격자
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 1018, 1018);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(512, 0);
      ctx.lineTo(512, 1024);
      ctx.moveTo(0, 512);
      ctx.lineTo(1024, 512);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. 글리프 워터마크 음영
      if (this.data && this.data.strokes) {
        for (let i = 0; i < this.data.strokes.length; i++) {
          const p = this._getPath2D(i);
          if (p) {
            ctx.fillStyle = '#e2e8f0';
            ctx.fill(p);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3;
            ctx.stroke(p);
          }
        }
      }

      // 3. 완료 획 렌더링
      if (this.data && this.data.strokes) {
        const endIdx = (this.mode === 'demo') ? this.currentStrokeIndex : this.completedStrokeIndex;
        for (let i = 0; i < endIdx && i < this.data.strokes.length; i++) {
          const p = this._getPath2D(i);
          if (p) {
            ctx.fillStyle = '#1e293b';
            ctx.fill(p);
          }
        }
      }

      // 4. [시연 모드] 붓글씨 마스킹 애니메이션
      if (this.mode === 'demo' && this.isAnimating && this.data) {
        const idx = this.currentStrokeIndex;
        if (idx < this.data.strokes.length) {
          const p = this._getPath2D(idx);
          const medians = this.data.medians[idx];

          if (p && medians && medians.length > 1) {
            ctx.save();
            ctx.clip(p);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 180;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(medians[0][0], medians[0][1]);

            const totalSegs = medians.length - 1;
            const curTarget = this.animProgress * totalSegs;
            const fullIdx = Math.floor(curTarget);
            const frac = curTarget - fullIdx;

            for (let j = 0; j < fullIdx; j++) {
              ctx.lineTo(medians[j + 1][0], medians[j + 1][1]);
            }
            if (fullIdx < totalSegs) {
              const p1 = medians[fullIdx];
              const p2 = medians[fullIdx + 1];
              ctx.lineTo(p1[0] + (p2[0] - p1[0]) * frac, p1[1] + (p2[1] - p1[1]) * frac);
            }
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 5. [연습 모드] 다음 작성 획 시작점 배지
      if (this.mode === 'practice' && this.data) {
        const idx = this.completedStrokeIndex;
        if (idx < this.data.strokes.length) {
          const medians = this.data.medians[idx];
          if (medians && medians.length > 0) {
            const startPt = medians[0];

            ctx.beginPath();
            ctx.arc(startPt[0], startPt[1], 36, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 6;
            ctx.stroke();

            ctx.fillStyle = '#1d4ed8';
            ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(idx + 1), startPt[0], startPt[1] + 2);
          }
        }
      }

      // 6. [연습 모드] 사용자 실시간 터치 입력 선
      if (this.mode === 'practice' && this.userPoints.length > 1) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 26;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.userPoints[0].x, this.userPoints[0].y);
        for (let i = 1; i < this.userPoints.length; i++) {
          ctx.lineTo(this.userPoints[i].x, this.userPoints[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    },

    playAnimation: function () {
      if (!this.data || this.mode !== 'demo') return;

      this.stopAnimation();
      this.isAnimating = true;

      if (this.currentStrokeIndex >= this.data.strokes.length) {
        this.currentStrokeIndex = 0;
      }
      this.animProgress = 0.0;
      this._lastTimestamp = performance.now();
      this._notifyStrokeChange();

      const loop = (timestamp) => {
        if (!this.isAnimating) return;

        const dt = Math.min((timestamp - this._lastTimestamp) / 1000, 0.1);
        this._lastTimestamp = timestamp;

        const speed = (this.options.animSpeed || 1.0) * 1.8;
        this.animProgress += dt * speed;

        if (this.animProgress >= 1.0) {
          this.animProgress = 0.0;
          this.currentStrokeIndex++;
          this._notifyStrokeChange();

          if (this.currentStrokeIndex >= this.data.strokes.length) {
            this.isAnimating = false;
            this.redraw();
            if (typeof this.options.onComplete === 'function') {
              this.options.onComplete();
            }
            return;
          }
        }

        this.redraw();
        this.animRafId = requestAnimationFrame(loop);
      };

      this.animRafId = requestAnimationFrame(loop);
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
      this.animProgress = 0.0;
      this.redraw();
    },

    stepNextStroke: function () {
      this.stopAnimation();
      if (!this.data) return;

      if (this.mode === 'demo') {
        if (this.currentStrokeIndex < this.data.strokes.length) {
          this.currentStrokeIndex++;
          this.redraw();
          this._notifyStrokeChange();
        }
      } else {
        if (this.completedStrokeIndex < this.data.strokes.length) {
          this.completedStrokeIndex++;
          this.userPoints = [];
          this.redraw();
          this._notifyStrokeChange();
          if (this.completedStrokeIndex >= this.data.strokes.length && typeof this.options.onComplete === 'function') {
            this.options.onComplete();
          }
        }
      }
    },

    stepPrevStroke: function () {
      this.stopAnimation();
      if (!this.data) return;

      if (this.mode === 'demo') {
        if (this.currentStrokeIndex > 0) {
          this.currentStrokeIndex--;
          this.redraw();
          this._notifyStrokeChange();
        }
      } else {
        if (this.completedStrokeIndex > 0) {
          this.completedStrokeIndex--;
          this.userPoints = [];
          this.redraw();
          this._notifyStrokeChange();
        }
      }
    },

    reset: function () {
      this.stopAnimation();
      this.currentStrokeIndex = 0;
      this.completedStrokeIndex = 0;
      this.userPoints = [];
      this.redraw();
      this._notifyStrokeChange();
    },

    _notifyStrokeChange: function () {
      if (typeof this.options.onStrokeChange === 'function') {
        const cur = (this.mode === 'demo') ? this.currentStrokeIndex : this.completedStrokeIndex;
        const total = this.data ? this.data.strokes.length : 0;
        this.options.onStrokeChange(cur, total);
      }
    },

    _toSvgPoint: function (e) {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      return {
        x: (clientX / (rect.width || 320)) * 1024,
        y: (clientY / (rect.height || 320)) * 1024
      };
    },

    _handlePointerDown: function (e) {
      if (this.mode !== 'practice' || !this.data) return;
      if (this.completedStrokeIndex >= this.data.strokes.length) return;

      this.isDrawing = true;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}

      const pt = this._toSvgPoint(e);
      this.userPoints = [pt];
      this.redraw();
    },

    _handlePointerMove: function (e) {
      if (!this.isDrawing) return;
      const pt = this._toSvgPoint(e);
      this.userPoints.push(pt);
      this.redraw();
    },

    _handlePointerUp: function (e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}

      if (this.userPoints.length < 2) {
        this.userPoints = [];
        this.redraw();
        return;
      }

      const result = this._gradeCurrentStroke(this.userPoints);
      if (result.success) {
        this.completedStrokeIndex++;
        this.userPoints = [];
        this.redraw();
        this._notifyStrokeChange();

        if (typeof this.options.onStrokeSuccess === 'function') {
          this.options.onStrokeSuccess(this.completedStrokeIndex, this.data.strokes.length);
        }
        if (this.completedStrokeIndex >= this.data.strokes.length && typeof this.options.onComplete === 'function') {
          this.options.onComplete();
        }
      } else {
        this.userPoints = [];
        this.redraw();
        if (typeof this.options.onStrokeError === 'function') {
          this.options.onStrokeError(this.completedStrokeIndex, result.reason);
        }
      }
    },

    _gradeCurrentStroke: function (userPts) {
      const medians = this.data.medians[this.completedStrokeIndex];
      if (!medians || medians.length < 2) return { success: false, reason: '데이터 오류' };

      const targetStart = medians[0];
      const targetEnd = medians[medians.length - 1];
      const userStart = [userPts[0].x, userPts[0].y];
      const userEnd = [userPts[userPts.length - 1].x, userPts[userPts.length - 1].y];

      // 1. 시작점 반경 검사
      const startDist = Math.hypot(userStart[0] - targetStart[0], userStart[1] - targetStart[1]);
      if (startDist > 260) {
        return { success: false, reason: '시작 위치가 맞지 않습니다.' };
      }

      // 2. 방향 벡터 각도 검사
      const targetVec = [targetEnd[0] - targetStart[0], targetEnd[1] - targetStart[1]];
      const userVec = [userEnd[0] - userStart[0], userEnd[1] - userStart[1]];
      const targetAngle = Math.atan2(targetVec[1], targetVec[0]);
      const userAngle = Math.atan2(userVec[1], userVec[0]);

      let diffAngle = Math.abs(targetAngle - userAngle);
      if (diffAngle > Math.PI) diffAngle = Math.PI * 2 - diffAngle;

      if (diffAngle > (Math.PI * 0.42)) {
        return { success: false, reason: '획의 진행 방향이 다릅니다.' };
      }

      // 3. 궤적 평균 거리 검사
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

      if (avgDist > 220) {
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

    destroy: function () {
      this.stopAnimation();
      this.canvas.removeEventListener('pointerdown', this._boundHandlers.pointerDown);
      this.canvas.removeEventListener('pointermove', this._boundHandlers.pointerMove);
      this.canvas.removeEventListener('pointerup', this._boundHandlers.pointerUp);
      this.canvas.removeEventListener('pointercancel', this._boundHandlers.pointerUp);
      window.removeEventListener('resize', this._boundHandlers.resize);
    }
  };

  global.WritingEngine = WritingEngine;

})(typeof window !== 'undefined' ? window : this);