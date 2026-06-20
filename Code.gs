/**
 * 新竹縣政府消防局 ISO 作業平台【演練專用】 - Google Apps Script 後端程式碼 (Google Sheet 版本)
 * 
 * 部署指引：
 * 1. 建立一個新的 Google 試算表或直接開啟 Google 雲端硬碟。
 * 2. 開啟 Google Apps Script (在雲端硬碟點擊「新增」->「更多」->「Google Apps Script」)。
 * 3. 清空裡面的內容，並將此 Code.gs 中的程式碼貼上。
 * 4. 點擊「部署」 -> 「新增部署」。
 * 5. 選取類型為「網頁應用程式」：
 *    - 說明：HCFD ISO PLATFORM DRILL API (Sheet DB)
 *    - 執行身分：我 (您的 Google 帳戶)
 *    - 誰可以存取：所有人 (Anyone) -> 這點非常重要，否則網頁端會因權限不足無法連線！
 * 6. 點擊「部署」，並授予必要的雲端硬碟與試算表權限。
 * 7. 複製產生的「網頁應用程式 URL」網址。
 * 8. 在本平台網頁側邊選單點擊「系統同步設定」，切換至 GAS 模式，並貼上此網址即可！
 */

function getOrCreateDbSheet() {
  var fileName = "HCFD_ISO_DRILL_DB";
  var files = DriveApp.getFilesByName(fileName);
  var ss;
  
  if (files.hasNext()) {
    var file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
       ss = SpreadsheetApp.open(file);
       return ss.getSheets()[0];
    }
  }
  
  // 建立新的 Spreadsheet 作為資料庫
  ss = SpreadsheetApp.create(fileName);
  var sheet = ss.getSheets()[0];
  sheet.appendRow(["ProjectName", "Creator", "Briefing_JSON", "Medic_JSON", "LastUpdated"]);
  sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#d32f2f").setFontColor("white");
  return sheet;
}

function getProjectRow(sheet, projectName) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === projectName) {
      return i + 1; // 1-based index for Google Sheet
    }
  }
  return -1;
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function getOrCreateSubFolder(parentFolder, subFolderName) {
  var folders = parentFolder.getFoldersByName(subFolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subFolderName);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var result = {};
    
    var sheet = getOrCreateDbSheet();
    var mainFolder = getOrCreateFolder("HCFD_ISO_PLATFORM_DRILL_DATA"); // 用於儲存照片
    
    if (action === "getList") {
      var data = sheet.getDataRange().getValues();
      var projectNames = [];
      for (var i = 1; i < data.length; i++) {
        var name = data[i][0];
        if (name) projectNames.push(name);
      }
      projectNames.reverse(); // 最新建立的在前面 (若依時間順序附加)
      return ContentService.createTextOutput(JSON.stringify(projectNames))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "createProject") {
      var projectName = payload.projectName;
      var creator = payload.creator;
      
      if (getProjectRow(sheet, projectName) !== -1) {
        result = { error: "專案名稱已存在，請使用其他名稱" };
      } else {
        sheet.appendRow([projectName, creator, "{}", "[]", new Date()]);
        result = { success: true };
      }
      
    } else if (action === "getProjectData") {
      var projectName = payload.projectName;
      var rowIdx = getProjectRow(sheet, projectName);
      
      if (rowIdx !== -1) {
        var rowData = sheet.getRange(rowIdx, 1, 1, 5).getValues()[0];
        var dataObj = {
          creator: rowData[1],
          briefing: JSON.parse(rowData[2] || "{}"),
          medic: JSON.parse(rowData[3] || "[]")
        };
        return ContentService.createTextOutput(JSON.stringify(dataObj))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        result = { error: "找不到該專案資料" };
      }
      
    } else if (action === "saveBriefing") {
      var projectName = payload.projectName;
      var rowIdx = getProjectRow(sheet, projectName);
      var briefingStr = JSON.stringify(payload.briefing);
      
      if (rowIdx !== -1) {
        sheet.getRange(rowIdx, 3).setValue(briefingStr);
        sheet.getRange(rowIdx, 5).setValue(new Date());
        if (payload.creator) sheet.getRange(rowIdx, 2).setValue(payload.creator);
      } else {
        sheet.appendRow([projectName, payload.creator, briefingStr, "[]", new Date()]);
      }
      result = { success: true };
      
    } else if (action === "saveMedic") {
      var projectName = payload.projectName;
      var rowIdx = getProjectRow(sheet, projectName);
      var medicStr = JSON.stringify(payload.medic);
      
      if (rowIdx !== -1) {
        sheet.getRange(rowIdx, 4).setValue(medicStr);
        sheet.getRange(rowIdx, 5).setValue(new Date());
        if (payload.creator) sheet.getRange(rowIdx, 2).setValue(payload.creator);
      } else {
        sheet.appendRow([projectName, payload.creator, "{}", medicStr, new Date()]);
      }
      result = { success: true };
      
    } else if (action === "uploadPhoto") {
      var filename = payload.filename;
      var mimeType = payload.mimeType;
      var base64Data = payload.base64;
      
      var photosFolder = getOrCreateSubFolder(mainFolder, "photos");
      var decodedBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decodedBytes, mimeType, filename);
      var file = photosFolder.createFile(blob);
      
      // 設定共用權限為「任何知道連結的人皆可檢視」
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var fileId = file.getId();
      var url = "https://drive.google.com/uc?export=download&id=" + fileId;
      var formula = '=IMAGE("' + url + '")';
      
      result = {
        url: url,
        fileId: fileId,
        formula: formula
      };
      
    } else {
      result = { error: "不支援的行動 (Action)" };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return HtmlService.createHtmlOutput("<h3>新竹縣政府消防局 ISO 作業平台【演練專用】Google Sheet 後端服務運行中</h3><p>請使用 POST 請求與本介面通訊。</p>");
}
