import fs from "fs";
import path from "path";

const configPath = "./config/config.json";
const savedDataPath = "./config/savedData.json";
const weaponLevelsAdjusterConfigPath = "./config/weaponLevelsAdjusterConfig.json";
const globalsDataPath = "../../../Aki_Data/Server/database/globals.json";

let config: any = {};
// Check if JSON file exists
if (fs.existsSync(configPath)) {
	try {
		const jsonData = fs.readFileSync(configPath, "utf-8");
		config = JSON.parse(jsonData);
		console.info("[Info] Read existing mod config JSON file");
	} catch (error) {
		console.error("[Info] Error reading mod config JSON file:", error);
	}
} else {
	console.info("[Info] No existing mod config JSON file found.");
}

let weaponLevelsAdjusterConfig: any = {};
// Check if JSON file exists
if (fs.existsSync(savedDataPath)) {
	try {
		const jsonData = fs.readFileSync(weaponLevelsAdjusterConfigPath, "utf-8");
		weaponLevelsAdjusterConfig = JSON.parse(jsonData);
		console.info("[Info] Read existing weaponLevelsAdjusterConfig JSON file");
	} catch (error) {
		console.error("[Info] Error reading weaponLevelsAdjusterConfig JSON file:", error);
	}
} else {
	console.info("[Info] No existing weaponLevelsAdjusterConfig JSON file found.");
}

const saveFilePath = "../../profiles/" + config.id + ".json"

let savedData: any = {};
// Check if JSON file exists
if (fs.existsSync(savedDataPath)) {
	try {
		const jsonData = fs.readFileSync(savedDataPath, "utf-8");
		savedData = JSON.parse(jsonData);
		console.info("[Info] Read existing mod saved data JSON file");
	} catch (error) {
		console.error("[Info] Error reading mod saved data JSON file:", error);
	}
} else {
	console.info("[Info] No existing mod saved data JSON file found. Creating a new one.");
	// Create the directory if it doesn't exist
	const directory = path.dirname(savedDataPath);
	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}
}

let globalsDatabase: any = {};
// Check if JSON file exists
if (fs.existsSync(globalsDataPath)) {
	try {
		const jsonData = fs.readFileSync(globalsDataPath, "utf-8");
		globalsDatabase = JSON.parse(jsonData);
		console.info("[Info] Read existing globals database JSON file");
	} catch (error) {
		console.error("[Info] Error reading globals database JSON file:", error);
	}
} else {
	console.info("[Info] No existing globals database JSON file found at " + globalsDataPath);
}

let masteryExpTable: any = {};
globalsDatabase.config.Mastering.forEach((item: { Name: string; Level2: any; Level3: any; }) => {
    if (item.Name && item.Level2 && item.Level3) {
        if (weaponLevelsAdjusterConfig.overrideDefaultExp) {
            // Find the adjusted item in weaponLevelsAdjusterConfig by matching the Name
            const adjustedItem = weaponLevelsAdjusterConfig.WeaponsExpLevels.find((adjustedWeapon: any) => adjustedWeapon.Name === item.Name);
            if (adjustedItem) {
				masteryExpTable[item.Name] = adjustedItem.Level2 + adjustedItem.Level3;
				//console.log(`[Info] masteryExpTable[${item.Name}] = ${masteryExpTable[item.Name]}`);
            } else {
                console.error(`[Info] No adjustment found for item: ${item.Name}`);
            }
		} else {
			masteryExpTable[item.Name] = item.Level2 + item.Level3;
			//console.log(`[Info] masteryExpTable[${item.Name}] = ${masteryExpTable[item.Name]}`);
        }
	} else {
        console.error(`[Info] Missing required fields for item: ${JSON.stringify(item)}`);
    }
});
console.info("[Info] Mastery table populated");

let saveFile: any = {};
if (fs.existsSync(saveFilePath)) {
	try {
		const jsonData = fs.readFileSync(saveFilePath, "utf-8");
		saveFile = JSON.parse(jsonData);
		console.info("[Info] Read existing save file");
	} catch (error) {
		console.error("[Info] Error reading save file:", error);
	}
} else {
	console.info("[Info] No existing save file found. Make sure save file exists in directory " + saveFilePath);
}

const weaponMastery = saveFile.characters.pmc.Skills.Mastering;
const expIncrease = config.masteryExpIncrease;

