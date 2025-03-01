// Import Modules
import { DeltaGreenActor } from "./actor/actor.js";
import { DeltaGreenActorSheet } from "./actor/actor-sheet.js";
import { DeltaGreenItem } from "./item/item.js";
import { DeltaGreenItemSheet } from "./item/item-sheet.js";
import { sendPercentileTestToChat, sendLethalityTestToChat, sendDamageRollToChat } from "./roll/roll.js";
import { registerSystemSettings } from "./settings.js"
import { preloadHandlebarsTemplates } from "./templates.js";

Hooks.once('init', async function() {

  game.deltagreen = {
    DeltaGreenActor,
    DeltaGreenItem,
    rollItemMacro,
    rollItemSkillCheckMacro,
    rollSkillMacro
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "@statistics.dex.value",
    decimals: 0
  };

  // Register System Settings
  registerSystemSettings();

  // Define custom Entity classes
  CONFIG.Actor.documentClass = DeltaGreenActor;
  CONFIG.Item.documentClass = DeltaGreenItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);
  Actors.registerSheet("deltagreen", DeltaGreenActorSheet, { makeDefault: true });
  Items.registerSheet("deltagreen", DeltaGreenItemSheet, { makeDefault: true });
  
  // Preload Handlebars Templates
  preloadHandlebarsTemplates();

  // Add Handlebars helpers
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    try {
      return str.toLowerCase();
    } catch (error) {
      return "";
    }
  });

  Handlebars.registerHelper('toUpperCase', function(str) {
    try {
      return str.toUpperCase();
    } catch (error) {
      return "";
    }
  });

  Handlebars.registerHelper('if_eq', function(a, b, opts) {
    if (a == b) {
        return opts.fn(this);
    } else {
        return opts.inverse(this);
    }
  });

  Handlebars.registerHelper('if_not_eq', function(a, b, opts) {
    if (a != b) { return opts.fn(this); }
    return opts.inverse(this);
  });

  Handlebars.registerHelper('if_gt', function(a, b, trueVal, falseVal) {
    if (a > b) {
        return trueVal;
    } else {
        return falseVal;
    }
  });

  Handlebars.registerHelper('cite_ahb', function(page) {
    return "See page " + str(page) + " of the Agent's Handbook.";
  });

  Handlebars.registerHelper('formatLethality', function(lethality) {
    if (lethality > 0) {
      return lethality.toString() + "%";
    }
    else {
      return "";
    }
  });


  // Is this used anywhere?
  Handlebars.registerHelper('getActorSkillProp', function(actorData, skillName, prop) {
    try{
      if(skillName != "" && prop != ""){
        let skills = actorData.data.skills;
        let skill = skills[skillName];
        let propVal = skill[prop];
        return propVal;
      }
      else{
        return "";
      }
    }
    catch(ex){
      console.log(ex);
      return "";
    }
    
  });

  Handlebars.registerHelper('getAvailableRollModes', function() {
    try {
      return CONFIG.Dice.rollModes;
    } catch (error) {
      console.log(error);
    }
  });

  Handlebars.registerHelper('getDefaultRollMode', function() {
    try {
      return game.settings.get("core", "rollMode");
    } catch (error) {
      console.log(error);
    }
  });

  Handlebars.registerHelper('calculateHandToHandCombatDamageFormulaBonus', function(strength) {
    try {
      let bonus = "";

      if(strength.value < 5){
        bonus = " - 2";
      }
      else if(strength.value < 9){
        bonus = " - 1";
      }
      else if(strength.value > 12 && strength < 17){
        bonus = " + 1";
      }
      else if(strength.value > 16){
        bonus = " + 2";
      }
      
      return bonus;

    } catch (error) {
      console.log(error);
    }
  });

  Handlebars.registerHelper('localizeWeaponSkill', function(skill) {
    let label = skill;

    try {
      
      if(skill === 'dex'){
        label = game.i18n.localize("DG.Attributes.dex");
      }
      else{
        label = game.i18n.localize("DG.Skills." + skill);
      }      
    } catch (error) {
      console.log(error);
    }

    return label;
  });

  Handlebars.registerHelper('hideSkillBasedOnProficiencyAndUserChoice', function(hideUntrainedSkills, proficiency) {
    let showValue = true;

    try {
      
      if(hideUntrainedSkills === false){
        showValue = true;
      }
      else{
        if(proficiency > 0){
          showValue = true;
        }
        else{
          showValue = false;
        }
      }      
    } catch (error) {
      console.log(error);
    }

    return showValue;

  });

  // looks at system setting for what font to use and returns the class that is then used in the handlebars template that 
  // generates the character sheet.
  Handlebars.registerHelper('getFontFamilySystemSettingClass', function() {
    let setting = game.settings.get("deltagreen", "characterSheetFont");
    
    if(setting === "TypeWriterCondensed"){
      return "typewriter-condensed-font";
    }
    else if(setting === "Martel"){
      return "martel-font";
    }
    else if(setting === "Signika"){
      return "signika-font";
    }
    else if(setting === "atwriter"){
      return "atwriter-font";
    }
    else if(setting === "SpecialElite"){
      return "special-elite-font";
    }
    else{
      return "martel-font";
    }
    
  });

  Handlebars.registerHelper('keepSanityPrivate', function() {

    let setting = false;

    try{
      setting = game.settings.get("deltagreen", "keepSanityPrivate");

      if(game.user.isGM){
        setting = false;
      }

    }
    catch(ex){
      setting = false;
    }

    return setting;
  });
});

