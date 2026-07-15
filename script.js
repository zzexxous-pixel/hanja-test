const savedHanjaSize = localStorage.getItem('hanja_size') || 45;
const savedHunSize = localStorage.getItem('hun_size') || 17;
document.documentElement.style.setProperty('--hanja-size', savedHanjaSize + 'px');
document.documentElement.style.setProperty('--hun-size', savedHunSize + 'px');

let currentGrade = localStorage.getItem('hanja_grade') || '4급';
let totalPages = 12; 

// 💡 신규 추가: 로컬스토리지 연동 발음 임계값 변수 바인딩 (기본값 60% = 0.6)
let currentThreshold = parseFloat(localStorage.getItem('hanja_threshold')) || 0.6;

let activeTab = 1;
let preFavoriteTab = 1; 
let isQuizMode = false;

let bookmarks = JSON.parse(localStorage.getItem('hanja_bookmarks')) || [];
let activeFavoriteIndices = [...bookmarks];

let defaultHanjaSizePx = parseInt(savedHanjaSize);
let defaultHunSizePx = parseInt(savedHunSize);

let solvedHanjas = new Set();
const tabCache = {};
let isFavoritesDirty = true; 
const tabsNeedReset = new Set();

let evaluationTargetIndex = null;
let processingTargetIndex = null; 
let isListening = false;
let isCardLock = false;        

let titleClickCount = 0;
let titleClickTimer = null;

function saveBookmarks() {
    localStorage.setItem('hanja_bookmarks', JSON.stringify(bookmarks));
}

function adjustFontSize(amount) {
    defaultHanjaSizePx = Math.max(16, Math.min(64, defaultHanjaSizePx + amount));
    defaultHunSizePx = Math.max(9, Math.min(28, defaultHunSizePx + (amount > 0 ? 1 : -1)));
    
    document.documentElement.style.setProperty('--hanja-size', `${defaultHanjaSizePx}px`);
    document.documentElement.style.setProperty('--hun-size', `${defaultHunSizePx}px`);

    localStorage.setItem('hanja_size', defaultHanjaSizePx);
    localStorage.setItem('hun_size', defaultHunSizePx);

    appLog('System', `글꼴 변경 ➡️ 한자: ${defaultHanjaSizePx}px / 훈음: ${defaultHunSizePx}px`);
}

function toggleBookmark(index, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const bIdx = bookmarks.indexOf(index);
    const isRemoving = bIdx > -1;

    if (isRemoving) {
        bookmarks.splice(bIdx, 1);
    } else {
        bookmarks.push(index);
    }
    saveBookmarks();

    isFavoritesDirty = true; 

    updateCellStarUI(index, !isRemoving);
    updateModalStarState(index);

    appLog('System', `즐겨찾기 토글 ➡️ #${index + 1} (${hanjaData[index].h}) : ${isRemoving ? '제거됨' : '등록됨'}`);
}

function updateCellStarUI(index, isStarred) {
    const liveWrappers = document.querySelectorAll(`.star-wrapper-${index}`);
    liveWrappers.forEach(starWrapper => {
        starWrapper.className = `star-wrapper-${index} btn-mini-icon type-star ${isStarred ? 'starred' : 'unstarred'}`;
    });

    const targetTab = Math.floor(index / 50) + 1;
    if (tabCache[targetTab]) {
        const cachedWrapper = tabCache[targetTab].querySelector(`.star-wrapper-${index}`);
        if (cachedWrapper) {
            cachedWrapper.className = `star-wrapper-${index} btn-mini-icon type-star ${isStarred ? 'starred' : 'unstarred'}`;
        }
    }
}

function updateModalStarState(index) {
    const starBtn = document.getElementById('modal-star-btn');
    if (!starBtn) return;
    if (bookmarks.includes(index)) {
        starBtn.className = "btn-popup-top-icon theme-star starred";
    } else {
        starBtn.className = "btn-popup-top-icon theme-star unstarred";
    }
}

