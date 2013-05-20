Bitcoin.IPNSecret = "moEcxlV1bvVaXIqvAQ1NwF5ZtdMJeyrET5rRQtaWi32Qez3y82nEvEssDLw2Qq5";
Bitcoin.Settings = {
    "callbackURI": "http://someurl?secret=" + Bitcoin.IPNSecret,
    "minimumAddresses": 300,
    "maximumAddresses": 6000,
    "maximumErrors": 10
}