const modifiedData = weaponMastery.map((weapon: { Id?: any; Progress: any;}) => {
	const { Id, Progress } = weapon;
	const timesPrestiged = savedData.Mastering.find((item: any) => item.Id === Id)?.["Times Prestiged"] || 0;
	let totalExpConsumed = savedData.Mastering.find((item: any) => item.Id === Id)?.["Total Exp Consumed so far by Prestiging"] || 0;
	let timesCanPrestige = savedData.Mastering.find((item: any) => item.Id === Id)?.["Times Can Prestige"] || 0;
	let partialExpSavedUp = savedData.Mastering.find((item: any) => item.Id === Id)?.["Partial exp saved up"] || 0;
	let masteryLevelThreeExpThreshold = masteryExpTable[Id];
	let offsetMasteryLevelThreeExpThreshold = weaponLevelsAdjusterConfig.prestigedWeaponsLvl2Exp + weaponLevelsAdjusterConfig.prestigedWeaponsLvl3Exp;
	
	// expOverflow is how much exp we got above mastery lvl3, if we adjust it, use adjusted value, otherwise use vanilla value in masteryLevelThreeExpThreshold
	let expOverflow;
	if (timesPrestiged > 0 && weaponLevelsAdjusterConfig.overrideExpForPrestigedWeapons) {
		expOverflow = Progress - offsetMasteryLevelThreeExpThreshold;
	} else {
		expOverflow = Progress - masteryLevelThreeExpThreshold;
	}

	// prestigeThreshold is how much exp we have to gain to be able to prestige the weapon 
	let prestigeThreshold = 0;
	if (config.expIncreaseIsLinear) {
		prestigeThreshold = Math.floor(masteryLevelThreeExpThreshold * (1 + expIncrease * timesPrestiged));
	} else {
		prestigeThreshold = Math.floor(masteryLevelThreeExpThreshold * Math.pow(1 + expIncrease, timesCanPrestige));
	}

	// store excess exp
	if (Progress > masteryLevelThreeExpThreshold || (timesPrestiged > 0 && weaponLevelsAdjusterConfig.overrideExpForPrestigedWeapons && Progress > offsetMasteryLevelThreeExpThreshold)) {
		partialExpSavedUp += expOverflow;
		const index = saveFile.characters.pmc.Skills.Mastering.findIndex((item: { Id?: any; Progress: any; }) => item.Id === Id);
		if (index !== -1) {
			saveFile.characters.pmc.Skills.Mastering[index].Progress -= expOverflow;
		} else {
			console.log("[Info] Id " + Id + " not found in the Mastering array");
		}
		console.log(`[Prestige] Moved ${expOverflow} exp from ${Id} to your exp buffer for it, you have now ${partialExpSavedUp}/${prestigeThreshold} exp saved up`);
	}

	if (timesPrestiged == 0 && Progress >= prestigeThreshold && timesCanPrestige == timesPrestiged) {
		console.log(`[Prestige] You can do initial prestige of ${Id} without losing mastery bonus or consuming any exp, since it's your first prestige in this weapon!`);
		timesCanPrestige++;
	} else if (partialExpSavedUp >= prestigeThreshold && timesCanPrestige == timesPrestiged) {
		timesCanPrestige++;
		partialExpSavedUp -= prestigeThreshold;
		totalExpConsumed += prestigeThreshold;
		console.log(`[Prestige] You can prestige ${Id}! \n\tIt requires ${prestigeThreshold} exp to be consumed (which it just did), you currently have ${partialExpSavedUp} exp set aside left.\n\tNeeded exp has already been consumed from your overflow exp buffer\n\tAll you gotta do now is prestige your weapon (whatever it means to you) and in savedData.json increase 'Times Prestiged' counter by 1`);
	} else if (timesCanPrestige > timesPrestiged) {
		console.log(`[Prestige] You forgot to prestige ${Id} last time you were doing this!`);
	}

	if (timesPrestiged > 0 && weaponLevelsAdjusterConfig.overrideExpForPrestigedWeapons) {
		masteryLevelThreeExpThreshold = offsetMasteryLevelThreeExpThreshold;
	}

	return {
		Id,
		"Current exp" : weapon.Progress,
		"Exp to consume with this prestige": prestigeThreshold,
		"Exp need to be left to have mastery 3": masteryLevelThreeExpThreshold,
		"Partial exp saved up": partialExpSavedUp,
		"Times Can Prestige" : timesCanPrestige,
		"Times Prestiged": timesPrestiged,
		"Total Exp Consumed so far by Prestiging": totalExpConsumed
	};
});

savedData.Mastering = modifiedData;

fs.readFile(saveFilePath, 'utf-8', (err, data) => {
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
			fs.writeFile(saveFilePath, updatedJson, 'utf-8', (err) => {
				if (err) {
					console.error('[Info] Error writing JSON save file:', err);
					return;
				}
				console.log('[Info] Mastery array in save file updated successfully.');
			});
		} else {
			console.error('[Info] The specified field is not an array.');
		}
	} catch (parseError) {
		console.error('[Info] Error parsing save JSON:', parseError);
	}
});

// Write JSON file
try {
	const data = JSON.stringify(savedData, null, '\t');
	fs.writeFileSync(savedDataPath, data);
	console.error("[Info] Saved info in JSON");
} catch (error) {
	console.error("[Info] Error writing JSON file:", error);
}

setTimeout(() => {
	console.log('[Info] You are free to close the window (press Enter or close manually) when not needed anymore.');
}, 1000);
process.stdin.resume();
process.stdin.on("data", process.exit.bind(process, 0));