function preRenderStaticTables() {
    for (let key in tabCache) {
        if (key !== "13") delete tabCache[key];
    }
    
    for (let t = 1; t <= totalPages; t++) { 
        const startIdx = (t - 1) * 50;
        const startIdxText = startIdx + 1;
        const endIdx = Math.min(startIdx + 50, hanjaData.length);
        const pageData = hanjaData.slice(startIdx, endIdx).map((item, localIdx) => ({
            ...item,
            originalIdx: startIdx + localIdx
        }));
        
        const tableDiv = document.createElement('div');
        tableDiv.className = "bg-white border border-slate-200 overflow-hidden mb-6";
        tableDiv.innerHTML = generateTableHTML(t, pageData, `${startIdxText} ~ ${endIdx}자`);
        tabCache[t] = tableDiv;
    }
    appLog('System', `고정 탭 1 ~ ${totalPages} 선행 렌더링 캐싱 엔진 수립 완료`);
}

function buildFavoritesDOM() {
    const pageData = activeFavoriteIndices.map(originalIdx => ({
        ...hanjaData[originalIdx],
        originalIdx: originalIdx
    }));
    
    const titleLabel = `★ 즐겨찾기 한자 (${pageData.length}자)`;
    const tableWrapper = document.createElement('div');
    tableWrapper.className = "bg-white border border-slate-200 overflow-hidden mb-6";
    
    if (pageData.length === 0) {
        tableWrapper.innerHTML = `
            <div class="p-12 text-center">
                <i class="fa-solid fa-star text-slate-200 text-6xl mb-4"></i>
                <h3 class="text-lg font-bold text-slate-500">즐겨찾기 한자가 없습니다.</h3>
                <p class="text-slate-400 text-sm mt-1">한자 칸의 우측 상단 별표(★)를 눌러 추가해 보세요!</p>
            </div>
        `;
        return tableWrapper;
    }

    tableWrapper.innerHTML = generateTableHTML(13, pageData, titleLabel);
    return tableWrapper;
}

function generateTableHTML(t, pageData, titleLabel) {
    let gridHTML = `
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h2 class="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full ${t === 13 ? 'bg-amber-500' : 'bg-blue-600'}"></span>
                ${titleLabel}
            </h2>
            <span class="quiz-guide-text text-xs text-slate-500 font-medium hidden items-center gap-1.5 select-none">
                <i class="fa-solid fa-microphone text-red-500 animate-pulse"></i> 한자를 누르고 읽어보세요.
            </span>
        </div>
        <div class="p-4 hanja-responsive-grid">
    `;

    pageData.forEach((item) => {
        const globalIdx = item.originalIdx;
        const isStarred = bookmarks.includes(globalIdx);
        const isSolved = solvedHanjas.has(globalIdx);
        const solvedClass = isSolved ? 'solved' : '';
        
        gridHTML += `
            <div class="hanja-card-wrapper bg-white border border-slate-100 rounded-xl p-3 flex flex-col items-center relative hover:bg-slate-50 transition-all shadow-sm" data-index="${globalIdx}">
                <div data-action="toggle-bookmark" data-index="${globalIdx}" class="w-full flex justify-between items-center mb-1 cursor-pointer bg-transparent select-none">
                    <span class="card-status-label text-[10px] font-mono font-bold text-slate-400 leading-none flex items-center justify-center h-4 min-w-[24px]">#${globalIdx + 1}</span>
                    <span class="star-wrapper-${globalIdx} btn-mini-icon type-star ${isStarred ? 'starred' : 'unstarred'}">
                        <i class="fa-solid fa-star"></i>
                    </span>
                </div>
                <div data-action="open-modal" data-index="${globalIdx}" class="w-full flex justify-center items-center my-2 cursor-pointer select-none">
                    <span class="hanja-font dynamic-hanja-size font-bold text-slate-900 leading-none">
                        ${item.h}
                    </span>
                </div>
                <div data-action="click-hun" data-index="${globalIdx}" class="w-full text-center border-t border-slate-50 pt-2 cursor-pointer">
                    <span id="hun-text-${globalIdx}" class="quiz-blur-target ${solvedClass} dynamic-hun-size font-bold text-slate-600" data-type="hun">
                        ${item.m}
                    </span>
                </div>
            </div>
        `;
    });

    gridHTML += `</div>`;
    return gridHTML;
}

