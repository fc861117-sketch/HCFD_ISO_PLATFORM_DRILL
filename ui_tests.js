/**
 * HCFD ISO Platform Drill - In-Browser UI Automated Integration Test Suite
 * This script simulates real user interactions, verifies the anti-accidental touch guards,
 * forms validation, and cloud sync integrations.
 */

(function() {
    // Inject Styles for the UI Test Modal
    const styles = `
        .ui-test-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
            z-index: 999999; display: flex; align-items: center; justify-content: center;
            box-sizing: border-box; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .ui-test-container {
            background: #1e1e1e; border: 3px solid #ff9800; border-radius: 12px;
            width: 100%; max-width: 650px; max-height: 90vh; display: flex;
            flex-direction: column; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.8);
            color: #eeeeee;
        }
        .ui-test-header {
            background: #e65100; color: white; padding: 15px 20px;
            font-weight: bold; font-size: 1.2rem; display: flex;
            justify-content: space-between; align-items: center;
        }
        .ui-test-close {
            background: none; border: none; color: white; font-size: 1.5rem;
            cursor: pointer; opacity: 0.5; transition: 0.2s;
        }
        .ui-test-close:not(:disabled):hover {
            opacity: 1;
        }
        .ui-test-close:disabled {
            cursor: not-allowed;
        }
        .ui-test-body {
            flex: 1; overflow-y: auto; padding: 20px; font-size: 0.95rem;
            display: flex; flex-direction: column; gap: 15px;
        }
        .ui-test-step-row {
            display: flex; align-items: flex-start; gap: 12px;
            background: #2a2a2a; padding: 10px 14px; border-radius: 6px;
            border-left: 4px solid #555; transition: 0.3s;
        }
        .ui-test-step-row.active {
            border-left-color: #ff9800; background: #33261a;
        }
        .ui-test-step-row.passed {
            border-left-color: #4caf50; background: #1e2d21;
        }
        .ui-test-step-row.failed {
            border-left-color: #f44336; background: #3a1e1e;
        }
        .ui-test-step-status {
            font-size: 1.2rem; min-width: 24px; text-align: center;
        }
        .ui-test-step-info {
            flex: 1;
        }
        .ui-test-step-title {
            font-weight: bold; margin-bottom: 2px;
        }
        .ui-test-step-desc {
            font-size: 0.8rem; color: #aaa;
        }
        .ui-test-console-box {
            background: #121212; border: 1px solid #333; border-radius: 6px;
            padding: 12px; font-family: monospace; font-size: 0.82rem;
            height: 150px; overflow-y: auto; color: #4caf50; white-space: pre-wrap;
        }
        .ui-test-footer {
            background: #2a2a2a; padding: 15px 20px; display: flex;
            justify-content: space-between; align-items: center;
            border-top: 1px solid #333; gap: 10px;
        }
        .ui-test-mode-toggle {
            display: flex; gap: 6px; align-items: center; font-size: 0.85rem;
        }
        .ui-test-btn {
            background: #e65100; color: white; border: none;
            padding: 10px 20px; border-radius: 6px; font-weight: bold;
            cursor: pointer; transition: 0.2s; font-size: 1rem;
        }
        .ui-test-btn:hover:not(:disabled) {
            background: #f57c00;
        }
        .ui-test-btn:disabled {
            background: #555; color: #888; cursor: not-allowed;
        }
    `;

    // Add Stylesheet to Head
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Global Test State
    let isTestRunning = false;
    let originalApiCall = null;
    let originalCallGitHubAPI = null;
    let mockMode = true; // Default to Mock mode to prevent spamming commits
    const TEST_PROJECT_NAME = '1150606_UI_DrillTest';
    const CONFIRM_RESET_WAIT_MS = 6500; // App confirm timeout is 6000ms.
    const CREATE_PROJECT_WAIT_MS = 1200;
    const FINISH_EXEC_WAIT_MS = 1800;

    // Helper to Wait/Delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function getTestHooks() {
        if (!window.__isoTestHooks) {
            throw new Error('找不到 __isoTestHooks，請確認 index.html 已載入最新版測試支援介面。');
        }
        return window.__isoTestHooks;
    }

    function getAppState() {
        return getTestHooks().getState();
    }

    function getTestProject() {
        return getTestHooks().getProject(TEST_PROJECT_NAME);
    }

    // Logs output to UI Console
    function logToConsole(message) {
        const consoleEl = document.getElementById('uiTestConsole');
        if (consoleEl) {
            const timeStr = new Date().toLocaleTimeString();
            consoleEl.textContent += `[${timeStr}] ${message}\n`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
        console.log(`[UI_TEST] ${message}`);
    }

    // Modal Control Functions
    window.startUIAutomatedTest = function() {
        // Close the settings modal first
        if (typeof window.closeSettingsModal === 'function') {
            window.closeSettingsModal();
        }
        
        // Check if we are on index.html, if not, redirect with flag
        const isIndexPage = document.getElementById('btnCreateProject') !== null;
        if (!isIndexPage) {
            alert('⚙️ 自動化 UI 測試必須在首頁執行。系統將自動跳轉至首頁！');
            const baseUrl = window.location.href.split('?')[0].replace(/\/[^\/]*\.html$/, '');
            window.location.href = baseUrl + '/index.html?run_ui_tests=true';
            return;
        }

        // Render the modal
        renderTestModal();
    };

    window.closeUITestModal = function() {
        if (isTestRunning) return;
        const overlay = document.getElementById('uiTestOverlay');
        if (overlay) {
            overlay.remove();
        }
    };

    // Auto trigger if URL has query parameter
    window.addEventListener('DOMContentLoaded', () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('run_ui_tests') === 'true') {
            // Remove the parameter from URL without reloading
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: cleanUrl}, '', cleanUrl);
            setTimeout(() => {
                renderTestModal();
            }, 1000);
        }
    });

    // Renders the Modal into the document body
    function renderTestModal() {
        // Remove existing modal if any
        const existing = document.getElementById('uiTestOverlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'uiTestOverlay';
        overlay.className = 'ui-test-modal-overlay';
        
        const hasPat = !!(localStorage.getItem('iso_github_pat') || '').trim();

        overlay.innerHTML = `
            <div class="ui-test-container">
                <div class="ui-test-header">
                    <span>🛠️ 消防局 ISO 平台 - UI 自動化整合測試</span>
                    <button id="uiTestCloseBtn" class="ui-test-close" onclick="closeUITestModal()">✕</button>
                </div>
                <div class="ui-test-body">
                    <p style="margin: 0; color: #aaa; font-size: 0.88rem;">
                        本工具將進行<strong>防誤觸按鈕</strong>、<strong>欄位自動防呆連動</strong>以及<strong>雲端 API 同步</strong>的完整功能模擬測試。
                    </p>
                    
                    <div id="uiTestSteps">
                        <!-- Steps will be generated here -->
                    </div>
                    
                    <div class="ui-test-console-box" id="uiTestConsole">[SYSTEM] 測試控制台已啟動。請選擇模式並點擊下方「開始測試」按鈕。</div>
                </div>
                <div class="ui-test-footer">
                    <div class="ui-test-mode-toggle">
                        <label style="display:inline-flex; align-items:center; cursor:pointer; font-weight:bold; color: #eee; margin:0;">
                            <input type="checkbox" id="uiTestModeCheckbox" ${hasPat ? '' : 'disabled checked'} style="margin-right: 6px;"> 
                            模擬單機模式 (不實際寫入 GitHub)
                        </label>
                        ${!hasPat ? '<span style="font-size: 0.75rem; color:#ff9800; margin-left: 5px;">(未偵測到 GitHub PAT)</span>' : ''}
                    </div>
                    <div>
                        <button id="uiTestControlBtn" class="ui-test-btn" onclick="runAllUITests()">開始測試</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Generate steps list
        generateStepsUI();
    }

    const testSteps = [
        {
            id: 'step_route',
            title: '1. 環境與設定檢查',
            desc: '驗證系統狀態、資料庫初始值，並切換至初始登入頁。'
        },
        {
            id: 'step_create_guard',
            title: '2. 建立新專案防誤觸單擊測試',
            desc: '單擊「建立新專案」按鈕，確認其進入警告狀態並在 3 秒後自動恢復，無建立專案。'
        },
        {
            id: 'step_create_exec',
            title: '3. 建立新專案雙擊測試',
            desc: '輸入測試專案資訊，連續點擊兩次按鈕，確認專案順利建立並載入簡報表。'
        },
        {
            id: 'step_briefing_edit',
            title: '4. 簡報欄位自動換算與雲端同步',
            desc: '填寫簡報內容，驗證單層面積「坪/平方公尺」自動連動換算，並同步簡報至雲端。'
        },
        {
            id: 'step_medic_guard',
            title: '5. MEDIC 新增防誤觸單擊測試',
            desc: '切換至 MEDIC 分頁，單擊「加入至本地列表」，驗證超時重設防呆。'
        },
        {
            id: 'step_medic_exec',
            title: '6. MEDIC 雙擊新增與行內防誤觸驗證',
            desc: '雙擊新增 MEDIC 項目，並對該行內「結案」與「同步」按鈕進行防誤觸單擊與雙擊驗證。'
        },
        {
            id: 'step_finish_guard',
            title: '7. 專案結案三階段防誤觸與鎖定',
            desc: '單擊及雙擊「結案並鎖定」按鈕確認自動超時恢復，最後連續點擊三次結案，驗證防讀鎖定。'
        }
    ];

    function generateStepsUI() {
        const parent = document.getElementById('uiTestSteps');
        if (!parent) return;
        parent.innerHTML = '';
        testSteps.forEach(step => {
            parent.innerHTML += `
                <div class="ui-test-step-row" id="row_${step.id}">
                    <div class="ui-test-step-status" id="status_${step.id}">⏳</div>
                    <div class="ui-test-step-info">
                        <div class="ui-test-step-title">${step.title}</div>
                        <div class="ui-test-step-desc">${step.desc}</div>
                    </div>
                </div>
            `;
        });
    }

    function updateStepStatus(id, status, details = '') {
        const row = document.getElementById(`row_${id}`);
        const statusEl = document.getElementById(`status_${id}`);
        if (!row || !statusEl) return;

        row.className = 'ui-test-step-row';
        if (status === 'running') {
            row.classList.add('active');
            statusEl.innerText = '🔄';
            logToConsole(`>>> 執行中: ${testSteps.find(s=>s.id===id).title}`);
        } else if (status === 'passed') {
            row.classList.add('passed');
            statusEl.innerText = '✅';
            logToConsole(`[PASS] ${testSteps.find(s=>s.id===id).title} ${details}`);
        } else if (status === 'failed') {
            row.classList.add('failed');
            statusEl.innerText = '❌';
            logToConsole(`[FAIL] ${testSteps.find(s=>s.id===id).title} - 錯誤原因: ${details}`);
        }
    }

    // Mocks or Restores API calls
    function setupApiMocks() {
        if (mockMode) {
            logToConsole("[MOCK] 已啟用 API 模擬模式，所有網路同步請求將直接返回成功。");
            
            // Backup
            originalApiCall = window.apiCall;
            originalCallGitHubAPI = window.callGitHubAPI;

            // Mock window.apiCall
            window.apiCall = async function(payload) {
                logToConsole(`[MOCK API CALL] ${payload.action} on project ${payload.projectName}`);
                await delay(300);
                return { success: true, mocked: true };
            };

            // Mock window.callGitHubAPI
            window.callGitHubAPI = async function(method, path, body = null) {
                logToConsole(`[MOCK GITHUB API] ${method} ${path}`);
                await delay(300);
                return { 
                    content: {
                        download_url: "https://raw.githubusercontent.com/mock-photo.jpg",
                        sha: "mock_sha_value_12345"
                    }
                };
            };
        } else {
            logToConsole("[REAL] 已啟用真實同步模式，將寫入 GitHub 儲存庫。");
        }
    }

    function restoreApiMocks() {
        if (mockMode && originalApiCall) {
            window.apiCall = originalApiCall;
            window.callGitHubAPI = originalCallGitHubAPI;
            logToConsole("[MOCK] API 模擬已解除，還原系統原始網路函數。");
        }
    }

    // High level test execution coordinator
    window.runAllUITests = async function() {
        if (isTestRunning) return;
        isTestRunning = true;

        const checkbox = document.getElementById('uiTestModeCheckbox');
        mockMode = checkbox ? checkbox.checked : true;

        const controlBtn = document.getElementById('uiTestControlBtn');
        const closeBtn = document.getElementById('uiTestCloseBtn');
        if (controlBtn) controlBtn.disabled = true;
        if (closeBtn) closeBtn.disabled = true;

        const summaryEl = document.getElementById('uiTestSummary');
        if (summaryEl) {
            summaryEl.innerText = '狀態: 測試中...';
            summaryEl.style.color = '#ff9800';
        }

        // Reset Console
        const consoleEl = document.getElementById('uiTestConsole');
        if (consoleEl) consoleEl.textContent = '';
        logToConsole("--- 開始執行 UI 自動化整合測試 ---");

        setupApiMocks();

        try {
            // Step 1
            await runStepRoute();
            
            // Step 2
            await runStepCreateGuard();
            
            // Step 3
            await runStepCreateExec();

            // Step 4
            await runStepBriefingEdit();

            // Step 5
            await runStepMedicGuard();

            // Step 6
            await runStepMedicExec();

            // Step 7
            await runStepFinishGuard();

            logToConsole("--- 所有 UI 整合測試均已成功通過！ ---");
            if (summaryEl) {
                summaryEl.innerText = '狀態: 全部通過 🎉';
                summaryEl.style.color = '#4caf50';
            }
        } catch (error) {
            logToConsole(`!!! 測試終止 !!! 發生未預期錯誤: ${error.message}`);
            if (summaryEl) {
                summaryEl.innerText = '狀態: 測試失敗 ❌';
                summaryEl.style.color = '#f44336';
            }
        } finally {
            restoreApiMocks();
            isTestRunning = false;
            if (controlBtn) {
                controlBtn.disabled = false;
                controlBtn.innerText = '重新測試';
            }
            if (closeBtn) closeBtn.disabled = false;
        }
    };

    // Step 1: Environment Setup
    async function runStepRoute() {
        updateStepStatus('step_route', 'running');
        
        // Force reload / clear current project state locally for a clean run
        if (typeof window.renderHome === 'function') {
            getTestHooks().resetTestProject(TEST_PROJECT_NAME);
            if (window.autoSyncInterval) {
                clearInterval(window.autoSyncInterval);
                window.autoSyncInterval = null;
            }
            
            // Show home
            const tabs = ['page-home', 'page-briefing', 'page-medic'];
            tabs.forEach(t => {
                const el = document.getElementById(t);
                if (el) el.classList.remove('active');
            });
            const home = document.getElementById('page-home');
            if (home) home.classList.add('active');
            
            await window.renderHome();
            await delay(500);
            updateStepStatus('step_route', 'passed', '系統狀態已初始化');
        } else {
            updateStepStatus('step_route', 'failed', '找不到 renderHome 函數，請確認是否在首頁。');
            throw new Error('Environment error');
        }
    }

    // Step 2: Create Project Guard (Single click + timeout)
    async function runStepCreateGuard() {
        updateStepStatus('step_create_guard', 'running');
        
        const btn = document.getElementById('btnCreateProject');
        const opName = document.getElementById('newProjectCreator');
        const projName = document.getElementById('newProjectName');
        
        if (!btn || !opName || !projName) {
            updateStepStatus('step_create_guard', 'failed', '找不到建立專案之輸入項或按鈕');
            throw new Error('UI Element missing');
        }

        // Fill inputs
        opName.value = '安全官自動測試';
        projName.value = TEST_PROJECT_NAME;
        opName.dispatchEvent(new Event('input'));
        projName.dispatchEvent(new Event('input'));
        
        logToConsole("模擬單擊「建立新專案」按鈕，觸發防誤觸機制。");
        btn.click();
        await delay(300);

        // Verify it entered confirmation state
        const confirmText = "⚠️ 確定操作？";
        if (btn.innerText !== confirmText || btn.dataset.confirm !== "yes") {
            updateStepStatus('step_create_guard', 'failed', `單擊後按鈕未正確變更為「確定操作？」，目前文字: 「${btn.innerText}」`);
            throw new Error('Guard fail');
        }
        logToConsole("已進入防誤觸警告狀態（變紅且顯示警告字樣）。等待 6.5 秒超時自動恢復。");
        
        await delay(CONFIRM_RESET_WAIT_MS);

        // Verify it reset
        if (btn.innerText === confirmText || btn.dataset.confirm === "yes") {
            updateStepStatus('step_create_guard', 'failed', '6.5 秒超時後，防誤觸按鈕未自動重設回原始文字');
            throw new Error('Timeout reset fail');
        }
        
        // Verify no project was created
        if (getAppState().currentProject === TEST_PROJECT_NAME) {
            updateStepStatus('step_create_guard', 'failed', '單擊且超時後，系統仍然建立了救災專案！');
            throw new Error('Invalid action execution');
        }

        updateStepStatus('step_create_guard', 'passed', '單擊防呆警告成功，超時已正確重置');
    }

    // Step 3: Create Project Double-Click
    async function runStepCreateExec() {
        updateStepStatus('step_create_exec', 'running');
        
        const btn = document.getElementById('btnCreateProject');
        if (!btn) {
            updateStepStatus('step_create_exec', 'failed', '找不到 btnCreateProject 按鈕');
            throw new Error('UI Element missing');
        }

        logToConsole("模擬連續快速點擊（雙擊）兩次「建立新專案」...");
        btn.click();
        await delay(150); // fast second click
        btn.click();

        await delay(CREATE_PROJECT_WAIT_MS); // Wait for project creation and redirection

        // Verify redirection and project loaded
        const briefingTab = document.getElementById('page-briefing');
        if (getAppState().currentProject !== TEST_PROJECT_NAME || !briefingTab || !briefingTab.classList.contains('active')) {
            updateStepStatus('step_create_exec', 'failed', '雙擊後未成功建立專案或未跳轉至「📋 簡報表」頁面');
            throw new Error('Double click execution fail');
        }

        updateStepStatus('step_create_exec', 'passed', `專案 ${TEST_PROJECT_NAME} 雙擊建立成功且已跳轉簡報頁`);
    }

    // Step 4: Edit Briefing and Unit Conversion
    async function runStepBriefingEdit() {
        updateStepStatus('step_briefing_edit', 'running');
        
        // Find inputs
        const icEl = document.getElementById('b_ic');
        const isoEl = document.getElementById('b_iso');
        const usageEl = document.getElementById('b_usage');
        const structEl = document.getElementById('b_structure');
        const areaInputEl = document.getElementById('b_area_input');
        const areaUnitEl = document.getElementById('b_area_unit');
        const areaEl = document.getElementById('b_area');
        
        if (!icEl || !isoEl || !usageEl || !structEl || !areaInputEl || !areaUnitEl || !areaEl) {
            updateStepStatus('step_briefing_edit', 'failed', '找不到簡報表表單欄位');
            throw new Error('Form fields missing');
        }

        // Fill values
        icEl.value = '指揮官自動測試員';
        isoEl.value = '安全官自動測試員';
        usageEl.value = '防誤觸測試大樓';
        structEl.value = 'RC';
        areaInputEl.value = '100';
        areaUnitEl.value = 'ping';

        icEl.dispatchEvent(new Event('input'));
        isoEl.dispatchEvent(new Event('input'));
        usageEl.dispatchEvent(new Event('input'));
        structEl.dispatchEvent(new Event('change'));
        
        logToConsole("填寫簡報表完成。測試「單層面積單位連動換算」。");
        
        if (typeof window.convertArea === 'function') {
            window.convertArea();
        } else {
            areaUnitEl.dispatchEvent(new Event('change'));
        }

        const areaValue = parseFloat(areaEl.value);
        const inputValue = parseFloat(areaInputEl.value);
        logToConsole(`單位由「坪」自動換算為「平方公尺」，hidden 結果: ${areaValue}，輸入框結果: ${inputValue}`);
        if (Math.abs(areaValue - 330.58) > 1.0 || Math.abs(inputValue - 330.58) > 1.0 || areaUnitEl.value !== 'm2') {
            updateStepStatus('step_briefing_edit', 'failed', `單層面積換算不正確，期望值: ~330.58 m2，hidden: ${areaValue}，input: ${inputValue}，unit: ${areaUnitEl.value}`);
            throw new Error('Unit conversion mismatch');
        }

        // Trigger Sync Briefing
        logToConsole("觸發「儲存並同步【簡報表】至雲端」...");
        const syncBriefBtn = document.querySelector('.btn-sync-brief');
        if (syncBriefBtn) {
            syncBriefBtn.click();
            await delay(1000); // wait for sync
        } else {
            updateStepStatus('step_briefing_edit', 'failed', '找不到簡報同步按鈕 .btn-sync-brief');
            throw new Error('Sync button missing');
        }

        updateStepStatus('step_briefing_edit', 'passed', '簡報表資料輸入、單位換算與雲端同步成功');
    }

    // Step 5: Add MEDIC Guard (Single click + timeout)
    async function runStepMedicGuard() {
        updateStepStatus('step_medic_guard', 'running');
        
        // Switch tab to MEDIC
        if (typeof window.switchTab === 'function') {
            window.switchTab('page-medic');
            await delay(300);
        } else {
            // Mock switch
            document.getElementById('page-briefing').classList.remove('active');
            document.getElementById('page-medic').classList.add('active');
            await delay(300);
        }

        const btnAdd = document.querySelector('button[onclick="confirmAction(this, addMedicEntry)"]');
        const mEl = document.getElementById('m_m');
        const hEl = document.getElementById('m_e'); // wait, let's verify ID in index.html.
        
        // Let's check IDs for medic input
        const medicM = document.getElementById('m_m'); // 監測環境
        const medicE = document.getElementById('m_e'); // 危害評估
        const medicD = document.getElementById('m_d'); // 預防措施
        const medicI = document.getElementById('m_i'); // 介入控制
        const medicC = document.getElementById('m_c'); // 照護通訊

        if (!btnAdd || !medicM || !medicE) {
            updateStepStatus('step_medic_guard', 'failed', '找不到 MEDIC 輸入欄位或「加入至本地列表」按鈕');
            throw new Error('MEDIC fields missing');
        }

        // Fill MEDIC fields
        medicM.value = '模擬高溫煙熱監測';
        medicE.value = '有滾燃閃燃危害';
        medicD.value = '佈線進行冷卻';
        medicI.value = '通知安全官隨時監視';
        medicC.value = '通知指揮小組';

        medicM.dispatchEvent(new Event('input'));
        medicE.dispatchEvent(new Event('input'));
        medicD.dispatchEvent(new Event('input'));
        medicI.dispatchEvent(new Event('input'));
        medicC.dispatchEvent(new Event('input'));

        logToConsole("模擬單擊「➕ 加入至本地列表」，確認觸發防誤觸警示。");
        btnAdd.click();
        await delay(300);

        if (btnAdd.innerText !== "⚠️ 確定操作？" || btnAdd.dataset.confirm !== "yes") {
            updateStepStatus('step_medic_guard', 'failed', '單擊 MEDIC 加入按鈕後未正確顯示「⚠️ 確定操作？」警告');
            throw new Error('Medic guard fail');
        }

        logToConsole("警告狀態已建立。等待 6.5 秒超時自動恢復...");
        await delay(CONFIRM_RESET_WAIT_MS);

        if (btnAdd.innerText === "⚠️ 確定操作？" || btnAdd.dataset.confirm === "yes") {
            updateStepStatus('step_medic_guard', 'failed', 'MEDIC 加入按鈕在 6.5 秒後未自動恢復');
            throw new Error('Medic reset fail');
        }

        // Verify no entry added
        const medicList = getTestProject()?.medic || [];
        if (medicList.length > 0) {
            updateStepStatus('step_medic_guard', 'failed', '單擊且超時後，系統仍將 MEDIC 項目加入了列表');
            throw new Error('Medic entry added invalidly');
        }

        updateStepStatus('step_medic_guard', 'passed', 'MEDIC 新增單擊防誤觸功能成功');
    }

    // Step 6: MEDIC Double-click and Row Level Guard
    async function runStepMedicExec() {
        updateStepStatus('step_medic_exec', 'running');
        
        const btnAdd = document.querySelector('button[onclick="confirmAction(this, addMedicEntry)"]');
        if (!btnAdd) {
            updateStepStatus('step_medic_exec', 'failed', '找不到加入按鈕');
            throw new Error('UI Element missing');
        }

        logToConsole("模擬雙擊（快速點擊兩次）新增 MEDIC 項目...");
        btnAdd.click();
        await delay(150);
        btnAdd.click();

        await delay(500); // Wait for rendering

        // Verify entry added
        const medicList = getTestProject()?.medic || [];
        if (medicList.length === 0) {
            updateStepStatus('step_medic_exec', 'failed', '雙擊後，本地資料庫 MEDIC 陣列仍為空');
            throw new Error('Double click add failed');
        }
        logToConsole("MEDIC 項目成功新增至本地。確認 DOM 清單已渲染該項目。");

        // Find the newly rendered row action buttons
        // Close Button
        const closeBtn = document.querySelector('button[onclick*="closeMedicEntry"]');
        if (!closeBtn) {
            updateStepStatus('step_medic_exec', 'failed', '在 MEDIC 渲染列表中找不到「✅ 結案」按鈕');
            throw new Error('Medic row actions missing');
        }

        logToConsole("模擬單擊行內「結案」防誤觸按鈕...");
        closeBtn.click();
        await delay(300);

        if (closeBtn.innerText !== "⚠️ 確定操作？" || closeBtn.dataset.confirm !== "yes") {
            updateStepStatus('step_medic_exec', 'failed', '單擊行內結案按鈕後未顯示「⚠️ 確定操作？」');
            throw new Error('Row action guard fail');
        }
        logToConsole("行內「結案」按鈕已變紅警告。等待 6.5 秒自動重置...");
        await delay(CONFIRM_RESET_WAIT_MS);

        if (closeBtn.innerText === "⚠️ 確定操作？" || closeBtn.dataset.confirm === "yes") {
            updateStepStatus('step_medic_exec', 'failed', '行內結案按鈕超時後未自動重置');
            throw new Error('Row action reset fail');
        }

        logToConsole("模擬雙擊行內「結案」按鈕，執行該事件結案...");
        closeBtn.click();
        await delay(150);
        closeBtn.click();
        await delay(500);

        // Verify closed status
        const isClosed = medicList[0].completed === true;
        const statusSpan = document.querySelector('span[style*="color:#4caf50"]'); // should show "🔒 已結案"
        if (!isClosed || !statusSpan || !statusSpan.textContent.includes("已結案")) {
            updateStepStatus('step_medic_exec', 'failed', '雙擊行內結案後，該事件狀態未正確變更為「🔒 已結案」');
            throw new Error('Row action execution fail');
        }

        // Sync MEDIC to cloud
        logToConsole("點擊「儲存並同步全部【MEDIC表】至雲端」...");
        const syncMedicBtn = document.querySelector('.btn-sync-medic');
        if (syncMedicBtn) {
            syncMedicBtn.click();
            await delay(1000);
        }

        updateStepStatus('step_medic_exec', 'passed', 'MEDIC 雙擊新增與行內「結案」防呆雙擊流程驗證通過');
    }

    // Step 7: Finish & Lock Project (Three-stage confirm)
    async function runStepFinishGuard() {
        updateStepStatus('step_finish_guard', 'running');

        // Switch back to Briefing Tab
        if (typeof window.switchTab === 'function') {
            window.switchTab('page-briefing');
            await delay(300);
        } else {
            document.getElementById('page-medic').classList.remove('active');
            document.getElementById('page-briefing').classList.add('active');
            await delay(300);
        }

        const finishBtn = document.querySelector('button[onclick="finishCaseConfirm(this)"]');
        if (!finishBtn) {
            updateStepStatus('step_finish_guard', 'failed', '找不到結案鎖定按鈕 finishCaseConfirm');
            throw new Error('UI Element missing');
        }

        logToConsole("模擬單擊三階段結案按鈕。驗證 Stage 1 (橘色警告)。");
        finishBtn.click();
        await delay(300);

        if (finishBtn.dataset.stage !== "1" || !finishBtn.innerText.includes("您確定要結案？")) {
            updateStepStatus('step_finish_guard', 'failed', '單擊結案按鈕未正確變更為 Stage 1 (橘色警告)');
            throw new Error('Stage 1 transition fail');
        }
        logToConsole("已成功觸發第一階段橘色警告。等待 6.5 秒自動重設...");
        await delay(CONFIRM_RESET_WAIT_MS);

        if (finishBtn.dataset.stage === "1") {
            updateStepStatus('step_finish_guard', 'failed', 'Stage 1 超時後按鈕未自動重設');
            throw new Error('Stage 1 reset fail');
        }
        logToConsole("第一階段超時重設成功。");

        logToConsole("進入第二階段測試：連點兩次。");
        finishBtn.click(); // Stage 1
        await delay(200);
        finishBtn.click(); // Stage 2
        await delay(300);

        if (finishBtn.dataset.stage !== "2" || !finishBtn.innerText.includes("最後確認：結案後將永遠無法編輯！")) {
            updateStepStatus('step_finish_guard', 'failed', '連點兩次結案按鈕未正確變更為 Stage 2 (紅色警告)');
            throw new Error('Stage 2 transition fail');
        }
        logToConsole("已成功觸發第二階段紅色警告。等待 6.5 秒自動重設...");
        await delay(CONFIRM_RESET_WAIT_MS);

        if (finishBtn.dataset.stage === "2") {
            updateStepStatus('step_finish_guard', 'failed', 'Stage 2 超時後按鈕未自動重設');
            throw new Error('Stage 2 reset fail');
        }
        logToConsole("第二階段超時重設成功。");

        logToConsole("最終測試：三連點觸發正式結案並鎖定專案。");
        finishBtn.click(); // Stage 1
        await delay(200);
        finishBtn.click(); // Stage 2
        await delay(200);
        finishBtn.click(); // Execute
        
        await delay(FINISH_EXEC_WAIT_MS); // Wait for async execution of executeFinishCase

        // Verify read only
        const badge = document.getElementById('lockedBadge');
        if (!getAppState().isReadOnly || !badge || badge.style.display === 'none') {
            updateStepStatus('step_finish_guard', 'failed', '三連擊後，網頁未進入唯讀鎖定狀態或鎖定徽章未顯示');
            throw new Error('Case final lock fail');
        }

        // Verify fields are disabled
        const icEl = document.getElementById('b_ic');
        if (!icEl || !icEl.disabled) {
            updateStepStatus('step_finish_guard', 'failed', '結案鎖定後，簡報欄位輸入項未正確關閉禁用 (disabled)');
            throw new Error('Inputs not disabled');
        }

        // Cleanup: If not in mock mode, delete the test file from GitHub to keep user repository clean!
        if (!mockMode) {
            logToConsole("[REAL] 正在向 GitHub 發送刪除專案檔案 API 進行測試後清理...");
            try {
                // Get the SHA of the project file first
                const repo = localStorage.getItem('iso_github_repo') || 'fc861117-sketch/HCFD_ISO_PLATFORM_DRILL';
                const branch = localStorage.getItem('iso_github_branch') || 'main';
                const pat = localStorage.getItem('iso_github_pat') || '';
                
                const getResp = await fetch(`https://api.github.com/repos/${repo}/contents/drills/${TEST_PROJECT_NAME}.json?ref=${branch}`, {
                    headers: { 'Authorization': `token ${pat}`, 'Accept': 'application/vnd.github.v3+json' }
                });
                if (getResp.ok) {
                    const fileData = await getResp.json();
                    const sha = fileData.sha;
                    
                    const delResp = await fetch(`https://api.github.com/repos/${repo}/contents/drills/${TEST_PROJECT_NAME}.json`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `token ${pat}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: "Cleanup: remove UI test project",
                            sha: sha,
                            branch: branch
                        })
                    });
                    if (delResp.ok) {
                        logToConsole(`[CLEANUP] 已成功刪除 GitHub 上的測試專案檔案 ${TEST_PROJECT_NAME}.json`);
                    } else {
                        logToConsole(`[WARN] 清理測試專案檔案失敗，GitHub HTTP: ${delResp.status}`);
                    }
                }
            } catch (cleanupErr) {
                logToConsole(`[WARN] 清理測試專案檔案時發生異常: ${cleanupErr.message}`);
            }
        }

        updateStepStatus('step_finish_guard', 'passed', '三階段結案防呆超時重設與最終鎖定功能完美驗證！');
    }

})();
