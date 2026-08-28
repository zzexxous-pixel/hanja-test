/**
 * writingEngine.js
 * 한자 마스터용 범용 캔버스 필기 & 스트로크 관리 엔진
 */
(function (global) {
  'use strict';

  function WritingEngine(options) {
    if (!(this instanceof WritingEngine)) {
      return new WritingEngine(options);
    }

    const defaultOptions = {
      canvas: null,
      strokeColor: '#2c3e50',
      strokeWidth: 8,
      guideColor: 'rgba(0, 0, 0, 0.08)',
      guideChar: '',
      guideFont: 'serif',
      gridType: 'mi', // 'none' | 'tian' (田) | 'mi' (米)
      gridColor: '#e0e0e0',
      onStrokeStart: null,
      onStrokeEnd: null,
      onChange: null
    };

    this.options = Object.assign({}, defaultOptions, options);
    this.canvas = typeof this.options.canvas === 'string' 
      ? document.querySelector(this.options.canvas) 
      : this.options.canvas;

    if (!this.canvas) {
      console.error('[WritingEngine] 유효한 캔버스 엘리먼트가 제공되지 않았습니다.');
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    
    // 상태 변수
    this.isDrawing = false;
    this.currentStroke = [];
    this.strokes = []; // 완성된 획 목록
    this.redoStack = []; // Redo용 획 목록

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
    },

    resize: function () {
      const rect = this.canvas.getBoundingClientRect();
      const width = rect.width || this.canvas.offsetWidth || 300;
      const height = rect.height || this.canvas.offsetHeight || 300;

      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
      this.ctx.resetTransform();
      this.ctx.scale(this.dpr, this.dpr);

      this.logicalWidth = width;
      this.logicalHeight = height;

      this.redraw();
    },

    _getCanvasPoint: function (e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure || 0.5
      };
    },

    _handlePointerDown: function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.isDrawing = true;
      this.canvas.setPointerCapture(e.pointerId);

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

      if (typeof this.options.onStrokeStart === 'function') {
        this.options.onStrokeStart(pt);
      }
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
      } catch (err) {
        // 무시
      }

      if (this.currentStroke.length > 0) {
        this.strokes.push(this.currentStroke);
        this.currentStroke = [];
        this.redraw();

        if (typeof this.options.onStrokeEnd === 'function') {
          this.options.onStrokeEnd(this.strokes.length);
        }
        if (typeof this.options.onChange === 'function') {
          this.options.onChange({
            strokeCount: this.strokes.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
          });
        }
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
      const type = this.options.gridType;
      if (type === 'none') return;

      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;

      ctx.save();
      ctx.strokeStyle = this.options.gridColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // 테두리
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

      // 십자선 (田 / 米 공통)
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);

      // 대각선 (米자 전용)
      if (type === 'mi') {
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h);
        ctx.moveTo(w, 0);
        ctx.lineTo(0, h);
      }
      ctx.stroke();
      ctx.restore();
    },

    _drawGuideChar: function () {
      const char = this.options.guideChar;
      if (!char) return;

      const w = this.logicalWidth;
      const h = this.logicalHeight;
      const ctx = this.ctx;
      const fontSize = Math.min(w, h) * 0.78;

      ctx.save();
      ctx.font = `${fontSize}px ${this.options.guideFont}`;
      ctx.fillStyle = this.options.guideColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, w / 2, h / 2 + (fontSize * 0.04));
      ctx.restore();
    },

    _drawAllStrokes: function () {
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
            // 부드러운 곡선 보간 (중간점 활용)
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
      this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
      this._drawGrid();
      this._drawGuideChar();
      this._drawAllStrokes();
    },

    // Public APIs
    setStrokeColor: function (color) {
      this.options.strokeColor = color;
    },

    setStrokeWidth: function (width) {
      this.options.strokeWidth = Number(width);
    },

    setGuideChar: function (char) {
      this.options.guideChar = char;
      this.redraw();
    },

    setGridType: function (type) {
      this.options.gridType = type; // 'none' | 'tian' | 'mi'
      this.redraw();
    },

    undo: function () {
      if (this.strokes.length === 0) return false;
      const popped = this.strokes.pop();
      this.redoStack.push(popped);
      this.redraw();
      this._notifyChange();
      return true;
    },

    redo: function () {
      if (this.redoStack.length === 0) return false;
      const restored = this.redoStack.pop();
      this.strokes.push(restored);
      this.redraw();
      this._notifyChange();
      return true;
    },

    clear: function () {
      this.strokes = [];
      this.redoStack = [];
      this.currentStroke = [];
      this.redraw();
      this._notifyChange();
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

    getStrokesData: function () {
      return JSON.parse(JSON.stringify(this.strokes));
    },

    toDataURL: function (type, quality) {
      return this.canvas.toDataURL(type || 'image/png', quality || 1.0);
    },

    _notifyChange: function () {
      if (typeof this.options.onChange === 'function') {
        this.options.onChange({
          strokeCount: this.strokes.length,
          canUndo: this.canUndo(),
          canRedo: this.canRedo()
        });
      }
    },

    destroy: function () {
      this.canvas.removeEventListener('pointerdown', this._boundHandlers.pointerDown);
      this.canvas.removeEventListener('pointermove', this._boundHandlers.pointerMove);
      this.canvas.removeEventListener('pointerup', this._boundHandlers.pointerUp);
      this.canvas.removeEventListener('pointercancel', this._boundHandlers.pointerCancel);
      window.removeEventListener('resize', this._boundHandlers.resize);
    }
  };

  // Global Export
  global.WritingEngine = WritingEngine;

})(typeof window !== 'undefined' ? window : this);