function prevPage() {
    if (activeTab === 13) return;
    let target = activeTab - 1;
    if (target < 1) target = totalPages;
    switchTab(target);
}

function nextPage() {
    if (activeTab === 13) return;
    let target = activeTab + 1;
    if (target > totalPages) target = 1;
    switchTab(target);
}

function toggleFavorites() {
    if (activeTab === 13) {
        switchTab(preFavoriteTab);
    } else {
        preFavoriteTab = activeTab;
        switchTab(13);
    }
}

function resetSingleTabDOM(tabNum) {
    if (!tabCache[tabNum]) return;
    tabCache[tabNum].querySelectorAll('.hanja-card-wrapper').forEach(cell => {
        cell.classList.remove('card-final-correct', 'card-final-incorrect', 'mic-pulse-active', 'recording-active', 'checking-pulse-active');
        const idx = cell.getAttribute('data-index');
        const statusLabel = cell.querySelector('.card-status-label');
        if (statusLabel) statusLabel.innerHTML = `#${parseInt(idx, 10) + 1}`;
    });
    tabCache[tabNum].querySelectorAll('.quiz-blur-target').forEach(span => {
        span.classList.remove('solved');
    });
    appLog('System', `JIT 스팟 리셋 완수 ➡️ 대상 탭: ${tabNum === 13 ? '★ 즐겨찾기' : tabNum + '페이지'}`);
}

function switchTab(tabNum) {
    activeTab = tabNum;
    const container = document.getElementById('table-view-container');
    if (!container) return;
    container.innerHTML = ''; 

    if (tabNum === 13) {
        if (isFavoritesDirty || !tabCache[13]) {
            activeFavoriteIndices = [...bookmarks];
            tabCache[13] = buildFavoritesDOM();
            isFavoritesDirty = false;
            tabsNeedReset.delete(13);
        } else if (tabsNeedReset.has(13)) {
            resetSingleTabDOM(13);
            tabsNeedReset.delete(13);
        }
        container.appendChild(tabCache[13]);
    } else {
        if (tabNum > totalPages) {
            tabNum = 1;
            activeTab = 1;
        }
        if (tabsNeedReset.has(tabNum)) {
            resetSingleTabDOM(tabNum);
            tabsNeedReset.delete(tabNum);
        }
        container.appendChild(tabCache[tabNum]);
    }
    
    const tabBtn7 = document.getElementById('tab-7');
    const pagerWrapper = document.getElementById('pager-wrapper');
    const pageIndicator = document.getElementById('page-indicator');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');

    if (tabNum === 13) {
        if (tabBtn7) tabBtn7.className = "btn-header-ctrl active";
        if (pagerWrapper) {
            pagerWrapper.className = "flex items-center gap-1 bg-slate-700/40 p-1 rounded-lg h-10 text-slate-400 shadow-none shrink-0 select-none pointer-events-none opacity-50";
        }
        if (btnPrev) btnPrev.className = "btn-header-ctrl disabled";
        if (btnNext) btnNext.className = "btn-header-ctrl disabled";
        if (pageIndicator) pageIndicator.innerText = `★ / ${totalPages}`;
    } else {
        if (tabBtn7) tabBtn7.className = "btn-header-ctrl";
        if (pagerWrapper) {
            pagerWrapper.className = "flex items-center gap-1 bg-blue-950/40 p-1 rounded-lg h-10 text-white shadow-sm transition-all duration-200 shrink-0 select-none";
        }
        if (btnPrev) btnPrev.className = "btn-header-ctrl";
        if (btnNext) btnNext.className = "btn-header-ctrl";
        if (pageIndicator) pageIndicator.innerText = `${tabNum} / ${totalPages}`;
    }

    appLog('System', `화면 탭 전환 ➡️ 대상 탭: ${tabNum === 13 ? '★ 즐겨찾기' : tabNum + '페이지'}`);
}

