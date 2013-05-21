Bitcoin.IPNSecret = "moEcxlV1bvVaXIqvAQ1NwF5ZtdMJeyrET5rRQtaWi32Qez3y82nEvEssDLw2Qq5";
Bitcoin.Settings = {
    "callbackURI": "http://someurl?secret=" + Bitcoin.IPNSecret,
    "minimumAddresses": 300,
    "maximumAddresses": 600,
    "maximumErrors": 10,
    "client": {
        "host": "localhost",
        "port": 8332,
        "username": "rpc_user",
        "password": "nZ8xuWPUOrWrta8EkxTqHke4hmF0RfpO5PFf01mEiKrJUld004613fGBuocgZjG"
    }
}
