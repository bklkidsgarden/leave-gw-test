# leave-gw-test

請假系統新架構的**測試環境**外殼頁。正式系統不在這裡。

這頁只是一個靜態外殼：把請求用端對端加密包好，交給 Google Apps Script 轉送到主機。
頁面裡只有主機的公鑰與 Apps Script 網址，沒有任何秘密或資料。

`index.html` 由 `shell/build.py` 自動產生，請勿手動修改。