function toggleSolvedState(globalIdx, forceSolved) {
    const isSolved = (forceSolved !== undefined) ? forceSolved : !solvedHanjas.has(globalIdx);
    if (isSolved) {
        solvedHanjas.add(globalIdx);
    } else {
        solvedHanjas.delete(globalIdx);
    }
    
    const liveSpans = document.querySelectorAll(`#hun-text-${globalIdx}`);
    liveSpans.forEach(span => {
        span.classList.toggle('solved', isSolved);
    });

    const targetTab = Math.floor(globalIdx / 50) + 1;
    if (tabCache[targetTab]) {
        const cachedSpan = tabCache[targetTab].querySelector(`#hun-text-${globalIdx}`);
        if (cachedSpan) {
            cachedSpan.classList.toggle('solved', isSolved);
        }
    }

    if (tabCache[13]) {
        const cachedFavSpan = tabCache[13].querySelector(`#hun-text-${globalIdx}`);
        if (cachedFavSpan) {
            cachedFavSpan.classList.toggle('solved', isSolved);
        }
    }
}

function handleHunClick(tdElement, globalIdx) {
    if (isQuizMode) {
        toggleSolvedState(globalIdx);
    } else {
        openModal(globalIdx);
    }
}

function updateCardUIState(index, state, passType) {
    const cardWrapper = document.querySelector(`.hanja-card-wrapper[data-index="${index}"]`);
    if (!cardWrapper) return;
    const statusLabel = cardWrapper.querySelector('.card-status-label');
    if (!statusLabel) return;

    cardWrapper.classList.remove('mic-pulse-active', 'recording-active', 'checking-pulse-active', 'card-final-correct', 'card-final-incorrect');
    
    if (state === 'idle') {
        statusLabel.innerHTML = `#${index + 1}`;
    } else if (state === 'touch') {
        statusLabel.innerHTML = `<span class="text-amber-500 font-bold">⏳</span>`;
    } else if (state === 'active') {
        statusLabel.innerHTML = `<i class="fa-solid fa-microphone text-red-500 text-sm animate-pulse"></i>`;
        cardWrapper.classList.add('mic-pulse-active', 'recording-active');
    } else if (state === 'checking') {
        statusLabel.innerHTML = `<i class="fa-solid fa-pen text-amber-500 text-sm animate-pulse"></i>`;
        cardWrapper.classList.add('checking-pulse-active');
    } else if (state === 'final') {
        if (passType === 'correct') {
            statusLabel.innerHTML = `<span class="text-emerald-500 text-xs font-black">⭕</span>`;
            cardWrapper.classList.add('card-final-correct');
        } else if (passType === 'incorrect') {
            statusLabel.innerHTML = `<span class="text-rose-500 text-xs font-black">❌</span>`;
            cardWrapper.classList.add('card-final-incorrect');
        }
    }
}

function executeFinalJudgment(index, isCorrect) {
    if (isCorrect) {
        audioEngine.playCorrect(); 
        updateCardUIState(index, 'final', 'correct');
        toggleSolvedState(index, true);
    } else {
        audioEngine.playIncorrect(); 
        updateCardUIState(index, 'final', 'incorrect');
    }

    isCardLock = false;
    processingTargetIndex = null;
    evaluationTargetIndex = null;
}

function handleToggleVoiceQuiz(index) {
    if (solvedHanjas.has(index)) return;

    if (isCardLock && processingTargetIndex === index) {
        appLog('System', `#${index + 1} 재클릭 취소 요구 수용 ➡️ 마이크 무력화 가동`);
        speechEngine.cancel();
        return;
    }

    if (isCardLock) return;

    isCardLock = true;
    processingTargetIndex = index;
    evaluationTargetIndex = index;

    updateCardUIState(index, 'touch');
    appLog('System', `한자 터치 토글 시동 ➡️ #${index + 1}`);

    // 💡 개선: 하드코딩되었던 0.6 수치를 환경설정 값인 'currentThreshold' 변수와 동적 바인딩
    speechEngine.start({
        targetText: hanjaData[index].m, 
        threshold: currentThreshold,                
        timeoutMs: 5000,               
        onStart: function() {
            isListening = true;
            updateCardUIState(index, 'active');
            appLog('System', `🎙️ 마이크 세션 독립 시동 완료 ➡️ #${index + 1}`);
        },
        onSuccess: function() {
            appLog('System', `#${index + 1} 정답 판정 임계치 통과 수신 완료`);
            executeFinalJudgment(index, true);
        },
        onFail: function() {
            appLog('System', `#${index + 1} 무음 시간만료 또는 불일치 최종 오답 수신 완료`);
            executeFinalJudgment(index, false);
        },
        onCancel: function() {
            appLog('System', `#${index + 1} 사용자 수동 취소 인지 원복 완료`);
            updateCardUIState(index, 'idle');
            isCardLock = false;
            processingTargetIndex = null;
            evaluationTargetIndex = null;
        }
    });
}

