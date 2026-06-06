/**
 * 新竹縣政府消防局 ISO 作業平台【演練專用】 - Google Apps Script 後端程式碼
 * 
 * 部署指引：
 * 1. 建立一個新的 Google 試算表或直接開啟 Google 雲端硬碟。
 * 2. 開啟 Google Apps Script (在雲端硬碟點擊「新增」->「更多」->「Google Apps Script」)。
 * 3. 清空裡面的內容，並將此 Code.gs 中的程式碼貼上。
 * 4. 點擊「部署」 -> 「新增部署」。
 * 5. 選取類型為「網頁應用程式」：
 *    - 說明：HCFD ISO PLATFORM DRILL API
 *    - 執行身分：我 (您的 Google 帳戶)
 *    - 誰可以存取：所有人 (Anyone) -> 這點非常重要，否則網頁端會因權限不足無法連線！
 * 6. 點擊「部署」，並授予必要的雲端硬碟權限。
 * 7. 複製產生的「網頁應用程式 URL」網址。
 * 8. 在本平台網頁側邊選單點擊「系統同步設定」，切換至 GAS 模式，並貼上此網址即可！
 */

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var result = {};
    
    // 獲取或建立主要的雲端硬碟儲存資料夾
    var mainFolder = getOrCreateFolder("HCFD_ISO_PLATFORM_DRILL_DATA");
    
    if (action === "getList") {
      var files = mainFolder.getFiles();
      var projectNames = [];
      while (files.hasNext()) {
        var file = files.next();
        var name = file.getName();
        if (name.endsWith(".json")) {
          // 去除 .json 後綴作為專案名稱
          projectNames.push(name.substring(0, name.length - 5));
        }
      }
      // 將專案名稱以反向排序 (最新建立的在前面)
      projectNames.reverse();
      
      return ContentService.createTextOutput(JSON.stringify(projectNames))
        .setMimeType(ContentService.MimeType.JSON);
        
    } else if (action === "createProject") {
      var projectName = payload.projectName;
      var creator = payload.creator;
      var fileName = projectName + ".json";
      
      // 檢查是否已存在同名專案
      var files = mainFolder.getFilesByName(fileName);
      if (files.hasNext()) {
        result = { error: "專案名稱已存在，請使用其他名稱" };
      } else {
        var initialData = {
          creator: creator,
          briefing: {},
          medic: []
        };
        mainFolder.createFile(fileName, JSON.stringify(initialData, null, 2), "application/json");
        result = { success: true };
      }
      
    } else if (action === "getProjectData") {
      var projectName = payload.projectName;
      var fileName = projectName + ".json";
      var files = mainFolder.getFilesByName(fileName);
      if (files.hasNext()) {
        var file = files.next();
        var content = file.getAs("application/json").getDataAsString();
        return ContentService.createTextOutput(content)
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        result = { error: "找不到該專案資料" };
      }
      
    } else if (action === "saveBriefing") {
      var projectName = payload.projectName;
      var fileName = projectName + ".json";
      var briefing = payload.briefing;
      var creator = payload.creator;
      
      var files = mainFolder.getFilesByName(fileName);
      var file;
      var data = { creator: creator, briefing: briefing, medic: [] };
      
      if (files.hasNext()) {
        file = files.next();
        var existingContent = file.getAs("application/json").getDataAsString();
        try {
          var existingData = JSON.parse(existingContent);
          data.medic = existingData.medic || [];
          if (!data.creator) data.creator = existingData.creator;
        } catch(err) {}
        file.setContent(JSON.stringify(data, null, 2));
      } else {
        mainFolder.createFile(fileName, JSON.stringify(data, null, 2), "application/json");
      }
      result = { success: true };
      
    } else if (action === "saveMedic") {
      var projectName = payload.projectName;
      var fileName = projectName + ".json";
      var medic = payload.medic;
      var creator = payload.creator;
      
      var files = mainFolder.getFilesByName(fileName);
      var file;
      var data = { creator: creator, briefing: {}, medic: medic };
      
      if (files.hasNext()) {
        file = files.next();
        var existingContent = file.getAs("application/json").getDataAsString();
        try {
          var existingData = JSON.parse(existingContent);
          data.briefing = existingData.briefing || {};
          if (!data.creator) data.creator = existingData.creator;
        } catch(err) {}
        file.setContent(JSON.stringify(data, null, 2));
      } else {
        mainFolder.createFile(fileName, JSON.stringify(data, null, 2), "application/json");
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
      
      // 設定共用權限為「任何知道連結的人皆可檢視」，確保圖片能順利於網頁載入
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      var fileId = file.getId();
      // 使用雲端硬碟的直接下載連結，相容於所有裝置的 <img> 標籤
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

function doGet(e) {
  return HtmlService.createHtmlOutput("<h3>新竹縣政府消防局 ISO 作業平台【演練專用】後端服務運行中</h3><p>請使用 POST 請求與本介面通訊。</p>");
}
