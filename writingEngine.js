/**
 * writingEngine.js
 * 한자 마스터용 표준 붓글씨 획순 애니메이션 & 실시간 쓰기 판정 엔진
 * (부수 상시 하이라이트 및 기하학적 메타데이터 분석 지원)
 */
(function (global) {
  'use strict';

  // HanziWriter CDN 자동 로더
  function loadHanziWriter(callback) {
    if (typeof global.HanziWriter !== 'undefined') {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';
    script.onload = callback;
    script.onerror = function () {
      console.error('[WritingEngine] HanziWriter 라이브러리 로드 실패');
    };
    document.head.appendChild(script);
  }

  function WritingEngine(options) {
    if (!(this instanceof WritingEngine)) {
      return new WritingEngine(options);
    }

    const defaultOptions = {
      container: null,
      char: '永',
      mode: 'demo', // 'demo' | 'practice'
      width: 320,
      height: 320,
      strokeColor: '#1e293b',      // 일반 몸체 획 색상 (흑회색)
      radicalColor: '#2563eb',     // 부수(Radical) 상시 하이라이트 색상 (파란색)
      outlineColor: '#e2e8f0',     // 워터마크 배경 서체 색상
      highlightColor: '#ef4444',   // 시연 애니메이션 진행 잉크 색상
      drawingColor: '#2563eb',     // 연습 모드 필기 선 색상
      drawingWidth: 20,
      animSpeed: 1.0,
      onCharLoaded: null,          // (metaData) => { totalStrokes, radCount, remainCount, radPosition, ... }
      onStrokeChange: null,
      onStrokeSuccess: null,
      onStrokeError: null,
      onComplete: null
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
    this.writer = null;
    this.meta = {
      char: this.char,
      totalStrokes: 0,
      radCount: 0,
      remainCount: 0,
      radStrokes: [],
      radPosition: '판별 중'
    };
    this.currentStroke = 0;
    this.isReady = false;

    this._initDOM();
    loadHanziWriter(() => {
      this._initWriter();
    });
  }

  WritingEngine.prototype = {
    _initDOM: function () {
      this.container.innerHTML = '';
      this.container.style.position = 'relative';
      this.container.style.width = `${this.options.width}px`;
      this.container.style.height = `${this.options.height}px`;
      this.container.style.boxSizing = 'border-box';
      this.container.style.backgroundColor = '#ffffff';

      // 田자형 가이드 격자 SVG 배경 생성
      const gridSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      gridSvg.setAttribute('width', '100%');
      gridSvg.setAttribute('height', '100%');
      gridSvg.style.position = 'absolute';
      gridSvg.style.top = '0';
      gridSvg.style.left = '0';
      gridSvg.style.pointerEvents = 'none';
      gridSvg.innerHTML = `
        <rect x="1" y="1" width="${this.options.width - 2}" height="${this.options.height - 2}" fill="none" stroke="#94a3b8" stroke-width="2"/>
        <line x1="${this.options.width / 2}" y1="0" x2="${this.options.width / 2}" y2="${this.options.height}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 6"/>
        <line x1="0" y1="${this.options.height / 2}" x2="${this.options.width}" y2="${this.options.height / 2}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6 6"/>
      `;
      this.container.appendChild(gridSvg);

      // HanziWriter 타겟 래퍼
      this.targetEl = document.createElement('div');
      this.targetEl.style.width = '100%';
      this.targetEl.style.height = '100%';
      this.container.appendChild(this.targetEl);
    },

    _initWriter: function () {
      this.targetEl.innerHTML = '';
      this.writer = global.HanziWriter.create(this.targetEl, this.char, {
        width: this.options.width,
        height: this.options.height,
        padding: 15,
        strokeColor: this.options.strokeColor,
        radicalColor: this.options.radicalColor, // ★ 부수 상시 하이라이트 적용
        outlineColor: this.options.outlineColor,
        highlightColor: this.options.highlightColor,
        drawingColor: this.options.drawingColor,
        drawingWidth: this.options.drawingWidth,
        strokeAnimationSpeed: this.options.animSpeed * 1.2,
        delayBetweenStrokes: 150,
        showOutline: true,
        showCharacter: false,
        highlightOnComplete: false,
        onLoadCharDataSuccess: (data) => {
          this._parseCharMeta(data);
          this.isReady = true;
          this._applyMode();
          this._notifyStrokeChange();

          if (typeof this.options.onCharLoaded === 'function') {
            this.options.onCharLoaded(this.meta);
          }
        },
        onLoadCharDataError: (err) => {
          console.error('[WritingEngine] 한자 데이터 로드 실패:', err);
        }
      });
    },

    // 부수 위치 및 획수 기하학적 메타데이터 계산
    _parseCharMeta: function (data) {
      const totalStrokes = data.strokes.length;
      const radStrokes = Array.isArray(data.radStrokes) ? data.radStrokes : [];
      const radCount = radStrokes.length;
      const remainCount = Math.max(0, totalStrokes - radCount);

      // 부수 위치 자동 분석
      let radPosition = '단독/전체';
      if (radCount > 0 && radCount < totalStrokes && data.medians) {
        let radMinX = Infinity, radMaxX = -Infinity;
        let radMinY = Infinity, radMaxY = -Infinity;
        let radAvgX = 0, ptCount = 0;

        radStrokes.forEach((sIdx) => {
          const med = data.medians[sIdx];
          if (med) {
            med.forEach((pt) => {
              radMinX = Math.min(radMinX, pt[0]);
              radMaxX = Math.max(radMaxX, pt[0]);
              radMinY = Math.min(radMinY, pt[1]);
              radMaxY = Math.max(radMaxY, pt[1]);
              radAvgX += pt[0];
              ptCount++;
            });
          }
        });

        if (ptCount > 0) {
          radAvgX /= ptCount;
          const radWidth = radMaxX - radMinX;
          const radHeight = radMaxY - radMinY;

          if (radMaxX < 560 && radAvgX < 450 && radHeight > 350) {
            radPosition = '변 (좌측)';
          } else if (radMinX > 460 && radAvgX > 560 && radHeight > 350) {
            radPosition = '방 (우측)';
          } else if (radMinY > 500 && radWidth > 380) { // 폰트 좌표계 Y-Up 기준 상단
            radPosition = '머리 (상단)';
          } else if (radMaxY < 500 && radWidth > 380) {
            radPosition = '발 (하단)';
          } else if (radWidth > 600 || radHeight > 600) {
            radPosition = '받침 / 몸 (외곽)';
          } else {
            radPosition = '조합 / 내부';
          }
        }
      }

      this.meta = {
        char: this.char,
        totalStrokes: totalStrokes,
        radCount: radCount,
        remainCount: remainCount,
        radStrokes: radStrokes,
        radPosition: radPosition
      };
    },

    _applyMode: function () {
      if (!this.writer || !this.isReady) return;

      this.writer.cancelQuiz();
      this.writer.hideCharacter();

      if (this.mode === 'demo') {
        this.currentStroke = 0;
        this.writer.showOutline();
      } else if (this.mode === 'practice') {
        this.currentStroke = 0;
        this.startQuiz();
      }
      this._notifyStrokeChange();
    },

    setCharacter: function (char) {
      if (!char || char === this.char) return;
      this.char = char;
      if (this.writer) {
        this.isReady = false;
        this.writer.setCharacter(char).then(() => {
          this._parseCharMeta(this.writer._charData);
          this.isReady = true;
          this._applyMode();
          if (typeof this.options.onCharLoaded === 'function') {
            this.options.onCharLoaded(this.meta);
          }
        });
      }
    },

    setMode: function (mode) {
      if (this.mode === mode) return;
      this.mode = mode; // 'demo' | 'practice'
      this._applyMode();
    },

    getMeta: function () {
      return Object.assign({}, this.meta);
    },

    // -------------------------------------------------------------
    // 획순 시연 모드 (Demo Mode) API
    // -------------------------------------------------------------
    playAnimation: function () {
      if (!this.writer || !this.isReady || this.mode !== 'demo') return;

      this.writer.hideCharacter();
      this.writer.animateCharacter({
        onComplete: () => {
          this.currentStroke = this.meta.totalStrokes;
          this._notifyStrokeChange();
          if (typeof this.options.onComplete === 'function') {
            this.options.onComplete();
          }
        }
      });
    },

    pauseAnimation: function () {
      if (!this.writer) return;
      this.writer.pauseAnimation();
    },

    stepNextStroke: function () {
      if (!this.writer || !this.isReady) return;

      if (this.mode === 'demo') {
        if (this.currentStroke < this.meta.totalStrokes) {
          this.writer.animateStroke(this.currentStroke, {
            onComplete: () => {
              this.currentStroke++;
              this._notifyStrokeChange();
            }
          });
        }
      }
    },

    stepPrevStroke: function () {
      if (!this.writer || !this.isReady) return;

      if (this.mode === 'demo' && this.currentStroke > 0) {
        this.currentStroke--;
        this.writer.hideCharacter();
        for (let i = 0; i < this.currentStroke; i++) {
          this.writer.showStroke(i);
        }
        this._notifyStrokeChange();
      }
    },

    reset: function () {
      if (!this.writer || !this.isReady) return;
      this._applyMode();
    },

    // -------------------------------------------------------------
    // 쓰기 연습 모드 (Quiz / 실시간 판정 & 스냅) API
    // -------------------------------------------------------------
    startQuiz: function () {
      if (!this.writer || !this.isReady) return;

      this.currentStroke = 0;
      this.writer.quiz({
        showHintAfterMisses: 1,
        onCorrectStroke: (data) => {
          this.currentStroke = data.strokeNum + 1;
          this._notifyStrokeChange();
          if (typeof this.options.onStrokeSuccess === 'function') {
            this.options.onStrokeSuccess(this.currentStroke, this.meta.totalStrokes);
          }
        },
        onMistake: (data) => {
          if (typeof this.options.onStrokeError === 'function') {
            this.options.onStrokeError(data.strokeNum, '획의 순서나 방향이 올바르지 않습니다.');
          }
        },
        onComplete: () => {
          this.currentStroke = this.meta.totalStrokes;
          this._notifyStrokeChange();
          if (typeof this.options.onComplete === 'function') {
            this.options.onComplete();
          }
        }
      });
    },

    _notifyStrokeChange: function () {
      if (typeof this.options.onStrokeChange === 'function') {
        this.options.onStrokeChange(this.currentStroke, this.meta.totalStrokes);
      }
    }
  };

  global.WritingEngine = WritingEngine;

})(typeof window !== 'undefined' ? window : this);