let currentVoiceHanja = '';
let currentVoiceHun = '';
let currentActiveModalIdx = 0;

function openModal(index) {
    const data = hanjaData[index];
    currentVoiceHanja = data.h;
    currentVoiceHun = data.m;
    currentActiveModalIdx = index;
    
    document.getElementById('modal-idx').innerText = `NO. ${String(index + 1).padStart(3, '0')}`;
    document.getElementById('modal-hanja').innerText = data.h;
    document.getElementById('modal-hun').innerText = data.m;
    document.getElementById('naver-link').href = `https://hanja.dict.naver.com/#/search?query=${encodeURIComponent(data.h)}`;

    const modalStarBtn = document.getElementById('modal-star-btn');
    modalStarBtn.onclick = (e) => toggleBookmark(index, e);
    
    const modalIdx = document.getElementById('modal-idx');
    modalIdx.onclick = (e) => toggleBookmark(index, e);

    updateModalStarState(index);

    const modal = document.getElementById('detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('scale-95');
        modal.querySelector('.transform').classList.add('scale-100');
    }, 10);

    appLog('System', `상세 모달 팝업 열림 ➡️ #${index + 1} (${data.h} : ${data.m})`);
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    
    const transformTarget = modal.querySelector('.transform');
    if (transformTarget) {
        transformTarget.classList.add('scale-95');
        transformTarget.classList.remove('scale-100');
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);

    appLog('System', '상세 모달 팝업 닫힘');
}

function getEum(m) {
    if (!m) return "";
    const parts = m.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1] || "";
    return lastPart.split(',')[0] || lastPart;
}

function loadGradeData(targetGrade) {
    const targetIndex = GRADE_ORDER.indexOf(targetGrade);
    if (targetIndex === -1) return;

    let accumulated = [];
    for (let i = 0; i <= targetIndex; i++) {
        const gradeKey = GRADE_ORDER[i];
        if (hanjaNewData[gradeKey] && Array.isArray(hanjaNewData[gradeKey])) {
            hanjaNewData[gradeKey].forEach(item => {
                if (!accumulated.some(accItem => accItem.h === item.h)) {
                    accumulated.push(item);
                }
            });
        }
    }

    accumulated.sort((a, b) => {
        const eumA = getEum(a.m);
        const eumB = getEum(b.m);
        return eumA.localeCompare('ko') || a.m.localeCompare('ko');
    });

    hanjaData.length = 0;
    hanjaData.push(...accumulated);

    totalPages = Math.ceil(hanjaData.length / 50);
    if (totalPages === 0) totalPages = 1;

    appLog('System', `급수 전환 ➡️ [${targetGrade}] 데이터 로드 완료 (총 ${hanjaData.length}자, ${totalPages}페이지)`);
}

function openGradeModal() {
    renderGradeGrid();
    const modal = document.getElementById('grade-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('scale-95');
        modal.querySelector('.transform').classList.add('scale-100');
    }, 10);
    appLog('System', '학습 급수 선택 모달 오픈');
}

