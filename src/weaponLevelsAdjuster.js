"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class weaponLevelsAdjuster {
    config = require("../config/weaponLevelsAdjusterConfig.json");
    savedData = require("../config/savedData.json");
    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const db = container.resolve("DatabaseServer");
        const tables = db.getTables();
        const serverMasteringTables = tables.globals.config.Mastering;
        const configMasteringTables = this.config.WeaponsExpLevels;
        logger.info(`[Prestige System/WeaponLevelsAdjuster] this.config.debug ${this.config.debug}`);
        for (const weaponConfig of configMasteringTables) {
            const weaponName = weaponConfig.Name;
            const serverWeapon = serverMasteringTables.find((serverWeapon) => serverWeapon.Name === weaponName);
            if (serverWeapon) {
                // Check if the weapon is prestiged in savedData
                const prestigedWeapon = this.savedData.Mastering.find((item) => item.Id === weaponName);
                if (prestigedWeapon && prestigedWeapon["Times Prestiged"] >= 1 && this.config.overrideExpForPrestigedWeapons) {
                    // Set Level2 and Level3 to prestiged values
                    serverWeapon.Level2 = this.config.prestigedWeaponsLvl2Exp;
                    serverWeapon.Level3 = this.config.prestigedWeaponsLvl3Exp;
                    if (this.config.debug) {
                        logger.info(`[Prestige System/WeaponLevelsAdjuster] Updated weapon with name ${weaponName} to prestiged level values`);
                    }
                }
                else if (this.config.overrideDefaultExp) {
                    // Update Level2 and Level3 if overrideDefaultExp is false
                    serverWeapon.Level2 = weaponConfig.Level2;
                    serverWeapon.Level3 = weaponConfig.Level3;
                    if (this.config.debug) {
                        logger.info(`[Prestige System/WeaponLevelsAdjuster] Updated weapon with name ${weaponName} to overridden level values`);
                    }
                }
            }
            else {
                if (this.config.debug) {
                    logger.info(`[Prestige System/WeaponLevelsAdjuster] Weapon with name ${weaponName} not found in serverMasteringTables`);
                }
            }
        }
    }
}
module.exports = { mod: new weaponLevelsAdjuster() };
//# sourceMappingURL=weaponLevelsAdjuster.js.map