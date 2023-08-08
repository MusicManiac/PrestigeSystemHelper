"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
var configPath = "../config/config.json";
var savedDataPath = "../config/savedData.json";
var config = {};
// Check if JSON file exists
if (fs_1.default.existsSync(savedDataPath)) {
    try {
        var jsonData = fs_1.default.readFileSync(configPath, "utf-8");
        config = JSON.parse(jsonData);
        console.info("[Prestige System Helper] Read existing config JSON file", config);
    }
    catch (error) {
        console.error("[Prestige System Helper] Error reading config JSON file:", error);
    }
}
else {
    console.info("[Prestige System Helper] No existing config JSON file found.");
}
var saveFilePath = "../../../profiles/" + config.id + ".json";
var savedData = {};
// Check if JSON file exists
if (fs_1.default.existsSync(savedDataPath)) {
    try {
        var jsonData = fs_1.default.readFileSync(savedDataPath, "utf-8");
        savedData = JSON.parse(jsonData);
        console.info("[Prestige System Helper] Read existing JSON file", savedData);
    }
    catch (error) {
        console.error("[Prestige System Helper] Error reading JSON file:", error);
    }
}
else {
    console.info("[Prestige System Helper] No existing JSON file found. Creating a new one.");
    // Create the directory if it doesn't exist
    var directory = path_1.default.dirname(savedDataPath);
    if (!fs_1.default.existsSync(directory)) {
        fs_1.default.mkdirSync(directory, { recursive: true });
    }
}
var saveFile = {};
if (fs_1.default.existsSync(saveFilePath)) {
    try {
        var jsonData = fs_1.default.readFileSync(saveFilePath, "utf-8");
        saveFile = JSON.parse(jsonData);
        console.info("[Prestige System Helper] Read existing save file", saveFile);
    }
    catch (error) {
        console.error("[Prestige System Helper] Error reading save file:", error);
    }
}
else {
    console.info("[Prestige System Helper] No existing save file found. Make sure save file exists in directory " + saveFilePath);
}
var weaponMastery = saveFile.characters.pmc.Skills.Mastering;
var expIncrease = config.masteryExpIncrease;
var onlyInformWhenNoMasteryLoss = config.onlyShowWarningWhenNoMasteryLoss;
//masteryData.characters.pmc.Skills.Mastering;
var modifiedData = weaponMastery.map(function (weapon) {
    var _a, _b, _c, _d;
    var Id = weapon.Id, Progress = weapon.Progress;
    var timesPrestiged = ((_a = savedData.Mastering.find(function (item) { return item.Id === Id; })) === null || _a === void 0 ? void 0 : _a["Times Prestiged"]) || 0;
    var totalExpConsumed = ((_b = savedData.Mastering.find(function (item) { return item.Id === Id; })) === null || _b === void 0 ? void 0 : _b["Total Exp Consumed so far by Prestiging"]) || 0;
    var timesCanPrestige = ((_c = savedData.Mastering.find(function (item) { return item.Id === Id; })) === null || _c === void 0 ? void 0 : _c["Times Can Prestige"]) || 0;
    var partialExpSavedUp = ((_d = savedData.Mastering.find(function (item) { return item.Id === Id; })) === null || _d === void 0 ? void 0 : _d["Partial exp saved up"]) || 0;
    var exp = config.masteryExp[Id];
    var prestigeThreshold = Math.floor(exp * (1 + expIncrease * timesPrestiged) / 5) * 5;
    if (Progress > 0) {
        //partialExpSavedUp += Progress - exp;
        //masteryData.characters.pmc.Skills.Mastering.Id.Progress -= Progress - exp;
        var index = saveFile.characters.pmc.Skills.Mastering.findIndex(function (item) { return item.Id === Id; });
        if (index !== -1) {
            saveFile.characters.pmc.Skills.Mastering[index].Progress -= 1;
        }
        else {
            console.log("Id " + Id + " not found in the Mastering array");
        }
    }
    if (timesPrestiged == 0 && Progress >= prestigeThreshold) {
        console.log("[Prestige System Helper] You can do initial prestige of ".concat(Id, " without losing mastery bonus or consuming any exp, since it's your first prestige in this weapon!"));
    }
    else if (Progress + partialExpSavedUp - prestigeThreshold >= exp && onlyInformWhenNoMasteryLoss) {
        console.log("[Prestige System Helper] You can prestige ".concat(Id, " without losing mastery bonus! \n\tIt requires ").concat(prestigeThreshold, " exp to be consumed, you currently have ").concat(Progress, " exp (5100 is max) in weapon and ").concat(partialExpSavedUp, " exp set aside."));
    }
    else if (Progress + partialExpSavedUp >= prestigeThreshold && !onlyInformWhenNoMasteryLoss) {
        console.log("[Prestige System Helper] You can prestige ".concat(Id, "! \n\tIt requires ").concat(prestigeThreshold, " exp to be consumed, you currently have ").concat(Progress, " exp (5100 is max) in weapon and ").concat(partialExpSavedUp, " exp set aside. \n\tMastery 3 requires you to have at least ").concat(exp, " exp in weapon.\n\tYou can earn more exp and prestige later or you can move some exp by removing exp from mastery in your save file and increasing 'Partial exp consumed'"));
    }
    else if (Progress >= config.warningExpThreshold) {
        console.log("[Prestige System Helper] You have ".concat(Progress, " exp in ").concat(Id, " which is close to maxing out at 5100!\n\tYou probably want to move some exp by removing exp from mastery in your save file and increasing 'Partial exp consumed'"));
    }
    return {
        Id: Id,
        "Current exp": weapon.Progress,
        "Exp to consume with this prestige": prestigeThreshold,
        "Exp need to be left to have mastery 3": exp,
        "Partial exp saved up": partialExpSavedUp,
        "Times Can Prestige": timesCanPrestige,
        "Times Prestiged": timesPrestiged,
        "Total Exp Consumed so far by Prestiging": totalExpConsumed
    };
});
savedData.Mastering = modifiedData;
fs_1.default.readFile(saveFilePath, 'utf-8', function (err, data) {
    if (err) {
        console.error('Error reading JSON save file:', err);
        return;
    }
    try {
        // Parse the JSON data
        var jsonObject = JSON.parse(data);
        // Modify the specific array
        if (Array.isArray(jsonObject.characters.pmc.Skills.Mastering)) {
            // Update the array as needed
            jsonObject.characters.pmc.Skills.Mastering = saveFile.characters.pmc.Skills.Mastering;
            // Convert the modified object back to JSON
            var updatedJson = JSON.stringify(jsonObject, null, '\t');
            // Write the updated JSON back to the file
            fs_1.default.writeFile(saveFilePath, updatedJson, 'utf-8', function (err) {
                if (err) {
                    console.error('Error writing JSON save file:', err);
                    return;
                }
                console.log('Mastery array in save file updated successfully.');
            });
        }
        else {
            console.error('The specified field is not an array.');
        }
    }
    catch (parseError) {
        console.error('Error parsing save JSON:', parseError);
    }
});
// Write JSON file
try {
    var data = JSON.stringify(savedData, null, '\t');
    fs_1.default.writeFileSync(savedDataPath, data);
    console.error("[Prestige System Helper] Saved info in JSON");
}
catch (error) {
    console.error("[Prestige System Helper] Error writing JSON file:", error);
}
