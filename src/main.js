"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const configPath = "./config/config.json";
const savedDataPath = "./config/savedData.json";
const globalsDataPath = "../../../Aki_Data/Server/database/globals.json";
let config = {};
// Check if JSON file exists
if (fs_1.default.existsSync(savedDataPath)) {
    try {
        const jsonData = fs_1.default.readFileSync(configPath, "utf-8");
        config = JSON.parse(jsonData);
        console.info("[Info] Read existing mod config JSON file");
    }
    catch (error) {
        console.error("[Info] Error reading mod config JSON file:", error);
    }
}
else {
    console.info("[Info] No existing mod config JSON file found.");
}
const saveFilePath = "../../profiles/" + config.id + ".json";
let savedData = {};
// Check if JSON file exists
if (fs_1.default.existsSync(savedDataPath)) {
    try {
        const jsonData = fs_1.default.readFileSync(savedDataPath, "utf-8");
        savedData = JSON.parse(jsonData);
        console.info("[Info] Read existing mod saved data JSON file");
    }
    catch (error) {
        console.error("[Info] Error reading mod saved data JSON file:", error);
    }
}
else {
    console.info("[Info] No existing mod saved data JSON file found. Creating a new one.");
    // Create the directory if it doesn't exist
    const directory = path_1.default.dirname(savedDataPath);
    if (!fs_1.default.existsSync(directory)) {
        fs_1.default.mkdirSync(directory, { recursive: true });
    }
}
let globalsDatabase = {};
// Check if JSON file exists
if (fs_1.default.existsSync(globalsDataPath)) {
    try {
        const jsonData = fs_1.default.readFileSync(globalsDataPath, "utf-8");
        globalsDatabase = JSON.parse(jsonData);
        console.info("[Info] Read existing globals database JSON file");
    }
    catch (error) {
        console.error("[Info] Error reading globals database JSON file:", error);
    }
}
else {
    console.info("[Info] No existing globals database JSON file found at " + globalsDataPath);
}
let masteryExpTable = {};
globalsDatabase.config.Mastering.forEach((item) => {
    if (item.Name && item.Level2 && item.Level3) {
        masteryExpTable[item.Name] = item.Level2 + item.Level3;
    }
    else {
        console.error(`[Info] Missing required fields for item: ${JSON.stringify(item)}`);
    }
});
console.info("[Info] Mastery table populated");
Object.keys(config.masteryExpOverride).forEach((name) => {
    if (masteryExpTable[name] !== undefined) {
        masteryExpTable[name] = config.masteryExpOverride[name];
        console.info("[Info] Exp for item " + name + " was overwritten.");
    }
});
let saveFile = {};
if (fs_1.default.existsSync(saveFilePath)) {
    try {
        const jsonData = fs_1.default.readFileSync(saveFilePath, "utf-8");
        saveFile = JSON.parse(jsonData);
        console.info("[Info] Read existing save file");
    }
    catch (error) {
        console.error("[Info] Error reading save file:", error);
    }
}
else {
    console.info("[Info] No existing save file found. Make sure save file exists in directory " + saveFilePath);
}
const weaponMastery = saveFile.characters.pmc.Skills.Mastering;
const expIncrease = config.masteryExpIncrease;
const modifiedData = weaponMastery.map((weapon) => {
    const { Id, Progress } = weapon;
    const timesPrestiged = savedData.Mastering.find((item) => item.Id === Id)?.["Times Prestiged"] || 0;
    let totalExpConsumed = savedData.Mastering.find((item) => item.Id === Id)?.["Total Exp Consumed so far by Prestiging"] || 0;
    let timesCanPrestige = savedData.Mastering.find((item) => item.Id === Id)?.["Times Can Prestige"] || 0;
    let partialExpSavedUp = savedData.Mastering.find((item) => item.Id === Id)?.["Partial exp saved up"] || 0;
    let masteryLevelThreeExpThreshold = masteryExpTable[Id];
    const expOverflow = Progress - masteryLevelThreeExpThreshold;
    let prestigeThreshold = 0;
    if (config.expIncreaseIsLinear) {
        prestigeThreshold = Math.floor(masteryLevelThreeExpThreshold * (1 + expIncrease * timesPrestiged));
    }
    else {
        prestigeThreshold = Math.floor(masteryLevelThreeExpThreshold * Math.pow(1 + expIncrease, timesCanPrestige));
    }
    if (Progress > masteryLevelThreeExpThreshold) {
        partialExpSavedUp += expOverflow;
        const index = saveFile.characters.pmc.Skills.Mastering.findIndex((item) => item.Id === Id);
        if (index !== -1) {
            saveFile.characters.pmc.Skills.Mastering[index].Progress -= expOverflow;
        }
        else {
            console.log("[Info] Id " + Id + " not found in the Mastering array");
        }
        console.log(`[Prestige] Moved ${expOverflow} exp from ${Id} to your exp buffer for it, you have now ${partialExpSavedUp}/${prestigeThreshold} exp saved up`);
    }
    if (timesPrestiged == 0 && Progress >= prestigeThreshold && timesCanPrestige == timesPrestiged) {
        console.log(`[Prestige] You can do initial prestige of ${Id} without losing mastery bonus or consuming any exp, since it's your first prestige in this weapon!`);
        timesCanPrestige++;
    }
    else if (partialExpSavedUp >= prestigeThreshold && timesCanPrestige == timesPrestiged) {
        timesCanPrestige++;
        partialExpSavedUp -= prestigeThreshold;
        totalExpConsumed += prestigeThreshold;
        console.log(`[Prestige] You can prestige ${Id}! \n\tIt requires ${prestigeThreshold} exp to be consumed (which it just did), you currently have ${partialExpSavedUp} exp set aside left.\n\tNeeded exp has already been consumed from your overflow exp buffer\n\tAll you gotta do now is prestige your weapon (whatever it means to you) and in savedData.json increase 'Times Prestiged' counter by 1`);
    }
    else if (timesCanPrestige > timesPrestiged) {
        console.log(`[Prestige] You forgot to prestige ${Id} last time you were doing this!`);
    }
    return {
        Id,
        "Current exp": weapon.Progress,
        "Exp to consume with this prestige": prestigeThreshold,
        "Exp need to be left to have mastery 3": masteryLevelThreeExpThreshold,
        "Partial exp saved up": partialExpSavedUp,
        "Times Can Prestige": timesCanPrestige,
        "Times Prestiged": timesPrestiged,
        "Total Exp Consumed so far by Prestiging": totalExpConsumed
    };
});
savedData.Mastering = modifiedData;
fs_1.default.readFile(saveFilePath, 'utf-8', (err, data) => {
    if (err) {
        console.error('[Info] Error reading JSON save file:', err);
        return;
    }
    try {
        // Parse the JSON data
        const jsonObject = JSON.parse(data);
        // Modify the specific array
        if (Array.isArray(jsonObject.characters.pmc.Skills.Mastering)) {
            // Update the array as needed
            jsonObject.characters.pmc.Skills.Mastering = saveFile.characters.pmc.Skills.Mastering;
            // Convert the modified object back to JSON
            const updatedJson = JSON.stringify(jsonObject, null, '\t');
            // Write the updated JSON back to the file
            fs_1.default.writeFile(saveFilePath, updatedJson, 'utf-8', (err) => {
                if (err) {
                    console.error('[Info] Error writing JSON save file:', err);
                    return;
                }
                console.log('[Info] Mastery array in save file updated successfully.');
            });
        }
        else {
            console.error('[Info] The specified field is not an array.');
        }
    }
    catch (parseError) {
        console.error('[Info] Error parsing save JSON:', parseError);
    }
});
// Write JSON file
try {
    const data = JSON.stringify(savedData, null, '\t');
    fs_1.default.writeFileSync(savedDataPath, data);
    console.error("[Info] Saved info in JSON");
}
catch (error) {
    console.error("[Info] Error writing JSON file:", error);
}
setTimeout(() => {
    console.log('[Info] You are free to close the window (press Enter or close manually) when not needed anymore.');
}, 1000);
process.stdin.resume();
process.stdin.on("data", process.exit.bind(process, 0));
//# sourceMappingURL=main.js.map