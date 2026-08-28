/**
 * writingEngine.js
 * 한자 마스터용 범용 캔버스 필기 & 획순(쓰는 순서) 가이드 엔진
 */
(function (global) {
  'use strict';

  // 내장 한자 획순 정규화(0.0 ~ 1.0) 좌표 프리셋 (기초 10자)
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
    '人': [
      [{x:0.50, y:0.20}, {x:0.25, y:0.85}],
      [{x:0.42, y:0.48}, {x:0.75, y:0.85}]
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
    ]
  };

  function WritingEngine(options) {
    if (!(this instanceof WritingEngine)) {
      return new WritingEngine(options);
    }

    const defaultOptions = {
      canvas: null,
      guideChar: '永',
      strokeColor: '#1e293b',
      strokeWidth: 9,
      orderStrokeColor: '#ef4444',
      orderCompletedColor: '#94a3b8',
      orderStrokeWidth: 10,
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
    this.guideChar = this.options.guideChar || '永';
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

  WritingEngine.prototype = {
    _init: function () {
      this.canvas.style.touchAction = 'none';
      this.canvas.addEventListener('pointerdown', this._boundHandlers.pointerDown);
      this.canvas.addEventListener('pointermove', this._boundHandlers.pointerMove);
      this.canvas.addEventListener('pointerup', this._boundHandlers.pointerUp);
      this.canvas.addEventListener('pointercancel', this._boundHandlers.pointerCancel);
      window.addEventListener('resize', this._boundHandlers.resize);

      this.resize();
      this.setCharacter(this.guideChar);
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

    setCharacter: function (char) {
      this.guideChar = char || '';
      this.stopAnimation();

      if (this.guideChar && PRESET_STROKES[this.guideChar]) {
        this.strokeOrderData = PRESET_STROKES[this.guideChar];
      } else {
        this.strokeOrderData = [];
      }

      this.currentStrokeIndex = -1;
      this.redraw();
      this._notifyStrokeChange();
    },

    getAvailablePresets: function () {
      return Object.keys(PRESET_STROKES);
    },

    playAnimation: function () {
      if (!this.strokeOrderData || this.strokeOrderData.length === 0) return;

      this.stopAnimation();
      this.isAnimating = true;

      if (this.currentStrokeIndex >= this.strokeOrderData.length - 1 || this.currentStrokeIndex < 0) {
        this.currentStrokeIndex = 0;
      }
      this.animProgress = 0;
      this._lastTimestamp = performance.now();
      this._notifyStrokeChange();

      const animateLoop = (timestamp) => {
        if (!this.isAnimating) return;

        const dt = (timestamp - this._lastTimestamp) / 1000;
        this._lastTimestamp = timestamp;

        this.animProgress += dt * 1.4;

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

    resetStrokeOrder: function () {
      this.pauseAnimation();
      this.animProgress = 0;
      this.currentStrokeIndex = -1;
      this.redraw();
      this._notifyStrokeChange();
    },

    _notifyStrokeChange: function () {
      if (typeof this.options.onStrokeChange === 'function') {
        const current = this.currentStrokeIndex < 0 ? 0 : Math.min(this.currentStrokeIndex + 1, this.strokeOrderData.length);
        const total = this.strokeOrderData ? this.strokeOrderData.length : 0;
        this.options.onStrokeChange(current, total);
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

    // 田자형 가이드 격자 (외곽선 + 가로/세로 점선만 렌더링, 사선 없음)
    _drawGrid: function () {
      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;

      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.restore();
    },

    _drawGuideChar: function () {
      if (!this.guideChar) return;

      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;
      const fontSize = Math.min(w, h) * 0.76;

      ctx.save();
      ctx.font = `${fontSize}px "Noto Serif KR", "Batang", serif`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.guideChar, w / 2, h / 2 + (fontSize * 0.04));
      ctx.restore();
    },

    _drawStrokeOrderLayer: function () {
      if (!this.strokeOrderData || this.strokeOrderData.length === 0) return;

      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;

      // 1. 획 순서 선 그리기
      if (this.currentStrokeIndex >= 0) {
        for (let i = 0; i <= this.currentStrokeIndex && i < this.strokeOrderData.length; i++) {
          const rawPoints = this.strokeOrderData[i];
          if (!rawPoints || rawPoints.length < 2) continue;

          const isCurrent = (i === this.currentStrokeIndex);
          const strokeColor = isCurrent ? this.options.orderStrokeColor : this.options.orderCompletedColor;
          const strokeWidth = isCurrent ? this.options.orderStrokeWidth : (this.options.orderStrokeWidth * 0.8);

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
              ctx.arc(interX, interY, strokeWidth * 0.6, 0, Math.PI * 2);
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
      for (let i = 0; i < this.strokeOrderData.length; i++) {
        const rawPoints = this.strokeOrderData[i];
        if (!rawPoints || rawPoints.length === 0) continue;

        const startX = rawPoints[0].x * w;
        const startY = rawPoints[0].y * h;
        const isDone = (i < this.currentStrokeIndex);
        const isCurrent = (i === this.currentStrokeIndex);

        ctx.save();
        ctx.beginPath();
        ctx.arc(startX, startY, 11, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent ? '#ef4444' : (isDone ? '#3b82f6' : '#ffffff');
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isCurrent ? '#b91c1c' : (isDone ? '#1d4ed8' : '#94a3b8');
        ctx.stroke();

        ctx.fillStyle = (isCurrent || isDone) ? '#ffffff' : '#334155';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), startX, startY + 0.5);
        ctx.restore();
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