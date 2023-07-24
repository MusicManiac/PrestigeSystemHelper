import { DependencyContainer } from "tsyringe";
import { Ilogger } from "@spt-aki/models/spt/utils/Ilogger";
import { IPostAkiLoadMod } from "@spt-aki/models/external/IPostAkiLoadMod";
import fs from "fs";
import path from "path";

class PrestigeSystemHelper implements IPostAkiLoadMod {
	private config = require("../config/config.json");

	public postAkiLoad(container: DependencyContainer): void {
		const logger = container.resolve<Ilogger>("WinstonLogger");
		let uniquePrestiges = 0, normalPrestiges = 0;

		const savedDataPath = path.resolve(__dirname, "../config/savedData.json");
		let savedData: any = {};
		// Check if JSON file exists
		if (fs.existsSync(savedDataPath)) {
			try {
				const jsonData = fs.readFileSync(savedDataPath, "utf-8");
				savedData = JSON.parse(jsonData);
				logger.info("[Prestige System Helper] Read existing JSON file", savedData);
			} catch (error) {
				logger.error("[Prestige System Helper] Error reading JSON file:", error);
			}
		} else {
			logger.info("[Prestige System Helper] No existing JSON file found. Creating a new one.");
			// Create the directory if it doesn't exist
			const directory = path.dirname(savedDataPath);
			if (!fs.existsSync(directory)) {
				fs.mkdirSync(directory, { recursive: true });
			}
		}

		const profileHelper = container.resolve("ProfileHelper");
		const pmcProfile = profileHelper.getFullProfile(this.config.id).characters.pmc;
		const weaponMastery = pmcProfile.Skills.Mastering;
		const expIncrease = this.config.masteryExpIncrease;

		const modifiedData = weaponMastery.map((weapon) => {
			const { Id, Progress } = weapon;
			const manuallyPrestiged = savedData.Mastering.find((item: any) => item.Id === Id)?.["Manually Prestiged"] || 0;
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
			fs.writeFileSync(savedDataPath, data);
			logger.error("[Prestige System Helper] Saved info in JSON");
		} catch (error) {
			logger.error("[Prestige System Helper] Error writing JSON file:", error);
		}
	}
}

module.exports = { mod: new PrestigeSystemHelper() };
