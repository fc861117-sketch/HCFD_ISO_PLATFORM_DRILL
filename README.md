# HCFD ISO Platform Drill

[![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-success.svg)](https://fc861117-sketch.github.io/HCFD_ISO_PLATFORM_DRILL/)
[![HTML5](https://img.shields.io/badge/Tech-HTML5-orange.svg)]()
[![Jekyll](https://img.shields.io/badge/Jekyll-Page%20Builder-blue.svg)]()

HCFD ISO Platform Drill 是供消防現場安全官（ISO）演練與測試使用的靜態網站平台。網站整合現場簡報表、MEDIC 紀錄、HAZMAT 查詢、ISO Guide、NOAA 環境監控與風險決策模型，用於驗證現場資訊輸入、同步、查核與輔助決策流程。

Live Demo: [HCFD ISO Platform Drill](https://fc861117-sketch.github.io/HCFD_ISO_PLATFORM_DRILL/)

---

## 主要功能

1. **現場簡報表**
   - 建立演練專案。
   - 填寫 ISO、IC、建築用途、構造、面積、樓層、救援、安全簡報與四面偵查資訊。
   - 支援「坪 / 平方公尺」自動換算。
   - 支援手動同步簡報表至雲端。

2. **MEDIC 紀錄**
   - 新增、結案、刪除與同步 MEDIC 事件。
   - 支援防誤觸確認流程。
   - 結案專案會鎖定欄位，避免後續誤改。

3. **HAZMAT**
   - 危害物質搜尋。
   - 支援 UN 編號與資料 tab 切換。
   - 提供 GHS 與危害資訊查閱。

4. **ISO Guide**
   - 提供 ISO 現場作業指引。
   - 支援 tab 切換與 checklist 勾選。
   - checklist checkbox 皆使用唯一 id，確保狀態保存與自動測試穩定。

5. **環境氣候監控及 NOAA**
   - 提供熱指數與 PPE 影響輔助判讀。
   - 支援 range control 測試。

6. **風險決策模型**
   - SPE 風險模型。
   - VTS 決策模型。
   - 5x5 風險矩陣。

---

## 自動測試覆蓋範圍

網站選單內建 UI 自動測試功能，主要測試首頁完整操作流程與子頁 smoke tests。

### 首頁流程

- 路由與首頁載入。
- 建立專案防誤觸流程。
- 雙擊確認建立測試專案。
- 簡報表 31 個可輸入或選取欄位。
- 單層面積「坪 / 平方公尺」自動換算。
- 簡報表手動同步 payload 驗證。
- MEDIC 新增防誤觸流程。
- MEDIC 新增、同步、結案與刪除。
- 專案結案後欄位鎖定。

### 子頁 smoke tests

- ISO Guide tab/checklist。
- 風險決策模型 range、SPE、VTS、5x5 矩陣。
- NOAA range 與 PPE 影響計算。
- HAZMAT 搜尋與 tab 切換。

---

## 測試 4：簡報欄位自動換算與雲端同步

測試 4 會執行下列驗證：

1. 確認操作人員欄位 `modifierName` 已有測試操作者。
2. 填寫簡報表欄位。
3. 將單層面積輸入為 `100` 坪。
4. 觸發自動換算，確認結果約為 `330.58` 平方公尺。
5. 確認本機專案資料已保存換算後的 `b_area` 與 `b_area_unit = m2`。
6. 在 mock API 模式下，確認雲端同步 payload 也包含正確換算結果。

已修正重點：

- 建立新專案後，建立者會同步寫入 `modifierName` 與 `localStorage.isoUserName`。
- 測試 4 若偵測到 `modifierName` 被瀏覽器或舊狀態清空，會先補入「安全官自動測試」再驗證。
- 同步測試不再只固定等待 1 秒，而是等待 `syncBriefingToCloud()` 或 mock API 呼叫完成。

---

## 本機使用

```bash
git clone https://github.com/fc861117-sketch/HCFD_ISO_PLATFORM_DRILL.git
cd HCFD_ISO_PLATFORM_DRILL
```

可直接開啟 `index.html`，或使用本機 HTTP server：

```bash
python -m http.server 8138 --bind 127.0.0.1
```

開啟：

```text
http://127.0.0.1:8138/
```

---

## GitHub Pages

本專案部署於 GitHub Pages：

```text
https://fc861117-sketch.github.io/HCFD_ISO_PLATFORM_DRILL/
```

Jekyll 設定需保留正確的 baseurl：

```yaml
baseurl: "/HCFD_ISO_PLATFORM_DRILL"
```

---

## 測試注意事項

- UI 自動測試預設使用 mock API 模式，避免測試資料寫入 GitHub 或雲端。
- 若取消 mock API 模式，測試會連線至實際同步端點，請確認 token 與權限設定正確。
- 測試專案名稱固定為 `1150606_UI_DrillTest`。
- 若使用 Codex in-app browser 測試，Windows 環境可能需要重啟 Codex app 才會套用 `node_repl` 設定。

---

## 免責聲明

本平台供消防演練、教育訓練與測試驗證使用。現場決策仍應依主管機關規範、消防局 SOP、現場指揮體系、即時情資與安全官專業判斷執行。

---

2026 Developed & Maintained by fc861117-sketch.