Handlebars.registerHelper('playerHasGamemasterPrivileges', function(){
  return game.user.isGM;
});

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createDeltaGreenMacro(data, slot));
});

Hooks.on("ready", ()=> {
  
  let backgroundImageSetting = game.settings.get("deltagreen", "characterSheetBackgroundImageSetting");

  let customCss = "";

  let customStyle = document.createElement("style");
  customStyle.id = "dg-custom-css";

  if(backgroundImageSetting === "OldPaper1"){
    customCss += `div.deltagreen.sheet.actor section.window-content{
          background: url("systems/deltagreen/assets/img/old_paper.jpg") !important;
    }`;
  }
  else if(backgroundImageSetting === "IvoryPaper"){
    customCss += `div.deltagreen.sheet.actor section.window-content{
          background-size: 100% !important;
    }`;
  }

  customStyle.innerHTML = customCss;

  if(customCss != ""){
    document.querySelector("head").appendChild(customStyle);
  }
  
});

// Note - this event is fired on ALL connected clients...
Hooks.on('createActor', async function(actor, options, userId){
  try{
    
    // use this to trap on if this hook is firing for the same user that triggered the create
    // can put logic specific to a particular user session below
    if (userId != game.user.id) { return; };

    if(actor != null){

      if(actor.type === 'agent'){
        // update the default type skill of Art - Painting's labels to try to be localized
        // since I really backed myself into a corner on this with my implementation of it...
        console.log('createActor Hook');

        let artLabel = game.i18n.translations.DG?.TypeSkills?.Art ?? "Art";
        let paintingLabel = game.i18n.translations.DG?.TypeSkills?.Subskills?.Painting ?? "Painting";

        let updatedData = duplicate(actor.system);
        updatedData.typedSkills.tskill_01.group = artLabel;
        updatedData.typedSkills.tskill_01.label = paintingLabel;
        
        actor.update({"data": updatedData});
        
        // throw on an unarmed strike item for convenience
        actor.AddUnarmedAttackItemIfMissing();
      }
      else if(actor.type === 'unnatural'){
      
      }
      else if(actor.type === 'vehicle'){
        actor.AddBaseVehicleItemsIfMissing();
      }
      
    }
    
  }
  catch(ex){
    console.log(ex);
  }
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDeltaGreenMacro(data, slot) {
  if (data.type !== "weapon") return;
  //if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.system;

  // Create the macro command
  let command = '// Uncomment line below to also roll skill check if desired.'
  command += '\n' + `//game.deltagreen.rollItemSkillCheckMacro("${data._id}");`;
  command += '\n' + `game.deltagreen.rollItemMacro("${data._id}");`;

  //let macro = game.macros.entities.find(m => (m.name === data.name) && (m.command === command));
  //if (!macro) {
  let macro = await Macro.create({
      name: data.name,
      type: "script",
      img: data.img,
      command: command,
      flags: { "deltagreen.itemMacro": true }
    });
  //}

  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
async function rollItemMacro(itemId) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  
  if(!actor) return ui.notifications.warn('Must have an Actor selected first.');

  let item = actor ? actor.items.find(i => i._id === itemId) : null;

  // for backwards compatibility with older macros, where I unwisely set it to use name instead of id
  if(!item){
    item = actor ? actor.items.find(i => i.name === itemId) : null;
  } 

  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemId}`);

  // Trigger the item roll
  let r = await item.roll();

  return r;
}

function rollItemSkillCheckMacro(itemId) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);

  if(!actor) return ui.notifications.warn('Must have an Actor selected first.');

  let item = actor ? actor.items.find(i => i._id === itemId) : null;

  // for backwards compatibility with older macros, where I unwisely set it to use name instead of id
  if(!item){
    item = actor ? actor.items.find(i => i.name === itemId) : null;
  } 

  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item '${itemName}'`);

  let skillName = item.system.skill.toString();

  let skill = actor.system.skills[skillName];
  let translatedSkillLabel = "";

  try{
    translatedSkillLabel = game.i18n.localize("DG.Skills." + skillName)
  }
  catch{
    translatedSkillLabel = skillName;
  }

  sendPercentileTestToChat(actor, translatedSkillLabel, skill.proficiency);
}

function rollSkillMacro(skillName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  
  if(!actor) return ui.notifications.warn('Must have an Actor selected first.');

  let skill = actor.system.skills[skillName];

  if(!skill) return ui.notifications.warn('Bad skill name passed to macro.');

  let translatedSkillLabel = "";

  try{
    translatedSkillLabel = game.i18n.localize("DG.Skills." + skillName)
  }
  catch{
    translatedSkillLabel = skillName;
  }

  sendPercentileTestToChat(actor, translatedSkillLabel, skill.proficiency);
}