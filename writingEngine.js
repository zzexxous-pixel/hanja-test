/**
 * writingEngine.js
 * 한자 마스터용 범용 캔버스 필기 & 획순(쓰는 순서) 가이드 엔진
 */
(function (global) {
  'use strict';

  // 내장 한자 획순 정규화(0.0 ~ 1.0) 좌표 프리셋 (총 26자)
  const PRESET_STROKES = {
    '永': [
      [{x:0.50, y:0.18}, {x:0.50, y:0.26}],
      [{x:0.25, y:0.38}, {x:0.75, y:0.38}, {x:0.50, y:0.38}, {x:0.50, y:0.85}, {x:0.42, y:0.75}],
      [{x:0.42, y:0.46}, {x:0.24, y:0.58}],
      [{x:0.35, y:0.60}, {x:0.18, y:0.85}],
      [{x:0.56, y:0.52}, {x:0.85, y:0.88}]
    ],
    '水': [
      [{x:0.50, y:0.15}, {x:0.50, y:0.85}, {x:0.40, y:0.75}],
      [{x:0.38, y:0.35}, {x:0.18, y:0.55}],
      [{x:0.18, y:0.60}, {x:0.40, y:0.85}],
      [{x:0.60, y:0.35}, {x:0.85, y:0.85}]
    ],
    '木': [
      [{x:0.18, y:0.40}, {x:0.82, y:0.40}],
      [{x:0.50, y:0.15}, {x:0.50, y:0.88}],
      [{x:0.50, y:0.40}, {x:0.20, y:0.85}],
      [{x:0.50, y:0.40}, {x:0.80, y:0.85}]
    ],
    '火': [
      [{x:0.26, y:0.42}, {x:0.34, y:0.55}],
      [{x:0.74, y:0.38}, {x:0.66, y:0.52}],
      [{x:0.50, y:0.18}, {x:0.50, y:0.48}, {x:0.22, y:0.85}],
      [{x:0.48, y:0.48}, {x:0.78, y:0.85}]
    ],
    '金': [
      [{x:0.50, y:0.15}, {x:0.25, y:0.40}],
      [{x:0.45, y:0.25}, {x:0.75, y:0.40}],
      [{x:0.35, y:0.45}, {x:0.65, y:0.45}],
      [{x:0.25, y:0.60}, {x:0.75, y:0.60}],
      [{x:0.50, y:0.45}, {x:0.50, y:0.82}],
      [{x:0.36, y:0.68}, {x:0.30, y:0.78}],
      [{x:0.64, y:0.68}, {x:0.70, y:0.78}],
      [{x:0.18, y:0.85}, {x:0.82, y:0.85}]
    ],
    '土': [
      [{x:0.28, y:0.42}, {x:0.72, y:0.42}],
      [{x:0.50, y:0.18}, {x:0.50, y:0.85}],
      [{x:0.18, y:0.85}, {x:0.82, y:0.85}]
    ],
    '日': [
      [{x:0.28, y:0.20}, {x:0.28, y:0.80}],
      [{x:0.28, y:0.20}, {x:0.72, y:0.20}, {x:0.72, y:0.80}],
      [{x:0.28, y:0.50}, {x:0.72, y:0.50}],
      [{x:0.28, y:0.80}, {x:0.72, y:0.80}]
    ],
    '月': [
      [{x:0.30, y:0.20}, {x:0.28, y:0.85}],
      [{x:0.30, y:0.20}, {x:0.70, y:0.20}, {x:0.70, y:0.85}, {x:0.60, y:0.82}],
      [{x:0.30, y:0.42}, {x:0.70, y:0.42}],
      [{x:0.30, y:0.62}, {x:0.70, y:0.62}]
    ],
    '山': [
      [{x:0.50, y:0.20}, {x:0.50, y:0.80}],
      [{x:0.22, y:0.45}, {x:0.22, y:0.80}, {x:0.78, y:0.80}],
      [{x:0.78, y:0.45}, {x:0.78, y:0.80}]
    ],
    '天': [
      [{x:0.30, y:0.26}, {x:0.70, y:0.26}],
      [{x:0.18, y:0.45}, {x:0.82, y:0.45}],
      [{x:0.50, y:0.26}, {x:0.50, y:0.50}, {x:0.24, y:0.85}],
      [{x:0.48, y:0.50}, {x:0.76, y:0.85}]
    ],
    '人': [
      [{x:0.50, y:0.20}, {x:0.25, y:0.85}],
      [{x:0.42, y:0.48}, {x:0.75, y:0.85}]
    ],
    '大': [
      [{x:0.18, y:0.38}, {x:0.82, y:0.38}],
      [{x:0.50, y:0.18}, {x:0.50, y:0.42}, {x:0.22, y:0.85}],
      [{x:0.48, y:0.42}, {x:0.78, y:0.85}]
    ],
    '中': [
      [{x:0.26, y:0.28}, {x:0.26, y:0.65}],
      [{x:0.26, y:0.28}, {x:0.74, y:0.28}, {x:0.74, y:0.65}],
      [{x:0.26, y:0.65}, {x:0.74, y:0.65}],
      [{x:0.50, y:0.12}, {x:0.50, y:0.90}]
    ],
    '王': [
      [{x:0.28, y:0.25}, {x:0.72, y:0.25}],
      [{x:0.50, y:0.25}, {x:0.50, y:0.82}],
      [{x:0.32, y:0.52}, {x:0.68, y:0.52}],
      [{x:0.18, y:0.82}, {x:0.82, y:0.82}]
    ],
    '文': [
      [{x:0.50, y:0.18}, {x:0.50, y:0.30}],
      [{x:0.20, y:0.38}, {x:0.80, y:0.38}],
      [{x:0.50, y:0.38}, {x:0.24, y:0.82}],
      [{x:0.38, y:0.52}, {x:0.78, y:0.84}]
    ],
    '心': [
      [{x:0.30, y:0.52}, {x:0.24, y:0.64}],
      [{x:0.35, y:0.46}, {x:0.46, y:0.80}, {x:0.76, y:0.80}, {x:0.76, y:0.62}],
      [{x:0.50, y:0.42}, {x:0.50, y:0.55}],
      [{x:0.74, y:0.36}, {x:0.80, y:0.50}]
    ],
    '口': [
      [{x:0.28, y:0.28}, {x:0.28, y:0.75}],
      [{x:0.28, y:0.28}, {x:0.72, y:0.28}, {x:0.72, y:0.75}],
      [{x:0.28, y:0.75}, {x:0.72, y:0.75}]
    ],
    '一': [
      [{x:0.20, y:0.50}, {x:0.80, y:0.50}]
    ],
    '二': [
      [{x:0.30, y:0.36}, {x:0.70, y:0.36}],
      [{x:0.18, y:0.66}, {x:0.82, y:0.66}]
    ],
    '三': [
      [{x:0.26, y:0.30}, {x:0.74, y:0.30}],
      [{x:0.32, y:0.50}, {x:0.68, y:0.50}],
      [{x:0.18, y:0.72}, {x:0.82, y:0.72}]
    ],
    '五': [
      [{x:0.25, y:0.25}, {x:0.75, y:0.25}],
      [{x:0.48, y:0.25}, {x:0.38, y:0.78}],
      [{x:0.38, y:0.52}, {x:0.70, y:0.52}, {x:0.70, y:0.78}],
      [{x:0.20, y:0.78}, {x:0.80, y:0.78}]
    ],
    '七': [
      [{x:0.20, y:0.50}, {x:0.80, y:0.42}],
      [{x:0.48, y:0.22}, {x:0.48, y:0.78}, {x:0.75, y:0.78}, {x:0.75, y:0.65}]
    ],
    '九': [
      [{x:0.42, y:0.20}, {x:0.25, y:0.85}],
      [{x:0.25, y:0.38}, {x:0.75, y:0.38}, {x:0.60, y:0.82}, {x:0.78, y:0.82}]
    ],
    '十': [
      [{x:0.20, y:0.50}, {x:0.80, y:0.50}],
      [{x:0.50, y:0.18}, {x:0.50, y:0.85}]
    ],
    '百': [
      [{x:0.22, y:0.22}, {x:0.78, y:0.22}],
      [{x:0.50, y:0.22}, {x:0.45, y:0.40}],
      [{x:0.30, y:0.40}, {x:0.30, y:0.85}],
      [{x:0.30, y:0.40}, {x:0.70, y:0.40}, {x:0.70, y:0.85}],
      [{x:0.30, y:0.62}, {x:0.70, y:0.62}],
      [{x:0.30, y:0.85}, {x:0.70, y:0.85}]
    ],
    '千': [
      [{x:0.72, y:0.22}, {x:0.28, y:0.32}],
      [{x:0.18, y:0.50}, {x:0.82, y:0.50}],
      [{x:0.50, y:0.30}, {x:0.50, y:0.88}]
    ]
  };

  function WritingEngine(options) {
    if (!(this instanceof WritingEngine)) {
      return new WritingEngine(options);
    }

    const defaultOptions = {
      canvas: null,
      showGrid: true,             // 田자형 가이드 격자
      gridColor: '#e2e8f0',
      strokeColor: '#1e293b',     // 사용자 필기 색상
      strokeWidth: 9,             // 사용자 필기 굵기
      guideChar: '',              // 배경 워터마크 글자
      showGuideChar: true,        // 워터마크 표시 여부
      guideColor: 'rgba(0, 0, 0, 0.08)',
      guideFont: '"Noto Serif KR", "Batang", serif',
      
      // 획순 가이드 옵션
      orderStrokeColor: '#ef4444',
      orderCompletedColor: '#94a3b8',
      orderStrokeWidth: 10,
      showStrokeNumbers: true,
      animSpeed: 1.0,
      onStrokeChange: null,
      onAnimComplete: null,
      onChange: null
    };

    this.options = Object.assign({}, defaultOptions, options);
    this.canvas = typeof this.options.canvas === 'string' 
      ? document.querySelector(this.options.canvas) 
      : this.options.canvas;

    if (!this.canvas) {
      console.error('[WritingEngine] 유효한 캔버스 엘리먼트를 찾을 수 없습니다.');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.logicalWidth = 320;
    this.logicalHeight = 320;

    // 사용자 필기 상태
    this.isDrawing = false;
    this.currentStroke = [];
    this.strokes = [];
    this.redoStack = [];

    // 획순 애니메이션 상태
    this.strokeOrderData = [];
    this.currentStrokeIndex = -1;
    this.isAnimating = false;
    this.animProgress = 0;
    this.animRafId = null;
    this._lastTimestamp = 0;

    this._boundHandlers = {
      pointerDown: this._handlePointerDown.bind(this),
      pointerMove: this._handlePointerMove.bind(this),
      pointerUp: this._handlePointerUp.bind(this),
      pointerCancel: this._handlePointerCancel.bind(this),
      resize: this.resize.bind(this)
    };

    this._init();
  }

  // Static 속성 & 메서드
  WritingEngine.PRESETS = PRESET_STROKES;
  WritingEngine.getAvailablePresets = function () {
    return Object.keys(PRESET_STROKES);
  };

  WritingEngine.prototype = {
    _init: function () {
      this.canvas.style.touchAction = 'none';
      this.canvas.addEventListener('pointerdown', this._boundHandlers.pointerDown);
      this.canvas.addEventListener('pointermove', this._boundHandlers.pointerMove);
      this.canvas.addEventListener('pointerup', this._boundHandlers.pointerUp);
      this.canvas.addEventListener('pointercancel', this._boundHandlers.pointerCancel);
      window.addEventListener('resize', this._boundHandlers.resize);

      // 1. 크기 계산 및 초기 버퍼 스케일 설정
      this.resize();

      // 2. 글자 및 획순 데이터 초기화
      if (this.options.guideChar) {
        this.setCharacter(this.options.guideChar);
      }
    },

    resize: function () {
      const rect = this.canvas.getBoundingClientRect();
      const width = rect.width || this.canvas.offsetWidth || 320;
      const height = rect.height || this.canvas.offsetHeight || 320;

      this.dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(width * this.dpr);
      this.canvas.height = Math.round(height * this.dpr);

      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.logicalWidth = width;
      this.logicalHeight = height;

      this.redraw();
    },

    setCharacter: function (char, customStrokes) {
      this.options.guideChar = char || '';
      this.stopAnimation();

      if (customStrokes && Array.isArray(customStrokes)) {
        this.strokeOrderData = customStrokes;
      } else if (char && PRESET_STROKES[char]) {
        this.strokeOrderData = PRESET_STROKES[char];
      } else {
        this.strokeOrderData = [];
      }

      this.currentStrokeIndex = -1;
      this.redraw();
      this._notifyStrokeChange();
    },

    setStrokeData: function (strokes) {
      this.stopAnimation();
      this.strokeOrderData = Array.isArray(strokes) ? strokes : [];
      this.currentStrokeIndex = -1;
      this.redraw();
      this._notifyStrokeChange();
    },

    getAvailablePresets: function () {
      return Object.keys(PRESET_STROKES);
    },

    hasStrokeOrder: function (char) {
      const target = char || this.options.guideChar;
      return !!PRESET_STROKES[target] || (this.strokeOrderData && this.strokeOrderData.length > 0);
    },

    getTotalOrderStrokes: function () {
      return this.strokeOrderData.length;
    },

    getCurrentOrderStroke: function () {
      return this.currentStrokeIndex + 1;
    },

    playAnimation: function (fromStart = true) {
      if (!this.strokeOrderData || this.strokeOrderData.length === 0) return;

      this.stopAnimation();
      this.isAnimating = true;

      if (fromStart || this.currentStrokeIndex >= this.strokeOrderData.length - 1 || this.currentStrokeIndex < 0) {
        this.currentStrokeIndex = 0;
      }
      this.animProgress = 0;
      this._lastTimestamp = performance.now();

      const animateLoop = (timestamp) => {
        if (!this.isAnimating) return;

        const dt = (timestamp - this._lastTimestamp) / 1000;
        this._lastTimestamp = timestamp;

        const speed = (this.options.animSpeed || 1.0) * 1.5;
        this.animProgress += dt * speed;

        if (this.animProgress >= 1.0) {
          this.animProgress = 0;
          this.currentStrokeIndex++;
          this._notifyStrokeChange();

          if (this.currentStrokeIndex >= this.strokeOrderData.length) {
            this.isAnimating = false;
            this.currentStrokeIndex = this.strokeOrderData.length - 1;
            this.animProgress = 1.0;
            this.redraw();
            if (typeof this.options.onAnimComplete === 'function') {
              this.options.onAnimComplete();
            }
            return;
          }
        }

        this.redraw();
        this.animRafId = requestAnimationFrame(animateLoop);
      };

      this.animRafId = requestAnimationFrame(animateLoop);
    },

    pauseAnimation: function () {
      if (this.isAnimating) {
        this.isAnimating = false;
        if (this.animRafId) {
          cancelAnimationFrame(this.animRafId);
          this.animRafId = null;
        }
      }
    },

    stopAnimation: function () {
      this.pauseAnimation();
      this.animProgress = 0;
      this.currentStrokeIndex = -1;
      this.redraw();
      this._notifyStrokeChange();
    },

    stepNextStroke: function () {
      this.pauseAnimation();
      if (!this.strokeOrderData || this.strokeOrderData.length === 0) return;
      if (this.currentStrokeIndex < this.strokeOrderData.length - 1) {
        this.currentStrokeIndex++;
        this.animProgress = 1.0;
        this.redraw();
        this._notifyStrokeChange();
      }
    },

    stepPrevStroke: function () {
      this.pauseAnimation();
      if (!this.strokeOrderData || this.strokeOrderData.length === 0) return;
      if (this.currentStrokeIndex > 0) {
        this.currentStrokeIndex--;
        this.animProgress = 1.0;
      } else {
        this.currentStrokeIndex = -1;
        this.animProgress = 0;
      }
      this.redraw();
      this._notifyStrokeChange();
    },

    toggleStrokeNumbers: function (show) {
      this.options.showStrokeNumbers = (typeof show === 'boolean') ? show : !this.options.showStrokeNumbers;
      this.redraw();
    },

    setAnimSpeed: function (speed) {
      this.options.animSpeed = Math.max(0.2, Math.min(4.0, Number(speed) || 1.0));
    },

    setShowGrid: function (show) {
      this.options.showGrid = !!show;
      this.redraw();
    },

    setShowGuideChar: function (show) {
      this.options.showGuideChar = !!show;
      this.redraw();
    },

    _notifyStrokeChange: function () {
      if (typeof this.options.onStrokeChange === 'function') {
        this.options.onStrokeChange(this.getCurrentOrderStroke(), this.getTotalOrderStrokes());
      }
    },

    _getCanvasPoint: function (e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    },

    _handlePointerDown: function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.isDrawing = true;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (err) {}

      const pt = this._getCanvasPoint(e);
      this.currentStroke = [{
        x: pt.x,
        y: pt.y,
        color: this.options.strokeColor,
        width: this.options.strokeWidth
      }];

      if (this.redoStack.length > 0) {
        this.redoStack = [];
      }

      this._drawSegment(pt.x, pt.y, pt.x, pt.y, this.options.strokeColor, this.options.strokeWidth);
    },

    _handlePointerMove: function (e) {
      if (!this.isDrawing) return;

      const pt = this._getCanvasPoint(e);
      const prevPt = this.currentStroke[this.currentStroke.length - 1];

      this.currentStroke.push({
        x: pt.x,
        y: pt.y,
        color: this.options.strokeColor,
        width: this.options.strokeWidth
      });

      this._drawSegment(prevPt.x, prevPt.y, pt.x, pt.y, this.options.strokeColor, this.options.strokeWidth);
    },

    _handlePointerUp: function (e) {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}

      if (this.currentStroke.length > 0) {
        this.strokes.push(this.currentStroke);
        this.currentStroke = [];
        this.redraw();
        this._notifyUserChange();
      }
    },

    _handlePointerCancel: function (e) {
      this._handlePointerUp(e);
    },

    _drawSegment: function (x1, y1, x2, y2, color, width) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = width;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      this.ctx.restore();
    },

    _drawGrid: function () {
      if (!this.options.showGrid) return;

      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;

      ctx.save();
      ctx.strokeStyle = this.options.gridColor;
      ctx.lineWidth = 1.5;

      // 외곽 사각 테두리
      ctx.strokeRect(1, 1, w - 2, h - 2);

      // 田자형 십자 가이드 (점선)
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.restore();
    },

    _drawGuideChar: function () {
      if (!this.options.showGuideChar || !this.options.guideChar) return;

      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;
      const fontSize = Math.min(w, h) * 0.76;

      ctx.save();
      ctx.font = `${fontSize}px ${this.options.guideFont}`;
      ctx.fillStyle = this.options.guideColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.options.guideChar, w / 2, h / 2 + (fontSize * 0.04));
      ctx.restore();
    },

    _drawStrokeOrderLayer: function () {
      if (!this.strokeOrderData || this.strokeOrderData.length === 0) return;

      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;

      // 1. 획 선 그리기
      if (this.currentStrokeIndex >= 0) {
        for (let i = 0; i <= this.currentStrokeIndex && i < this.strokeOrderData.length; i++) {
          const rawPoints = this.strokeOrderData[i];
          if (!rawPoints || rawPoints.length < 2) continue;

          const isCurrent = (i === this.currentStrokeIndex);
          const strokeColor = isCurrent ? this.options.orderStrokeColor : this.options.orderCompletedColor;
          const strokeWidth = isCurrent ? this.options.orderStrokeWidth : (this.options.orderStrokeWidth * 0.85);

          const pts = rawPoints.map(p => ({ x: p.x * w, y: p.y * h }));

          ctx.save();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);

          if (isCurrent && this.isAnimating) {
            const totalSegments = pts.length - 1;
            const currentTargetIndex = this.animProgress * totalSegments;
            const fullIndex = Math.floor(currentTargetIndex);
            const fraction = currentTargetIndex - fullIndex;

            for (let j = 0; j < fullIndex; j++) {
              ctx.lineTo(pts[j + 1].x, pts[j + 1].y);
            }

            if (fullIndex < totalSegments) {
              const pStart = pts[fullIndex];
              const pEnd = pts[fullIndex + 1];
              const interX = pStart.x + (pEnd.x - pStart.x) * fraction;
              const interY = pStart.y + (pEnd.y - pStart.y) * fraction;
              ctx.lineTo(interX, interY);

              ctx.stroke();
              ctx.beginPath();
              ctx.arc(interX, interY, strokeWidth * 0.7, 0, Math.PI * 2);
              ctx.fillStyle = '#dc2626';
              ctx.fill();
            } else {
              ctx.stroke();
            }
          } else {
            for (let j = 1; j < pts.length; j++) {
              ctx.lineTo(pts[j].x, pts[j].y);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // 2. 획 번호 배지 오버레이
      if (this.options.showStrokeNumbers) {
        for (let i = 0; i < this.strokeOrderData.length; i++) {
          const rawPoints = this.strokeOrderData[i];
          if (!rawPoints || rawPoints.length === 0) continue;

          const startX = rawPoints[0].x * w;
          const startY = rawPoints[0].y * h;
          const isDone = (i <= this.currentStrokeIndex);
          const isCurrent = (i === this.currentStrokeIndex);

          ctx.save();
          ctx.beginPath();
          ctx.arc(startX, startY, 11, 0, Math.PI * 2);
          ctx.fillStyle = isCurrent ? '#ef4444' : (isDone ? '#3b82f6' : '#ffffff');
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = isCurrent ? '#b91c1c' : (isDone ? '#1d4ed8' : '#64748b');
          ctx.stroke();

          ctx.fillStyle = (isCurrent || isDone) ? '#ffffff' : '#334155';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(i + 1), startX, startY + 0.5);
          ctx.restore();
        }
      }
    },

    _drawUserStrokes: function () {
      const ctx = this.ctx;

      for (let s = 0; s < this.strokes.length; s++) {
        const stroke = this.strokes[s];
        if (stroke.length === 0) continue;

        ctx.save();
        ctx.strokeStyle = stroke[0].color;
        ctx.lineWidth = stroke[0].width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        if (stroke.length === 1) {
          ctx.arc(stroke[0].x, stroke[0].y, stroke[0].width / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke[0].color;
          ctx.fill();
        } else {
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            const prev = stroke[i - 1];
            const curr = stroke[i];
            const midX = (prev.x + curr.x) / 2;
            const midY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
          const last = stroke[stroke.length - 1];
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    redraw: function () {
      if (!this.logicalWidth || !this.logicalHeight) return;
      this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
      this._drawGrid();
      this._drawGuideChar();
      this._drawStrokeOrderLayer();
      this._drawUserStrokes();
    },

    setStrokeColor: function (color) {
      this.options.strokeColor = color;
    },

    setStrokeWidth: function (width) {
      this.options.strokeWidth = Number(width);
    },

    undo: function () {
      if (this.strokes.length === 0) return false;
      this.redoStack.push(this.strokes.pop());
      this.redraw();
      this._notifyUserChange();
      return true;
    },

    redo: function () {
      if (this.redoStack.length === 0) return false;
      this.strokes.push(this.redoStack.pop());
      this.redraw();
      this._notifyUserChange();
      return true;
    },

    clear: function () {
      this.strokes = [];
      this.redoStack = [];
      this.currentStroke = [];
      this.redraw();
      this._notifyUserChange();
    },

    canUndo: function () {
      return this.strokes.length > 0;
    },

    canRedo: function () {
      return this.redoStack.length > 0;
    },

    getStrokeCount: function () {
      return this.strokes.length;
    },

    toDataURL: function (type, quality) {
      return this.canvas.toDataURL(type || 'image/png', quality || 1.0);
    },

    _notifyUserChange: function () {
      if (typeof this.options.onChange === 'function') {
        this.options.onChange({
          strokeCount: this.strokes.length,
          canUndo: this.canUndo(),
          canRedo: this.canRedo()
        });
      }
    },

    destroy: function () {
      this.stopAnimation();
      this.canvas.removeEventListener('pointerdown', this._boundHandlers.pointerDown);
      this.canvas.removeEventListener('pointermove', this._boundHandlers.pointerMove);
      this.canvas.removeEventListener('pointerup', this._boundHandlers.pointerUp);
      this.canvas.removeEventListener('pointercancel', this._boundHandlers.pointerCancel);
      window.removeEventListener('resize', this._boundHandlers.resize);
    }
  };

  global.WritingEngine = WritingEngine;

})(typeof window !== 'undefined' ? window : this);