function closeGradeModal() {
    const modal = document.getElementById('grade-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const transformTarget = modal.querySelector('.transform');
    if (transformTarget) {
        transformTarget.classList.add('scale-95');
        transformTarget.classList.remove('scale-100');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    appLog('System', '학습 급수 선택 모달 닫힘');
}

function renderGradeGrid() {
    const container = document.getElementById('grade-grid-container');
    if (!container) return;
    container.innerHTML = '';

    GRADE_ORDER.forEach(grade => {
        const hasData = hanjaNewData[grade] && Array.isArray(hanjaNewData[grade]) && hanjaNewData[grade].length > 0;
        const isCurrent = currentGrade === grade;
        
        const btn = document.createElement('button');
        
        if (hasData) {
            btn.className = `p-4 rounded-2xl border text-sm font-black transition-all transform active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer focus:outline-none ${
                isCurrent 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-400'
            }`;
            btn.onclick = () => {
                changeAppGrade(grade);
                closeGradeModal();
            };
        } else {
            btn.className = 'p-4 rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 opacity-60 flex flex-col items-center justify-center gap-1 cursor-not-allowed pointer-events-none select-none';
            btn.disabled = true;
        }

        const countText = hasData ? `${hanjaNewData[grade].length}자` : '준비중';
        
        btn.innerHTML = `
            <span class="text-base">${grade}</span>
            <span class="text-[10px] font-medium opacity-80">${countText}</span>
        `;
        container.appendChild(btn);
    });
}

function changeAppGrade(targetGrade) {
    if (isCardLock) {
        appLog('Error', '현재 마이크 가동 중이거나 채점 중에는 급수를 변경할 수 없습니다.');
        return;
    }

    currentGrade = targetGrade;
    localStorage.setItem('hanja_grade', targetGrade);

    loadGradeData(targetGrade);
    preRenderStaticTables();

    const titleEl = document.getElementById('header-grade-title');
    if (titleEl) {
        titleEl.innerText = `${targetGrade} 한자 마스터`;
    }

    switchTab(1);
    appLog('System', `학습 대상 급수가 [${targetGrade}]로 완전히 변경되었습니다.`);
}

// 💡 신규 추가: 환경 설정(감도 조절) 모달 제어 함수
function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    
    // 현재 임계값으로 슬라이더 UI 갱신
    const slider = document.getElementById('threshold-slider');
    const display = document.getElementById('threshold-value-display');
    if (slider && display) {
        const percentVal = Math.round(currentThreshold * 100);
        slider.value = percentVal;
        display.innerText = `${percentVal}%`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('scale-95');
        modal.querySelector('.transform').classList.add('scale-100');
    }, 10);
    appLog('System', '환경 설정 모달 오픈');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    const transformTarget = modal.querySelector('.transform');
    if (transformTarget) {
        transformTarget.classList.add('scale-95');
        transformTarget.classList.remove('scale-100');
    }
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    appLog('System', '환경 설정 모달 닫힘');
}

function updateThresholdFromSlider(value) {
    const thresholdVal = parseFloat(value) / 100;
    currentThreshold = thresholdVal;
    localStorage.setItem('hanja_threshold', thresholdVal);
    
    const display = document.getElementById('threshold-value-display');
    if (display) {
        display.innerText = `${value}%`;
    }
    appLog('System', `발음 정답 판정 기준 변경 ➡️ ${value}%`);
}

function handleTitleClick(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    titleClickCount++;
    clearTimeout(titleClickTimer);
    
    if (titleClickCount >= 5) {
        toggleDevConsole();
        titleClickCount = 0;
    } else {
        titleClickTimer = setTimeout(() => {
            titleClickCount = 0;
        }, 2500);
    }
}

function toggleDevConsole() {
    const consoleEl = document.getElementById('dev-console');
    if (!consoleEl) return;
    if (consoleEl.classList.contains('hidden')) {
        consoleEl.classList.remove('hidden');
        appLog('System', '디버그 콘솔 인스턴스가 활성화되었습니다.');
    } else {
        consoleEl.classList.add('hidden');
    }
}

function appLog(category, message) {
    const consoleBody = document.getElementById('dev-console-body');
    if (!consoleBody) return;

    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    const logLine = document.createElement('div');
    logLine.className = 'py-0.5 border-b border-slate-900/30 break-all text-[11px] leading-relaxed';
    
    let colorClass = 'text-emerald-400';
    if (category === 'Error') colorClass = 'text-rose-400';
    if (category === 'Success') colorClass = 'text-cyan-400';
    if (category === 'System') colorClass = 'text-amber-400';
    if (category === 'Speech') colorClass = 'text-fuchsia-400 font-bold';

    logLine.innerHTML = `<span class="text-slate-600">[${time}]</span> <span class="${colorClass}">[${category}]</span> ${message}`;
    consoleBody.appendChild(logLine);
    
    if (consoleBody.children.length > 50) {
        consoleBody.removeChild(consoleBody.firstChild);
    }
    consoleBody.scrollTop = consoleBody.scrollHeight;
}

