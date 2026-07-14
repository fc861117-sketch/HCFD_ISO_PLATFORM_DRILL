# 🛡️ HCFD ISO Platform (事故安全官作業平台) - 演練專用版

> ⚠️ **【重要聲明】本專案為「訓練演練專用版本 (Drill Version)」，所有資料與功能僅供教育訓練與內部模擬測試使用，並非正式上線版本，請勿直接應用於真實救災現場。**

[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-success.svg)](https://fc861117-sketch.github.io/HCFD_ISO_PLATFORM_DRILL/)
[![HTML5](https://img.shields.io/badge/Tech-HTML5-orange.svg)]()
[![Jekyll](https://img.shields.io/badge/Jekyll-Page%20Builder-blue.svg)]()

## 📖 專案簡介 (About)

**HCFD 事故安全官作業平台 (Incident Safety Officer Platform)** 是一個專為消防與救災現場「事故安全官 (ISO)」與「指揮官 (IC)」開發的輔助決策系統。

本平台在保留原始精美版面美學與核心邏輯的前提下，針對系統安全性、瀏覽器相容性、現場實用 UX 及資料持久化進行了全面性的調校與 Bug 修復，確保安全官在分秒必爭的救災現場中，能順暢、安全、無礙地使用所有決策輔助功能。

🔗 **[點此訪問平台網站 (Live Demo)](https://fc861117-sketch.github.io/HCFD_ISO_PLATFORM_DRILL/)**

---

## ✨ 核心功能模組 (Core Features)

本平台整合了以下四大核心作業模組，協助安全官於災害現場進行全方位監控：

1. **☣️ Hazmat (化災圖資檢索)**：提供常用化學物質與毒災之處置指引、警戒距離及 GHS 危害分類查詢。
2. **📋 ISO Guide (安全官作業指南)**：提供現場安全官之標準作業檢核表，記錄管制、通訊及復原事項。
3. **🌦️ 環境氣候監控及 NOAA**：對接大氣氣象背景 API，即時運算現場熱危害指標與行動建議。
4. **📊 風險決策模型**：提供 SPE 風險評估得分、VTS 戰術決策建議及 5x5 風險矩陣。

---

## 🆕 2026-07-14 更新：簡報圈次紀錄與 MEDIC 多頁 PDF

- **簡報表圈次封存**
  - 新增「儲存為第 N 圈」按鈕，依序建立第 1、2、3 圈等紀錄。
  - 儲存前顯示確認提示；封存後內容不可修改，但仍可匯出圖片。
  - 完成封存後，自動清空「與指揮官確認事項」以下（包含）的欄位，方便開始下一輪作業。
- **圈次比較**
  - 在「與指揮官確認事項」上方新增圈次下拉選單。
  - 切換到先前圈次前，系統會先自動保存目前已輸入內容，避免比較時遺失資料。
- **MEDIC 紀錄匯出**
  - 匯出版面調整為「事故安全官評估紀錄表（MEDIC List）」六欄表格格式。
  - 匯出按鈕移至 MEDIC 事件列表上方。
  - 每 13 筆自動分頁，所有頁面整合為單一 PDF 檔案下載。
- **自動儲存修正**
  - 修正同步鎖定狀態，並確認 Drill 平台每 15 秒自動儲存功能正常運作。

---

## 🛠️ 修正與優化項目 (Changelog & Optimizations)

本平台進行了以下 **10 項核心優化與修正**，大幅提昇了現場使用的穩定性與防呆效果：

### 🔴 系統 Bug 與防呆修正
1. **Firefox 頁籤切換失效修正** (`Hazmat/index.html`)
   * **說明**：修正原先使用隱式全域 `event.target` 物件在 Firefox 下導致分頁切換無效的問題。改用標準 DOM 參數傳遞：`switchTab('tab-id', this)`，完全相容所有主流瀏覽器。
2. **GHS 分類空值防呆 (Crash Prevention)** (`Hazmat/index.html`)
   * **說明**：針對資料庫中部分 GHS 危害資料不齊全之化學品，加入 Optional Chaining 防呆 `(item.ghs?.[0] || '').split(',')`，避免前端 JavaScript 崩潰。
3. **Jekyll 專案路徑跳轉修正** (`_config.yml`)
   * **說明**：將 Jekyll 靜態建置設定中的 `baseurl` 修正為 `"/HCFD_ISO_PLATFORM_DRILL"`，解決部署在 GitHub Pages 子路徑時導覽選單跳轉至根網域而發生 404 錯誤的問題。
4. **HTML 未閉合標籤清理** (`環境氣候監控及NOAA/index.html`)
   * **說明**：補齊並閉合免責聲明區塊前未對稱的 `</div>` 標籤，防止不同解析度下排版跑版。

### 🟡 使用者體驗 (UX) 與實用性優化
5. **MEDIC 紀錄時間自動填入（保留手動修改）** (`index.html`)
   * **說明**：進入 MEDIC 事件紀錄分頁時，系統會自動在時間欄位填入當前本地時間，節省救災時重複輸入時間的程序；同時保留手動微調時間的彈性。
6. **ISO Guide 勾選欄位狀態持久化** (`ISO guide/index.html`)
   * **說明**：為 checklist 中所有 checkbox 補齊唯一 ID，並與 `localStorage` 儲存機制連動。無論是切換頁籤、頁面重新整理或裝置休眠，已核取的檢核狀態皆會完整保留。
7. **新增一鍵返回按鈕** (`ISO guide/index.html`)
   * **說明**：在指南頁首添加「← 返回主平台」的固定導航按鈕，優化頁面間的流暢切換。
8. **Android 羅盤感測器超時溫馨提示** (`index.html`)
   * **說明**：加入 5 秒超時計時器，若行動裝置磁力計未回應，會主動提示操作人員進行感測器校準或手動選擇風向，避免畫面無反應卡死。
9. **風險矩陣軸標籤標記** (`風險決策模型/index.html`)
   * **說明**：在 5x5 風險矩陣上方與左側動態渲染出機率軸 `P1~P5` 與嚴重度軸 `S1~S5`，方便閱讀矩陣座標。
10. **雲端專案名稱 XSS 弱點防範** (`index.html`)
    * **說明**：針對從雲端 API 獲取到的專案列表名稱進行 HTML 特殊字元轉義處理，阻斷潛在的 XSS 惡意指令碼注入。

---

## 🚀 本地測試與執行 (Usage)

本系統完全基於靜態網頁技術開發，支援跨平台即時開啟：

1. **直接訪問線上 Demo**：開啟 [HCFD ISO Platform Drill 部署網址](https://fc861117-sketch.github.io/HCFD_ISO_PLATFORM_DRILL/)。
2. **本地執行**：
   ```bash
   # Clone 本專案
   git clone https://github.com/fc861117-sketch/HCFD_ISO_PLATFORM_DRILL.git
   ```
   * **本機靜態預覽**：可直接雙擊打開 `index.html`（部分定位功能可能會受到瀏覽器安全限制限制）。
   * **Jekyll 本地伺服器預覽**：
     ```bash
     bundle exec jekyll serve
     ```

---

## ⚠️ 免責聲明 (Disclaimer)

本平台提供的氣候分析、GHS 化災處置距離、風險評估矩陣 (SPE/VTS) 等運算結果，均為基於既有消防理論與公開數據所設計之**決策輔助工具**。
災害現場形勢瞬息萬變，且存有局部微氣候與不可預期之環境干擾，**系統給出之建議絕不可完全取代現場指揮人員的專業判斷與各單位的標準作業程序 (SOP)**。依賴本系統資訊所作之任何決策，其風險由使用者自行承擔。

---

**© 2026 Developed & Maintained by fc861117-sketch.**
