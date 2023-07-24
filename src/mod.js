"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class PrestigeSystemHelper {
    constructor() {
        this.config = require("../config/config.json");
    }
    postAkiLoad(container) {
        const logger = container.resolve("WinstonLogger");
        let uniquePrestiges = 0, normalPrestiges = 0;
        const savedDataPath = path_1.default.resolve(__dirname, "../config/savedData.json");
        let savedData = {};
        // Check if JSON file exists
        if (fs_1.default.existsSync(savedDataPath)) {
            try {
                const jsonData = fs_1.default.readFileSync(savedDataPath, "utf-8");
                savedData = JSON.parse(jsonData);
                logger.info("[Prestige System Helper] Read existing JSON file", savedData);
            }
            catch (error) {
                logger.error("[Prestige System Helper] Error reading JSON file:", error);
            }
        }
        else {
            logger.info("[Prestige System Helper] No existing JSON file found. Creating a new one.");
            // Create the directory if it doesn't exist
            const directory = path_1.default.dirname(savedDataPath);
            if (!fs_1.default.existsSync(directory)) {
                fs_1.default.mkdirSync(directory, { recursive: true });
            }
        }
        const profileHelper = container.resolve("ProfileHelper");
        const pmcProfile = profileHelper.getFullProfile(this.config.id).characters.pmc;
        const weaponMastery = pmcProfile.Skills.Mastering;
        const expIncrease = this.config.masteryExpIncrease;
        const modifiedData = weaponMastery.map((weapon) => {
            const { Id, Progress } = weapon;
            const manuallyPrestiged = savedData.Mastering.find((item) => item.Id === Id)?.["Manually Prestiged"] || 0;
            let canBePrestiged = 0, exp = this.config.masteryExp[Id], leftovers = 0;
            for (; exp <= Progress; exp += this.config.masteryExp[Id] * (1 + expIncrease * canBePrestiged)) {
                canBePrestiged++;
            }
            leftovers = Progress / (exp + this.config.masteryExp[Id] * (1 + expIncrease * canBePrestiged));
            if (Math.floor(canBePrestiged) > manuallyPrestiged) {
                logger.success(`[Prestige System Helper] You can prestige ${Id}!`);
            }
            if (false && canBePrestiged >= 1) {
                uniquePrestiges++;
                if (canBePrestiged >= 2) {
                    normalPrestiges += canBePrestiged - 1;
                }
            }
            return {
                Id,
                "Qualified for prestige": canBePrestiged,
                "Percentage to next prestige": (leftovers * 100).toFixed(1),
                "Manually Prestiged": manuallyPrestiged,
            };
        });
        savedData.Mastering = modifiedData;
        // Write JSON file
        try {
            const data = JSON.stringify(savedData, null, 2);
            fs_1.default.writeFileSync(savedDataPath, data);
            logger.error("[Prestige System Helper] Saved info in JSON");
        }
        catch (error) {
            logger.error("[Prestige System Helper] Error writing JSON file:", error);
        }
    }
}
module.exports = { mod: new PrestigeSystemHelper() };