window.onload = function() {
    appLog('System', `한자 마스터 학습 엔진 초기화 가동 (선택 급수: ${currentGrade}, 판정 기준: ${Math.round(currentThreshold * 100)}%)`);
    
    loadGradeData(currentGrade);

    const titleEl = document.getElementById('header-grade-title');
    if (titleEl) {
        titleEl.innerText = `${currentGrade} 한자 마스터`;
    }

    preRenderStaticTables();
    activeFavoriteIndices = [...bookmarks];
    
    speechEngine.init();
    
    switchTab(1);

    const mainContainer = document.getElementById('table-view-container');
    if (!mainContainer) return;

    mainContainer.addEventListener('click', function(event) {
        const bookmarkBtn = event.target.closest('[data-action="toggle-bookmark"]');
        if (bookmarkBtn) {
            event.stopPropagation();
            event.preventDefault();
            const index = parseInt(bookmarkBtn.getAttribute('data-index'), 10);
            toggleBookmark(index);
            return;
        }

        const hunCell = event.target.closest('[data-action="click-hun"]');
        if (hunCell) {
            event.stopPropagation();
            const index = parseInt(hunCell.getAttribute('data-index'), 10);
            handleHunClick(hunCell, index);
            return;
        }

        const hanjaCell = event.target.closest('[data-action="open-modal"]');
        if (hanjaCell) {
            event.stopPropagation();
            const index = parseInt(hanjaCell.getAttribute('data-index'), 10);
            
            if (isQuizMode) {
                handleToggleVoiceQuiz(index);
                return; 
            }
            openModal(index);
            return;
        }
    });

    document.addEventListener('click', function(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        const action = actionBtn.getAttribute('data-action');
        
        if (action === 'toggle-quiz') {
            isQuizMode = !isQuizMode;
            if (isQuizMode) {
                document.body.classList.add('quiz-mode');
                actionBtn.className = "btn-quiz-toggle theme-emerald";
                actionBtn.innerHTML = `<i class="fa-solid fa-book"></i> <span>도전 그만하기</span>`;
                appLog('System', '말하기 도전 모드 가동 (음성 학습 준비 완료)');
            } else {
                document.body.classList.remove('quiz-mode');
                actionBtn.className = "btn-quiz-toggle theme-yellow";
                actionBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> <span>말하기 도전</span>`;
                appLog('System', '말하기 도전 해제 ➡️ 일반 열람 대기 상태');
                
                solvedHanjas.clear();
                isCardLock = false; 

                speechEngine.abort();
                resetSingleTabDOM(activeTab);

                tabsNeedReset.clear();
                for (let i = 1; i <= totalPages; i++) {
                    if (i !== activeTab) tabsNeedReset.add(i);
                }
                if (activeTab !== 13) tabsNeedReset.add(13);

                processingTargetIndex = null;
                evaluationTargetIndex = null;
                switchTab(activeTab);
            }
        } else if (action === 'close-modal') {
            closeModal();
        } else if (action === 'modal-tts') {
            audioEngine.speak(currentVoiceHun); 
        }
    });

    document.getElementById('detail-modal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    
    document.getElementById('grade-modal').addEventListener('click', function(e) {
        if (e.target === this) closeGradeModal();
    });

    // 💡 신규 추가: 설정 모달 바깥 영역 클릭 대응
    document.getElementById('settings-modal').addEventListener('click', function(e) {
        if (e.target === this) closeSettingsModal();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeGradeModal();
            closeSettingsModal();
        }
    });

    document.getElementById('console-clear-btn').addEventListener('click', () => {
        const consoleBody = document.getElementById('dev-console-body');
        if (consoleBody) consoleBody.innerHTML = '';
    });
    document.getElementById('console-close-btn').addEventListener('click', () => {
        document.getElementById('dev-console').classList.add('hidden');
    });
};